/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from "@opentelemetry/core";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { OTLPMetricExporterOptions, OTLPMetricExporter as OTLPMetricExporterNode } from "@opentelemetry/exporter-metrics-otlp-http";

import {
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/metrics';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

class OTLPExporterFastlyBackendProxy extends OTLPExporterFastlyBackendBase<
  OTLPMetricExporterNode['_otlpExporter']
> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(config, new OTLPMetricExporterNode(config)._otlpExporter);
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
export class OTLPMetricExporter extends OTLPMetricExporterFastlyBase<OTLPExporterFastlyBackendProxy> {
  constructor(config: OTLPExporterFastlyBackendConfigBase & OTLPMetricExporterOptions) {
    super(new OTLPExporterFastlyBackendProxy(config), config);
  }
}
