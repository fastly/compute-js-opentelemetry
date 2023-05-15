/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

declare function setFetchFunc(fn: (resource: RequestInfo, init?: RequestInit) => Promise<Response>): void;

import * as assert from 'assert';
import * as sinon from "sinon";

import { diag } from "@opentelemetry/api";
import { AggregationTemporality, MetricProducer, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { OTLPMetricExporterOptions } from "@opentelemetry/exporter-metrics-otlp-http";

import { MockedResponse } from "../computeHelpers";
import { newNopDiagLogger } from "../commonHelpers";
import { mockResourceMetrics } from "../metricsHelpers";
import { OTLPExporterFastlyBackendConfigBase } from "../../src/otlp-exporter-fastly-base";
import { OTLPMetricExporter } from "../../src/opentelemetry-exporter-metrics-otlp-fastly-backend";
import { FastlyMetricReader } from "../../src/opentelemetry-sdk-metrics-fastly";

const address = 'localhost:1501';

describe('OTLPMetricExporter - Compute@Edge with json over Fastly backend', function() {
  let metricExporter: OTLPMetricExporter;
  let metricExporterConfig: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions;

  type FakeFetch = sinon.SinonSpy<[RequestInfo, RequestInit?], Promise<Response>>;
  let fakeFetch: FakeFetch;
  let fakeResponse: Response;

  let resourceMetrics: ResourceMetrics;

  describe('instance', function () {
    it('should warn about metadata when using json', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      metricExporter = new OTLPMetricExporter({
        metadata: 'foo',
        url: address,
      } as any);
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'Metadata cannot be set when using http');
    });

    it('should use default URL if not given', function() {
      metricExporter = new OTLPMetricExporter({
        backend: 'test-backend'
      });
      assert.strictEqual(metricExporter._otlpExporter.url, 'http://localhost:4318/v1/metrics');
    });

    it('should be possible to instantiate with an aggregation temporality', function() {
      metricExporter = new OTLPMetricExporter({
        backend: 'test-backend',
        aggregationTemporality: AggregationTemporality.CUMULATIVE,
      });
      assert.strictEqual(metricExporter.getPreferredAggregationTemporality(), AggregationTemporality.CUMULATIVE);
    });
  });

  describe('attach to a metric reader', function() {
    let metricReader: FastlyMetricReader;
    let metricProducer: MetricProducer;
    let getPreferredAggregationTemporalitySpy: sinon.SinonSpy;
    beforeEach(function() {
      fakeResponse = new MockedResponse('foo', {status: 200});
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);

      metricExporter = new OTLPMetricExporter({
        backend: 'test-backend'
      });

      getPreferredAggregationTemporalitySpy = sinon.spy(metricExporter, 'getPreferredAggregationTemporality');

      metricReader = new FastlyMetricReader({ exporter: metricExporter });

      // Attach a producer too
      metricProducer = new class implements MetricProducer {
        async collect(): Promise<ResourceMetrics> {
          return {
            resource: new Resource({}),
            scopeMetrics: [],
          };
        }
      };
      metricReader.setMetricProducer(metricProducer);
    });

    it('should get getPreferredAggregationTemporality called', function() {
      assert.ok(getPreferredAggregationTemporalitySpy.calledOnce);
    });

    it('flushing metric reader should flush the exporter', async function() {
      const spy = sinon.spy(metricExporter, 'forceFlush');
      await metricReader.forceFlush();
      assert.ok(spy.calledOnce);
    });

    it('shutdown of metric reader should shut down the exporter', async function() {
      const spy = sinon.spy(metricExporter, 'shutdown');
      await metricReader.shutdown();
      assert.ok(spy.calledOnce);
    });
  });

  describe('export', function() {
    beforeEach(function() {
      fakeResponse = {} as Response;
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);

      metricExporterConfig = {
        headers: {
          foo: 'bar',
        },
        hostname: 'foo',
        attributes: {},
        url: 'http://foo.bar.com',
        backend: 'test-backend',
      };
      metricExporter = new OTLPMetricExporter(metricExporterConfig);
      resourceMetrics = {...mockResourceMetrics};
    });

    it('should call fetch with POST method to expected URL and backend', function(done) {

      metricExporter.export(resourceMetrics, () => {});

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
  });

});
