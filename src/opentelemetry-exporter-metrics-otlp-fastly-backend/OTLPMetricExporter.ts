/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from '@opentelemetry/core';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { createExportMetricsServiceRequest, IExportMetricsServiceRequest } from '@opentelemetry/otlp-transformer';

import {
  ExportItemConverter,
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase,
  OTLPMetricExporterFastlyBase
} from '../otlp-exporter-fastly-base/index.js';

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/metrics';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

class Converter implements ExportItemConverter<ResourceMetrics, IExportMetricsServiceRequest> {
  convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest {
    return createExportMetricsServiceRequest(metrics);
  }
}

class OTLPExporterFastlyBackendProxy extends OTLPExporterFastlyBackendBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(config, new Converter());
    this.headers = Object.assign(
      this.headers,
      baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_METRICS_HEADERS
      )
    );
  }

  getDefaultUrl(config: OTLPExporterConfigBase): string {
    return typeof config.url === 'string' ? config.url : DEFAULT_COLLECTOR_URL;
  }
}

/**
 * Collector Metric Exporter for Fastly backend
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<
  OTLPExporterFastlyBackendProxy,
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyBackendProxy(config), config);
  }
}
