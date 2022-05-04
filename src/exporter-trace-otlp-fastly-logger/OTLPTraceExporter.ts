/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { toOTLPExportTraceServiceRequest, otlpTypes } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPExporterFastlyLoggerBase, OTLPExporterFastlyLoggerConfigBase } from '../otlp-exporter-fastly-base';

/**
 * Collector Trace Exporter for Fastly named log providers
 */
export class OTLPTraceExporter
  extends OTLPExporterFastlyLoggerBase<
    ReadableSpan,
    otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest>
  implements SpanExporter {

  constructor(config: OTLPExporterFastlyLoggerConfigBase) {
    super(config);
  }

  convert(
    spans: ReadableSpan[]
  ): otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest {
    return toOTLPExportTraceServiceRequest(spans, this, true);
  }

  getDefaultUrl(config: OTLPExporterFastlyLoggerConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }
}
