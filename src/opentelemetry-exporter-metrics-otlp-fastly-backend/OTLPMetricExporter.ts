/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from '@opentelemetry/core';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import {
  appendResourcePathToUrl,
  appendRootPathToUrlIfNeeded,
  OTLPExporterConfigBase
} from '@opentelemetry/otlp-exporter-base';
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { createExportMetricsServiceRequest, IExportMetricsServiceRequest } from '@opentelemetry/otlp-transformer';

import {
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase,
  OTLPMetricExporterFastlyBase
} from '../otlp-exporter-fastly-base/index.js';
import { VERSION } from '../version.js';

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/metrics';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;
const USER_AGENT = {
  'User-Agent': `OTel-OTLP-Exporter-JavaScript/${VERSION}`,
};

class OTLPExporterFastlyBackendProxy extends OTLPExporterFastlyBackendBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(config);
    this.headers = {
      ...this.headers,
      ...USER_AGENT,
      ...baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_METRICS_HEADERS
      ),
      ...config?.headers,
    };
  }

  override convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest {
    return createExportMetricsServiceRequest(metrics, { useLongBits: false });
  }

  getDefaultUrl(config: OTLPExporterConfigBase): string {
    return typeof config.url === 'string'
      ? config.url
      : getEnv().OTEL_EXPORTER_OTLP_METRICS_ENDPOINT.length > 0
        ? appendRootPathToUrlIfNeeded(
          getEnv().OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
        )
        : getEnv().OTEL_EXPORTER_OTLP_ENDPOINT.length > 0
          ? appendResourcePathToUrl(
            getEnv().OTEL_EXPORTER_OTLP_ENDPOINT,
            DEFAULT_COLLECTOR_RESOURCE_PATH
          )
          : DEFAULT_COLLECTOR_URL;
  }
}

/**
 * Collector Metric Exporter for Fastly backend
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<OTLPExporterFastlyBackendProxy> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyBackendProxy(config), config);
  }
}
