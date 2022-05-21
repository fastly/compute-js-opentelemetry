/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { AggregationTemporality, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";

import {
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";
import { defaultExporterTemporality, OTLPMetricExporterOptions, toOTLPExportMetricServiceRequest } from "@opentelemetry/exporter-metrics-otlp-http";
import { baggageUtils, getEnv } from "@opentelemetry/core";
import { appendResourcePathToUrlIfNotPresent, OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/metrics';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

class OTLPExporterFastlyBackendProxy extends OTLPExporterFastlyBackendBase<
  ResourceMetrics,
  otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest
> {
  protected readonly _aggregationTemporality: AggregationTemporality;

  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(config);
    this.headers = Object.assign(
      this.headers,
      baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_METRICS_HEADERS
      )
    );
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
    return typeof config.url === 'string'
      ? config.url
      : getEnv().OTEL_EXPORTER_OTLP_METRICS_ENDPOINT.length > 0
        ? getEnv().OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
        : getEnv().OTEL_EXPORTER_OTLP_ENDPOINT.length > 0
          ? appendResourcePathToUrlIfNotPresent(getEnv().OTEL_EXPORTER_OTLP_ENDPOINT, DEFAULT_COLLECTOR_RESOURCE_PATH)
          : DEFAULT_COLLECTOR_URL;
  }
}

/**
 * Collector Metric Exporter for Node
 */
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<OTLPExporterFastlyBackendProxy> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyBackendProxy(config), config);
  }
}
