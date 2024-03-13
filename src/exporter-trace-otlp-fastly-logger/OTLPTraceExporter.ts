/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { createExportTraceServiceRequest, IExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';

import {
  ExportItemConverter,
  OTLPExporterFastlyLoggerBase,
  OTLPExporterFastlyLoggerConfigBase
} from '../otlp-exporter-fastly-base/index.js';

class Converter implements ExportItemConverter<ReadableSpan, IExportTraceServiceRequest> {
  convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
    return createExportTraceServiceRequest(spans, true);
  }
}

/**
 * Collector Trace Exporter for Fastly named log providers
 */
export class OTLPTraceExporter extends OTLPExporterFastlyLoggerBase<
  ReadableSpan,
  IExportTraceServiceRequest
> implements SpanExporter {
  constructor(config: OTLPExporterFastlyLoggerConfigBase) {
    super(config, new Converter());
  }

  getDefaultUrl(config: OTLPExporterFastlyLoggerConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }
}
