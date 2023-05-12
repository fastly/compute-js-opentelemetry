/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ExportResultCode } from "@opentelemetry/core";

import * as assert from 'assert';
import * as sinon from 'sinon';
import { AggregationTemporality } from "@opentelemetry/sdk-metrics";

import { ConsoleMetricExporter } from '../../src/opentelemetry-sdk-metrics-fastly';
import { mockResourceMetrics } from "../metricsHelpers";

describe('ConsoleMetricExporter', function() {
  describe('instance', function() {
    it('can be instantiated', function() {
      const exporter = new ConsoleMetricExporter();
      assert.ok(exporter != null);
    });
  });

  describe('getPreferredAggregationTemporality', function() {
    it('returns CUMULATIVE', function() {
      const exporter = new ConsoleMetricExporter();
      assert.strictEqual(exporter.getPreferredAggregationTemporality(), AggregationTemporality.CUMULATIVE);
    });
  });

  describe('export', function() {
    it('causes passed-in object to be logged', function(done) {
      const exporter = new ConsoleMetricExporter();

      // spy on console.log because that's where this sends metrics
      const consoleLogSpy = sinon.stub(console, 'log');

      exporter.export(mockResourceMetrics, () => {});

      setTimeout(() => {

        const metrics = mockResourceMetrics.instrumentationLibraryMetrics[0]
          .metrics[0];

        assert.strictEqual(consoleLogSpy.callCount, 4);
        assert.strictEqual(consoleLogSpy.args[0][0], metrics.descriptor);
        assert.strictEqual(consoleLogSpy.args[1][0], 'SINGULAR');
        assert.strictEqual(consoleLogSpy.args[2][0], metrics.dataPoints[0]);
        assert.strictEqual(consoleLogSpy.args[3][0], metrics.dataPoints[1]);

        done();

      });

    });

    it('causes callback to be called', function() {

      const exporter = new ConsoleMetricExporter();
      // stub console so it's not noisy
      sinon.stub(console, 'log');

      // callback
      const resultCallback = sinon.stub();

      exporter.export(mockResourceMetrics, resultCallback);

      assert.ok(resultCallback.calledOnce);
      assert.strictEqual(resultCallback.args[0][0].code, ExportResultCode.SUCCESS);

    });
  });

  describe('forceFlush', function() {
    it('doesn\'t do anything', async function() {
      const exporter = new ConsoleMetricExporter();
      await exporter.forceFlush();
    });
  });

  describe('shutdown', function() {
    it('doesn\'t do anything', async function() {
      const exporter = new ConsoleMetricExporter();
      await exporter.shutdown();
    });
  });
});
