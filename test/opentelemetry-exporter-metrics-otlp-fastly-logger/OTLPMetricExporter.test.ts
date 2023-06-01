/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Logger } from "fastly:logger";

import * as assert from 'assert';
import * as sinon from "sinon";

import { diag } from "@opentelemetry/api";
import { AggregationTemporality, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporterOptions } from "@opentelemetry/exporter-metrics-otlp-http";

import { OTLPExporterFastlyLoggerConfigBase } from "../../src/otlp-exporter-fastly-base";
import { OTLPMetricExporter } from "../../src/opentelemetry-exporter-metrics-otlp-fastly-logger";
import { newNopDiagLogger } from "../commonHelpers";
import { mockResourceMetrics } from "../metricsHelpers";
import { FastlyLoggerMock, LoggerMockInstance } from "../computeHelpers";

describe('OTLPMetricExporter - Compute@Edge with json over Fastly logger', function() {
  let metricExporter: OTLPMetricExporter;
  let metricExporterConfig: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions;

  let resourceMetrics: ResourceMetrics;

  describe('instance', function () {
    it('should warn about metadata when using json', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      metricExporter = new OTLPMetricExporter({
        metadata: 'foo',
      } as any);
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'Metadata cannot be set when using http');
    });

    it('should warn about url when using logger', function () {
      const diagLogger = newNopDiagLogger();
      const warnStub = sinon.stub();
      diagLogger.warn = warnStub;
      diag.setLogger(diagLogger);

      metricExporter = new OTLPMetricExporter({
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

      metricExporter = new OTLPMetricExporter({
        headers: {'foo': 'bar'},
        endpoint: 'test-logger',
      });
      const args = warnStub.args[0];
      assert.strictEqual(args[0], 'config.headers is ignored when using named logger');
    });

    it('should be possible to instantiate with an aggregation temporality', function() {
      metricExporter = new OTLPMetricExporter({
        endpoint: 'test-logger',
        temporalityPreference: AggregationTemporality.CUMULATIVE,
      });
      assert.strictEqual(metricExporter.selectAggregationTemporality(), AggregationTemporality.CUMULATIVE);
    });

  });

  describe('export', function() {
    let logger: LoggerMockInstance;

    beforeEach(function() {
      FastlyLoggerMock.mockLoggersRequireFetchEvent(false);
      logger = new Logger('test-logger') as LoggerMockInstance;
      metricExporterConfig = {
        endpoint: 'test-logger',
      };
      metricExporter = new OTLPMetricExporter(metricExporterConfig);
      resourceMetrics = {...mockResourceMetrics};
    });

    it('should call log', function (done) {
      metricExporter.export(resourceMetrics, () => {});
      setTimeout(() => {
        assert.ok(logger.called);
        done();
      });
    });
  });

});
