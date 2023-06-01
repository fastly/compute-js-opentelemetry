/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter as OTLPTraceExporterNode } from '@opentelemetry/exporter-trace-otlp-http';
import { IExportTraceServiceRequest } from "@opentelemetry/otlp-transformer";

import { OTLPExporterFastlyLoggerBase, OTLPExporterFastlyLoggerConfigBase } from '../otlp-exporter-fastly-base';

/**
 * Collector Trace Exporter for Fastly named log providers
 */
export class OTLPTraceExporter extends OTLPExporterFastlyLoggerBase<
  ReadableSpan,
  IExportTraceServiceRequest
> implements SpanExporter {
  constructor(config: OTLPExporterFastlyLoggerConfigBase) {
    super(config, new OTLPTraceExporterNode());
  }

  getDefaultUrl(config: OTLPExporterFastlyLoggerConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }
}
