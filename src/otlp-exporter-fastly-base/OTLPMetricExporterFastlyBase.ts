/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ExportResult } from "@opentelemetry/core";
import { defaultOptions, OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { otlpTypes } from '@opentelemetry/exporter-trace-otlp-http';
import { AggregationTemporality, PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";

import { OTLPExporterFastlyBase } from "./OTLPExporterFastlyBase";

export class OTLPMetricExporterFastlyBase<T extends OTLPExporterFastlyBase<OTLPMetricExporterOptions,
  ResourceMetrics,
  otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest>>
  implements PushMetricExporter {
  public _otlpExporter: T;
  protected _preferredAggregationTemporality: AggregationTemporality;

  constructor(exporter: T,
              config: OTLPMetricExporterOptions = defaultOptions) {
    this._otlpExporter = exporter;
    this._preferredAggregationTemporality = config.aggregationTemporality ?? AggregationTemporality.CUMULATIVE;
  }

  export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    this._otlpExporter.export([metrics], resultCallback);
  }

  async shutdown(): Promise<void> {
    await this._otlpExporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  getPreferredAggregationTemporality(): AggregationTemporality {
    return this._preferredAggregationTemporality;
  }

}
