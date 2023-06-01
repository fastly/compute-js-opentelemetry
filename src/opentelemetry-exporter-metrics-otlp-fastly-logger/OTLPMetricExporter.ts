/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { AggregationTemporality, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";
import { OTLPExporterBase, OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import {
  OTLPMetricExporterOptions,
  toOTLPExportMetricServiceRequest,
  defaultExporterTemporality,
} from '@opentelemetry/exporter-metrics-otlp-http';
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";

import {
  ExportItemConverter,
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";

type IExportMetricsServiceRequest = otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest;

class Converter implements ExportItemConverter<ResourceMetrics, IExportMetricsServiceRequest> {
  private readonly _aggregationTemporality: AggregationTemporality;
  private _exporter: OTLPExporterBase<OTLPExporterFastlyLoggerConfigBase, ResourceMetrics, IExportMetricsServiceRequest> | undefined;

  constructor(
    aggregationTemporality: AggregationTemporality,
  ) {
    this._aggregationTemporality = aggregationTemporality;
    this._exporter = undefined;
  }
  setExporter(
    exporter: OTLPExporterBase<
      OTLPExporterFastlyLoggerConfigBase,
      ResourceMetrics,
      IExportMetricsServiceRequest
    >
  ) {
    this._exporter = exporter;
  }
  convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest {
    if (this._exporter == null) {
      throw new Error("Exporter not set");
    }
    return toOTLPExportMetricServiceRequest(metrics[0], this._aggregationTemporality, this._exporter);
  }
}

class OTLPExporterFastlyLoggerProxy extends OTLPExporterFastlyLoggerBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(config, new Converter(config.aggregationTemporality ?? defaultExporterTemporality));
    (this._converter as Converter).setExporter(this);
  }

  getDefaultUrl(config: OTLPExporterNodeConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }
}

/**
 * Collector Metric Exporter for Fastly named log provider
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<
  OTLPExporterFastlyLoggerProxy,
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyLoggerProxy(config), config);
  }
}
