/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

declare function setFetchFunc(fn: (resource: RequestInfo, init?: RequestInit) => Promise<Response>): void;

import * as assert from 'assert';
import zlib from "zlib";

import * as sinon from 'sinon';
import { diag } from '@opentelemetry/api';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { CompressionAlgorithm, OTLPExporterError } from "@opentelemetry/otlp-exporter-base";
import { IExportTraceServiceRequest } from "@opentelemetry/otlp-transformer";

import { OTLPTraceExporter } from '../../src/exporter-trace-otlp-fastly-backend';
import { OTLPExporterFastlyBackendConfigBase } from "../../src/otlp-exporter-fastly-base";
import { ensureExportTraceServiceRequestIsSet, ensureSpanIsCorrect, mockedReadableSpan } from "../traceHelpers";
import { newNopDiagLogger } from "../commonHelpers";
import { MockedResponse } from "../computeHelpers";

const address = 'localhost:1501';

describe('OTLPTraceExporter - Compute@Edge with json over Fastly backend', function() {
  let collectorExporter: OTLPTraceExporter;
  let collectorExporterConfig: OTLPExporterFastlyBackendConfigBase;
  let spans: ReadableSpan[];
  type FakeFetch = sinon.SinonSpy<[RequestInfo, RequestInit?], Promise<Response>>;
  let fakeFetch: FakeFetch;
  let fakeResponse: Response;

  describe('instance', function () {
    it('should warn about metadata when using json', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      collectorExporter = new OTLPTraceExporter({
        metadata: 'foo',
        url: address,
      } as any);
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'Metadata cannot be set when using http');
    });

    it('should use default URL if not given', function() {
      collectorExporter = new OTLPTraceExporter({
        backend: 'test-backend'
      });
      assert.strictEqual(collectorExporter.url, 'http://localhost:4318/v1/traces');
    });
  });

  describe('export', function () {
    beforeEach(function () {
      fakeResponse = {} as Response;
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);
      collectorExporterConfig = {
        headers: {
          foo: 'bar',
        },
        hostname: 'foo',
        url: 'http://foo.bar.com',
        backend: 'test-backend',
      };
      collectorExporter = new OTLPTraceExporter(collectorExporterConfig);
      spans = [];
      spans.push(Object.assign({}, mockedReadableSpan));
    });

    it('should call fetch with POST method to expected URL and backend', function (done) {
      collectorExporter.export(spans, () => {
      });

      setTimeout(() => {
        assert.strictEqual(fakeFetch.callCount, 1);
        const args = fakeFetch.args[0];
        const resource = args[0];
        const init = args[1];
        assert.strictEqual(resource, 'http://foo.bar.com');
        assert.strictEqual(init?.method, 'POST');
        assert.strictEqual(init?.backend, 'test-backend');
        done();
      });
    });

    it('should set custom headers', function (done) {
      collectorExporter.export(spans, () => {
      });

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1]!;
        const headers = init?.headers as {[p: string]: string};
        assert.strictEqual(headers?.['foo'], 'bar');
        done();
      });
    });

    it('should set cache override to \'pass\'.', function (done) {
      collectorExporter.export(spans, () => {
      });

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1]!;
        const cacheOverride = init.cacheOverride;
        assert.strictEqual(cacheOverride?.mode, 'pass');
        done();
      });
    });

    it('should be flagged as exempt from telemetry.', function (done) {
      collectorExporter.export(spans, () => {
      });

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1]!;
        assert.ok((init as any).excludeFromTelemetry);
        done();
      });
    });

    it('should not have Content-Encoding header', function (done) {
      collectorExporter.export(spans, () => {
      });

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1];
        const headers = init?.headers as { [p: string]: string };
        assert.strictEqual(headers?.['Content-Encoding'], undefined);
        done();
      });
    });

    it('should successfully send the spans', function (done) {

      collectorExporter.export(spans, () => {});

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1];
        const requestBody = init?.body as string;
        const json = JSON.parse(requestBody) as IExportTraceServiceRequest;
        // Note that in 0.29.x we will need to use scopeSpans instead of instrumentationLibrarySpans
        // At that time we may also be able to switch to @opentelemetry/otlp-transformer for these types rather
        // than getting them out of @opentelemetry/exporter-trace-otlp-http
        const span1 = json.resourceSpans?.[0].scopeSpans?.[0].spans?.[0];
        assert.ok(typeof span1 !== 'undefined', "span doesn't exist");
        ensureSpanIsCorrect(span1);
        ensureExportTraceServiceRequestIsSet(json);
        done();
      });

    });

    it('should log the successful message', function (done) {
      const diagLogger = newNopDiagLogger();
      const stubLoggerError = sinon.stub();
      diagLogger.error = stubLoggerError;
      diag.setLogger(diagLogger);

      fakeResponse = new MockedResponse('success', { status: 200 });
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);

      const responseSpy = sinon.spy();
      collectorExporter.export(spans, responseSpy);

      setTimeout(() => {
        assert.strictEqual(stubLoggerError.args.length, 0);
        assert.strictEqual(
          responseSpy.args[0][0].code,
          ExportResultCode.SUCCESS
        );
        done();
      });
    });

    it('should log the error message', function (done) {
      fakeResponse = new MockedResponse('failed', { status: 400 });
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);

      const responseSpy = sinon.spy();
      collectorExporter.export(spans, responseSpy);

      setTimeout(() => {
        const result = responseSpy.args[0][0] as ExportResult;
        assert.strictEqual(result.code, ExportResultCode.FAILED);
        const error = result.error as OTLPExporterError;
        assert.ok(error !== undefined);
        assert.strictEqual(error.code, 400);
        assert.strictEqual(error.data, 'failed');
        done();
      });
    });

  });

  describe('export - with compression', function () {
    beforeEach(function () {
      fakeResponse = {} as Response;
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);
      collectorExporterConfig = {
        headers: {
          foo: 'bar',
        },
        hostname: 'foo',
        url: 'http://foo.bar.com',
        backend: 'test-backend',
        compression: CompressionAlgorithm.GZIP,
      };
      collectorExporter = new OTLPTraceExporter(collectorExporterConfig);
      spans = [];
      spans.push(Object.assign({}, mockedReadableSpan));
    });

    it('should successfully send the spans', function (done) {

      collectorExporter.export(spans, () => {});

      setTimeout(() => {
        const args = fakeFetch.args[0];
        const init = args[1];
        const requestBody = init?.body as Buffer;
        const requestBodyUnzipped = zlib.gunzipSync(requestBody).toString();

        const json = JSON.parse(requestBodyUnzipped) as IExportTraceServiceRequest;
        const span1 = json.resourceSpans?.[0].scopeSpans?.[0].spans?.[0];
        assert.ok(typeof span1 !== 'undefined', "span doesn't exist");
        ensureSpanIsCorrect(span1);
        ensureExportTraceServiceRequestIsSet(json);

        const headers = init?.headers as {[p: string]: string};
        assert.strictEqual(headers?.['Content-Encoding'], 'gzip');

        done();
      });

    });

  });

  describe('OTLPTraceExporter - Fastly backend (getDefaultUrl)', function() {
    it('should default to localhost', function(done) {
      const collectorExporter = new OTLPTraceExporter({
        backend: 'test-backend',
      });
      setTimeout(() => {
        assert.strictEqual(
          collectorExporter['url'],
          'http://localhost:4318/v1/traces'
        );
        done();
      });
    });

    it('should keep the URL if included', function(done) {
      const url = 'http://foo.bar.com';
      const collectorExporter = new OTLPTraceExporter({
        url,
        backend: 'test-backend',
      });
      setTimeout(() => {
        assert.strictEqual(collectorExporter['url'], url);
        done();
      });
    });
  });
});
