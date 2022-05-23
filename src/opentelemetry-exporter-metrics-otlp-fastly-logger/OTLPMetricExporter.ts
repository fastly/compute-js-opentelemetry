/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { OTLPMetricExporterOptions, OTLPMetricExporter as OTLPMetricExporterNode } from '@opentelemetry/exporter-metrics-otlp-http';

import {
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
  OTLPMetricExporterFastlyBase
} from "../otlp-exporter-fastly-base";

class OTLPExporterFastlyLoggerProxy extends OTLPExporterFastlyLoggerBase<
  OTLPMetricExporterNode['_otlpExporter']
> {
  constructor(config: OTLPExporterFastlyLoggerConfigBase & OTLPMetricExporterOptions) {
    super(config, new OTLPMetricExporterNode(config)._otlpExporter);
  }

  getDefaultUrl(config: OTLPExporterNodeConfigBase): string {
    // Named log provider does not use a URL.
    return '';
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
