/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';

import * as sinon from 'sinon';
import { diag } from "@opentelemetry/api";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";

import { OTLPTraceExporter } from '../../src/exporter-trace-otlp-fastly-logger';
import { OTLPExporterFastlyLoggerConfigBase } from "../../src/otlp-exporter-fastly-base";
import { ensureExportTraceServiceRequestIsSet, ensureSpanIsCorrect, mockedReadableSpan } from "../traceHelpers";
import { newNopDiagLogger } from "../commonHelpers";
import { fastlyMock, LoggerMock } from "../computeHelpers";

describe('OTLPTraceExporter - Compute@Edge with json over Fastly logger', function() {
  let collectorExporter: OTLPTraceExporter;
  let collectorExporterConfig: OTLPExporterFastlyLoggerConfigBase;
  let spans: ReadableSpan[];

  describe('instance', function () {
    it('should warn about metadata when using json', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      collectorExporter = new OTLPTraceExporter({
        metadata: 'foo',
        endpoint: 'test-logger',
      } as any);
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'Metadata cannot be set when using http');
    });

    it('should warn about url when using logger', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      collectorExporter = new OTLPTraceExporter({
        url: 'http://foo.bar.com',
        endpoint: 'test-logger',
      });
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'config.url is ignored when using named logger');
    });

    it('should warn about headers when using logger', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      collectorExporter = new OTLPTraceExporter({
        headers: {'foo': 'bar'},
        endpoint: 'test-logger',
      });
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'config.headers is ignored when using named logger');
    });
  });

  describe('export', function () {
    let logger: LoggerMock;
    beforeEach(function () {
      fastlyMock.mockLoggersRequireFetchEvent(false);
      logger = fastly.getLogger('test-logger') as LoggerMock;
      collectorExporterConfig = {
        attributes: {},
        endpoint: 'test-logger',
      };
      collectorExporter = new OTLPTraceExporter(collectorExporterConfig);
      spans = [];
      spans.push(Object.assign({}, mockedReadableSpan));
    });

    it('should call log', function (done) {
      collectorExporter.export(spans, () => {});
      setTimeout(() => {
        assert.ok(logger.called);
        done();
      });
    });

    it('should successfully send the spans', function (done) {
      collectorExporter.export(spans, () => {});

      setTimeout(() => {
        const logBody = logger.loggedContent!;
        const json = JSON.parse(logBody) as otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest;
        const span1 = json.resourceSpans?.[0].instrumentationLibrarySpans?.[0].spans?.[0];
        assert.ok(typeof span1 !== 'undefined', "span doesn't exist");
        ensureSpanIsCorrect(span1);
        ensureExportTraceServiceRequestIsSet(json);
        done();
      });
    });

    it('should not log warning message', function (done) {
      const diagLogger = newNopDiagLogger();
      const stubLoggerError = sinon.stub();
      diagLogger.error = stubLoggerError;
      diag.setLogger(diagLogger);

      const responseSpy = sinon.spy();
      collectorExporter.export(spans, responseSpy);

      setTimeout(() => {
        assert.strictEqual(stubLoggerError.args.length, 0);
        done();
      });
    });
  });
});
