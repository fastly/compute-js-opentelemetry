/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { getEnv, baggageUtils } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter as OTLPTraceExporterNode, otlpTypes } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPExporterFastlyBackendBase, OTLPExporterFastlyBackendConfigBase } from '../otlp-exporter-fastly-base';

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;

type IExportTraceServiceRequest = otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest;

/**
 * Collector Trace Exporter for Fastly Compute@Edge backends
 */
export class OTLPTraceExporter extends OTLPExporterFastlyBackendBase<
  ReadableSpan,
  IExportTraceServiceRequest
> implements SpanExporter {
  constructor(config: OTLPExporterFastlyBackendConfigBase) {
    super(config, new OTLPTraceExporterNode());
    this.headers = Object.assign(
      this.headers,
      baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_TRACES_HEADERS
      )
    );
  }

  getDefaultUrl(config: OTLPExporterFastlyBackendConfigBase): string {
    return typeof config.url === 'string' ? config.url : DEFAULT_COLLECTOR_URL;
  }
}
