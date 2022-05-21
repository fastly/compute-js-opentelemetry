/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import {
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";
import { AggregationTemporality, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";
import { defaultExporterTemporality, OTLPMetricExporterOptions, toOTLPExportMetricServiceRequest } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";

class OTLPExporterFastlyLoggerProxy extends OTLPExporterFastlyLoggerBase<
  ResourceMetrics,
  otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest
> {
  protected readonly _aggregationTemporality: AggregationTemporality;

  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(config);
    this._aggregationTemporality = config.aggregationTemporality ?? defaultExporterTemporality;
  }

  convert(
    metrics: ResourceMetrics[]
  ): otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest {
    return toOTLPExportMetricServiceRequest(
      metrics[0],
      this._aggregationTemporality,
      this
    );
  }

  getDefaultUrl(config: OTLPExporterNodeConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }
}

/**
 * Collector Metric Exporter for Node
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<OTLPExporterFastlyLoggerProxy> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyLoggerProxy(config), config);
  }
}
