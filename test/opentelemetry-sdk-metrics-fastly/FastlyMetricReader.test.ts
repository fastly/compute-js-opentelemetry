/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import {
  AggregationTemporality,
  MetricProducer,
  PushMetricExporter,
  ResourceMetrics
} from "@opentelemetry/sdk-metrics";

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";

import { FastlyMetricReader } from "../../src/opentelemetry-sdk-metrics-fastly";

describe('FastlyMetricReader', function() {
  describe('instance', function() {
    it('can be instantiated with a Push Metric Exporter', function() {

      const exporter = new class implements PushMetricExporter {
        export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void) {}
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

      // FastlyMetricReader is supposed to call exporter.getPreferredAggregationTemporality()
      // in its constructor
      const getPreferredAggregationTemporalitySpy =
        sinon.spy(exporter, 'getPreferredAggregationTemporality');

      const metricReader = new FastlyMetricReader({ exporter });

      assert.ok(metricReader != null);
      assert.ok(getPreferredAggregationTemporalitySpy.calledOnce);
    });
  });

  describe('export', function() {
    let metrics: ResourceMetrics;
    let exporter: PushMetricExporter;
    let metricProducer: MetricProducer;
    let metricReader: FastlyMetricReader;

    beforeEach(function() {
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
        async collect(): Promise<ResourceMetrics> {
          return metrics;
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

    it('when shutdown is called, if collect returns no metrics, then exporter\'s export function won\'t be called', async function() {

      metricReader.collect = async() => {
        return undefined;
      };

      const exportSpy = sinon.spy(exporter, 'export');
      await metricReader.shutdown();

      assert.ok(!exportSpy.called);

    });

    it('sending to exporter may throw general error', async function() {

      exporter.export = (metrics, resultCallback) => {
        resultCallback({ code: ExportResultCode.FAILED });
      }

      await assert.rejects(async () => {
        await metricReader.shutdown();
      }, (err) => {
        assert.ok(err.name === 'Error');
        assert.ok(err.message === 'PeriodicExportingMetricReader: metrics export failed (error undefined)');
        return true;
      });

    });

    it('sending to exporter may throw specific error', async function() {

      const theError = new Error('the error!');
      exporter.export = (metrics, resultCallback) => {
        resultCallback({ code: ExportResultCode.FAILED, error: theError });
      }

      await assert.rejects(async () => {
        await metricReader.shutdown();
      }, (err) => {
        assert.strictEqual(err, theError);
        return true;
      });

    });

    it('when forceFlush is called, collect is called, and they are sent to exporter\'s export function', async function() {

      const exportSpy = sinon.spy(exporter, 'export');
      await metricReader.forceFlush();

      assert.ok(exportSpy.called);
      assert.strictEqual(exportSpy.args[0][0], metrics);

    });
  });
});
