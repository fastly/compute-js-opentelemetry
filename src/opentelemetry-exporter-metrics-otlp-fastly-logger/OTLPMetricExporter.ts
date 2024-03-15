/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { createExportMetricsServiceRequest, IExportMetricsServiceRequest } from '@opentelemetry/otlp-transformer';

import {
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
  OTLPMetricExporterFastlyBase
} from '../otlp-exporter-fastly-base/index.js';

class OTLPExporterFastlyLoggerProxy extends OTLPExporterFastlyLoggerBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(config);
  }

  override convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest {
    return createExportMetricsServiceRequest(metrics, { useLongBits: false });
  }
}

/**
 * Collector Metric Exporter for Fastly named log provider
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<OTLPExporterFastlyLoggerProxy> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyLoggerProxy(config), config);
  }
}
