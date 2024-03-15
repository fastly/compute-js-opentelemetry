/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { getEnv, baggageUtils } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { appendResourcePathToUrl, appendRootPathToUrlIfNeeded } from '@opentelemetry/otlp-exporter-base';
import { createExportTraceServiceRequest, IExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import {
  OTLPExporterFastlyBackendBase,
  OTLPExporterFastlyBackendConfigBase
} from '../otlp-exporter-fastly-base/index.js';
import { VERSION } from '../version.js';

const DEFAULT_COLLECTOR_RESOURCE_PATH = '/v1/traces';
const DEFAULT_COLLECTOR_URL = `http://localhost:4318${DEFAULT_COLLECTOR_RESOURCE_PATH}`;
const USER_AGENT = {
  'User-Agent': `OTel-OTLP-Exporter-JavaScript/${VERSION}`,
};

/**
 * Collector Trace Exporter for Fastly Compute backends
 */
export class OTLPTraceExporter extends OTLPExporterFastlyBackendBase<
  ReadableSpan,
  IExportTraceServiceRequest
> implements SpanExporter {
  constructor(config: OTLPExporterFastlyBackendConfigBase) {
    super(config);
    this.headers = {
      ...this.headers,
      ...USER_AGENT,
      ...baggageUtils.parseKeyPairsIntoRecord(
        getEnv().OTEL_EXPORTER_OTLP_TRACES_HEADERS
      ),
      ...config.headers,
    };
  }

  override convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
    return createExportTraceServiceRequest(spans, {
      useHex: true,
      useLongBits: false,
    });
  }

  getDefaultUrl(config: OTLPExporterFastlyBackendConfigBase): string {
    return typeof config.url === 'string'
      ? config.url
      : getEnv().OTEL_EXPORTER_OTLP_TRACES_ENDPOINT.length > 0
        ? appendRootPathToUrlIfNeeded(getEnv().OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)
        : getEnv().OTEL_EXPORTER_OTLP_ENDPOINT.length > 0
          ? appendResourcePathToUrl(
            getEnv().OTEL_EXPORTER_OTLP_ENDPOINT,
            DEFAULT_COLLECTOR_RESOURCE_PATH
          )
          : DEFAULT_COLLECTOR_URL;
  }
}
