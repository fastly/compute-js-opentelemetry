/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import {
  AggregationTemporality,
  CollectionResult,
  InstrumentType,
  MetricReader,
  PushMetricExporter,
  ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import { MetricProducer } from "@opentelemetry/sdk-metrics/build/src/export/MetricProducer";

import { setGlobalErrorHandler, ExportResult, ExportResultCode } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";

import { FastlyMetricReader } from "../../src/opentelemetry-sdk-metrics-fastly";

describe('FastlyMetricReader', function() {
  describe('instance', function() {
    let exporter: PushMetricExporter;
    let metricReader: MetricReader;
    let selectAggregationTemporalitySpy: sinon.SinonSpy;

    beforeEach(function() {
      exporter = new class implements PushMetricExporter {
        export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void) {}
        forceFlush(): Promise<void> {
          return Promise.resolve(undefined);
        }
        selectAggregationTemporality(): AggregationTemporality {
          return AggregationTemporality.CUMULATIVE;
        }
        shutdown(): Promise<void> {
          return Promise.resolve(undefined);
        }
      };
      selectAggregationTemporalitySpy = sinon.spy(exporter, 'selectAggregationTemporality');

      metricReader = new FastlyMetricReader({ exporter });

    });

    it('can be instantiated with a Push Metric Exporter', function() {
      assert.ok(metricReader != null);
    });

    it('calling selectAggregationTemporality on reader gets selectAggregationTemporality on exporter called', function() {
      metricReader.selectAggregationTemporality(InstrumentType.COUNTER)
      assert.ok(selectAggregationTemporalitySpy.called);
    });
  });

  describe('export', function() {
    let defaultHandler: sinon.SinonSpy;

    let metrics: ResourceMetrics;
    let exporter: PushMetricExporter;
    let metricProducer: MetricProducer;
    let metricReader: FastlyMetricReader;

    beforeEach(function() {
      defaultHandler = sinon.spy();
      setGlobalErrorHandler(defaultHandler);
      metrics = {
        resource: new Resource({}),
        scopeMetrics: [],
      };
      exporter = new class implements PushMetricExporter {
        export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void) {
          resultCallback({ code: ExportResultCode.SUCCESS });
        }
        forceFlush(): Promise<void> {
          return Promise.resolve(undefined);
        }
        getPreferredAggregationTemporality(): AggregationTemporality {
          return AggregationTemporality.CUMULATIVE;
        }
        shutdown(): Promise<void> {
          return Promise.resolve(undefined);
        }
      };
      metricProducer = new class implements MetricProducer {
        async collect(): Promise<CollectionResult> {
          return {
            resourceMetrics: metrics,
            errors: [],
          };
        }
      };
      metricReader = new FastlyMetricReader({exporter})

      // The meter provider usually does this step.
      metricReader.setMetricProducer(metricProducer);
    });

    it('when shutdown is called, collect is called, and they are sent to exporter\'s export function', async function() {

      const exportSpy = sinon.spy(exporter, 'export');
      await metricReader.shutdown();

      assert.ok(exportSpy.called);
      assert.strictEqual(exportSpy.args[0][0], metrics);

    });

    it('when shutdown is called, if collect returns no metrics, then exporter\'s export function is still called.', async function() {

      metricReader.collect = async() => {
        return {
          resourceMetrics: {
            resource: new Resource({}),
            scopeMetrics: [],
          },
          errors: [],
        } as CollectionResult;
      };

      const exportSpy = sinon.spy(exporter, 'export');
      await metricReader.shutdown();

      assert.ok(exportSpy.called);
      assert.ok(exportSpy.args[0][0].scopeMetrics.length === 0);

    });

    it('sending to exporter may throw general error', async function() {

      exporter.export = (metrics, resultCallback) => {
        resultCallback({ code: ExportResultCode.FAILED });
      }

      await metricReader.shutdown();

      assert.ok(defaultHandler.calledOnce);
      const err = defaultHandler.args[0][0];
      assert.ok(err instanceof Error);
      assert.ok(err.name === 'Error');
      assert.ok(err.message === 'FastlyMetricReader: metrics export failed (error undefined)');

    });

    it('sending to exporter may throw specific error', async function() {

      const theError = new Error('the error!');
      exporter.export = (metrics, resultCallback) => {
        resultCallback({ code: ExportResultCode.FAILED, error: theError });
      }

      await metricReader.shutdown();

      assert.ok(defaultHandler.calledOnce);
      const err = defaultHandler.args[0][0];
      assert.ok(err instanceof Error);
      assert.ok(err.name === 'Error');
      assert.ok(err.message === 'FastlyMetricReader: metrics export failed (error Error: the error!)');

    });

    it('when forceFlush is called, collect is called, and they are sent to exporter\'s export function', async function() {

      const exportSpy = sinon.spy(exporter, 'export');
      await metricReader.forceFlush();

      assert.ok(exportSpy.called);
      assert.strictEqual(exportSpy.args[0][0], metrics);

    });
  });
});
