/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { createExportTraceServiceRequest, IExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';

import {
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase,
} from '../otlp-exporter-fastly-base/index.js';

/**
 * Collector Trace Exporter for Fastly named log providers
 */
export class OTLPTraceExporter extends OTLPExporterFastlyLoggerBase<
  ReadableSpan,
  IExportTraceServiceRequest
> implements SpanExporter {
  constructor(config: OTLPExporterFastlyLoggerConfigBase) {
    super(config);
  }
  override convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
    return createExportTraceServiceRequest(spans, {
      useHex: true,
      useLongBits: false,
    });
  }
}
