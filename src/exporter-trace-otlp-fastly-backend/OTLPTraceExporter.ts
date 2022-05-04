/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { getEnv, baggageUtils } from '@opentelemetry/core';
import { toOTLPExportTraceServiceRequest, otlpTypes } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPExporterFastlyBackendBase, OTLPExporterFastlyBackendConfigBase } from '../otlp-exporter-fastly-base';

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

/**
 * Collector Trace Exporter for Fastly Compute@Edge backends
 */
export class OTLPTraceExporter
  extends OTLPExporterFastlyBackendBase<ReadableSpan,
    otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest>
  implements SpanExporter {
  constructor(config: OTLPExporterFastlyBackendConfigBase) {
    super(config);
    this.headers = Object.assign(
      this.headers,
      baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_TRACES_HEADERS
      )
    );
  }

  convert(
    spans: ReadableSpan[]
  ): otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest {
    return toOTLPExportTraceServiceRequest(spans, this, true);
  }

  getDefaultUrl(config: OTLPExporterFastlyBackendConfigBase): string {
    return typeof config.url === 'string' ? config.url : DEFAULT_COLLECTOR_URL;
  }
}
