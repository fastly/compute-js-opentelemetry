/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

declare function setFetchFunc(fn: (resource: RequestInfo, init?: RequestInit) => Promise<Response>): void;

import * as assert from 'assert';
import * as sinon from 'sinon';

import { diag } from '@opentelemetry/api';
import { AggregationTemporality, CollectionResult, InstrumentType, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { MetricProducer } from '@opentelemetry/sdk-metrics/build/src/export/MetricProducer.js';
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';

import { MockedResponse } from '../computeHelpers.js';
import { newNopDiagLogger } from '../commonHelpers.js';
import { mockResourceMetrics } from '../metricsHelpers.js';
import { OTLPExporterFastlyBackendConfigBase } from '../../src/otlp-exporter-fastly-base/index.js';
import { OTLPMetricExporter } from '../../src/opentelemetry-exporter-metrics-otlp-fastly-backend/index.js';
import { FastlyMetricReader } from '../../src/opentelemetry-sdk-metrics-fastly/index.js';

const address = 'localhost:1501';

describe('OTLPMetricExporter - Compute with json over Fastly backend', function() {
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
        temporalityPreference: AggregationTemporality.CUMULATIVE,
      });
      assert.strictEqual(metricExporter.selectAggregationTemporality(), AggregationTemporality.CUMULATIVE);
    });
  });

  describe('attach to a metric reader', function() {
    let metricReader: FastlyMetricReader;
    let metricProducer: MetricProducer;
    let selectAggregationTemporalitySpy: sinon.SinonSpy;
    beforeEach(function() {
      fakeResponse = new MockedResponse('foo', {status: 200});
      fakeFetch = sinon.fake.resolves(fakeResponse) as FakeFetch;
      setFetchFunc(fakeFetch);

      metricExporter = new OTLPMetricExporter({
        backend: 'test-backend'
      });

      selectAggregationTemporalitySpy = sinon.spy(metricExporter, 'selectAggregationTemporality');

      metricReader = new FastlyMetricReader({ exporter: metricExporter });

      // Attach a producer too
      metricProducer = new class implements MetricProducer {
        async collect(): Promise<CollectionResult> {
          return {
            resourceMetrics: {
              resource: new Resource({}),
              scopeMetrics: [],
            },
            errors: [],
          };
        }
      };
      metricReader.setMetricProducer(metricProducer);
    });

    it('calling selectAggregationTemporality on the reader should get selectAggregationTemporality on the exporter called', function() {
      metricReader.selectAggregationTemporality(InstrumentType.COUNTER);
      assert.ok(selectAggregationTemporalitySpy.calledOnce);
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
