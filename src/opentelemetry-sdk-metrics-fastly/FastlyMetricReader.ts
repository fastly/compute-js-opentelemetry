/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from "@opentelemetry/api";
import { MetricReader, PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { ExportResultCode } from "@opentelemetry/core";
import { FastlyMetricReaderOptions } from "./types";

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
    });
    this._exporter = options.exporter;
  }

  private async _runOnce(): Promise<void> {
    const { resourceMetrics, errors } = await this.collect({});

    if (errors.length > 0) {
      diag.error(
        'FastlyMetricReader: metrics collection errors',
        ...errors
      );
    }

    return new Promise((resolve, reject) => {
      this._exporter.export(resourceMetrics, result => {
        if (result.code !== ExportResultCode.SUCCESS) {
          reject(
            result.error ??
              new Error(
                `FastlyMetricReader: metrics export failed (error ${result.error})`
              )
          );
        } else {
          resolve();
        }
      });
    });
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
