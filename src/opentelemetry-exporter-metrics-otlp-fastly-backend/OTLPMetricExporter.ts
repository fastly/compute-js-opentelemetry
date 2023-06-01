/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from "@opentelemetry/core";
import { AggregationTemporality, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";
import { OTLPExporterBase, OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import {
  OTLPMetricExporterOptions,
  toOTLPExportMetricServiceRequest,
  defaultExporterTemporality,
} from "@opentelemetry/exporter-metrics-otlp-http";
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";
import {
  ExportItemConverter,
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/metrics';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

type IExportMetricsServiceRequest = otlpTypes.opentelemetryProto.collector.metrics.v1.ExportMetricsServiceRequest;

class Converter implements ExportItemConverter<ResourceMetrics, IExportMetricsServiceRequest> {
  private readonly _aggregationTemporality: AggregationTemporality;
  private _exporter: OTLPExporterBase<OTLPExporterFastlyBackendConfigBase, ResourceMetrics, IExportMetricsServiceRequest> | undefined;

  constructor(
    aggregationTemporality: AggregationTemporality,
  ) {
    this._aggregationTemporality = aggregationTemporality;
    this._exporter = undefined;
  }
  setExporter(
    exporter: OTLPExporterBase<
      OTLPExporterFastlyBackendConfigBase,
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

class OTLPExporterFastlyBackendProxy extends OTLPExporterFastlyBackendBase<
  ResourceMetrics,
  IExportMetricsServiceRequest
> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(config, new Converter(config.aggregationTemporality ?? defaultExporterTemporality));
    (this._converter as Converter).setExporter(this);
    this.headers = Object.assign(
      this.headers,
      baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_METRICS_HEADERS
      )
    );
  }

  getDefaultUrl(config: OTLPExporterNodeConfigBase): string {
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
