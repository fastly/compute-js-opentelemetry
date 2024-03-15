/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { MetricReader, PushMetricExporter, MetricProducer } from '@opentelemetry/sdk-metrics';
import { internal, globalErrorHandler, ExportResultCode, } from '@opentelemetry/core';

export type FastlyMetricReaderOptions = {
  /**
   * The backing exporter for the metric reader.
   */
  exporter: PushMetricExporter,
  /**
   * **Note, this option is experimental**. Additional MetricProducers to use as a source of
   * aggregated metric data in addition to the SDK's metric data. The resource returned by
   * these MetricProducers is ignored; the SDK's resource will be used instead.
   * @experimental
   */
  metricProducers?: MetricProducer[];
};

/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
export class FastlyMetricReader extends MetricReader {
  private _exporter: PushMetricExporter;

  constructor(options: FastlyMetricReaderOptions) {
    super({
      aggregationSelector: options.exporter.selectAggregation?.bind(
        options.exporter
      ),
      aggregationTemporalitySelector:
        options.exporter.selectAggregationTemporality?.bind(options.exporter),
      metricProducers: options.metricProducers,
    });
    this._exporter = options.exporter;
  }

  private async _runOnce(): Promise<void> {
    try {
      await this._doRun();
    } catch (err) {
      globalErrorHandler(err instanceof Error ? err : String(err));
    }
  }

  private async _doRun(): Promise<void> {
    const { resourceMetrics, errors } = await this.collect({});

    if (errors.length > 0) {
      diag.error(
        'FastlyMetricReader: metrics collection errors',
        ...errors
      );
    }

    const doExport = async () => {
      const result = await internal._export(this._exporter, resourceMetrics);
      if (result.code !== ExportResultCode.SUCCESS) {
        throw new Error(
          `FastlyMetricReader: metrics export failed (error ${result.error})`
        );
      }
    };

    // Avoid scheduling a promise to make the behavior more predictable and easier to test
    if (resourceMetrics.resource.asyncAttributesPending) {
      resourceMetrics.resource
        .waitForAsyncAttributes?.()
        .then(doExport, err =>
          diag.debug('Error while resolving async portion of resource: ', err)
        );
    } else {
      await doExport();
    }
  }

  protected async onForceFlush(): Promise<void> {
    await this._runOnce();
    await this._exporter.forceFlush();
  }

  protected async onShutdown(): Promise<void> {
    await this._runOnce();
    await this._exporter.shutdown();
  }
}
