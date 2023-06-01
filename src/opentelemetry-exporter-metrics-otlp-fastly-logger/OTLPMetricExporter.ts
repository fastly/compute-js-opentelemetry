/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { createExportMetricsServiceRequest, IExportMetricsServiceRequest } from "@opentelemetry/otlp-transformer";

import {
  ExportItemConverter,
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";

class Converter implements ExportItemConverter<ResourceMetrics, IExportMetricsServiceRequest> {
  convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest {
    return createExportMetricsServiceRequest(metrics);
  }
}

class OTLPExporterFastlyLoggerProxy extends OTLPExporterFastlyLoggerBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(config, new Converter());
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
