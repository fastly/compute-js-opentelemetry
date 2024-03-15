/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { CacheOverride } from 'fastly:cache-override';
import { Logger } from 'fastly:logger';

import { diag } from '@opentelemetry/api';
import { getEnv } from '@opentelemetry/core';
import { OTLPExporterError } from '@opentelemetry/otlp-exporter-base';
import { OTLPExporterFastlyBackendBase } from './OTLPExporterFastlyBackendBase.js';
import { OTLPExporterFastlyLoggerBase } from './OTLPExporterFastlyLoggerBase.js';
import { CompressionAlgorithm } from './types.js';

const compression = new CompressionStream('gzip');

/**
 * Sends data using fetch
 * @param collector
 * @param data
 * @param contentType
 */
export async function sendWithFetch<ExportItem, ServiceRequest>(
  collector: OTLPExporterFastlyBackendBase<ExportItem, ServiceRequest>,
  data: string | Buffer,
  contentType: string,
): Promise<void> {

  const headers: HeadersInit = {
    'Content-Type': contentType,
    ...collector.headers,
  };

  // Build body
  let body: BodyInit;
  switch (collector.compression) {
    case CompressionAlgorithm.GZIP: {
      headers['Content-Encoding'] = 'gzip';
      body = new Response(data).body!.pipeThrough(compression);
      break;
    }
    default:
      body = data;
      break;
  }

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: headers,
    body: body,
    backend: collector.backend,
    cacheOverride: new CacheOverride("pass"),
  };

  // To exempt this fetch itself from telemetry
  (fetchOptions as any).excludeFromTelemetry = true;

  const res = await fetch(collector.url, fetchOptions);
  const responseData = await res.text();

  if (!res.status || res.status >= 300) {
    diag.warn(`status: ${res.status}`, responseData);

    // Fastly C@E fetch does not provide statusText
    throw new OTLPExporterError(
      `Status ${res.status}`,
      res.status,
      responseData
    );
  }

  diag.debug(`status: ${res.status}`, responseData);
}

/**
 * Sends data using Fastly Realtime Logger
 * @param collector
 * @param data
 */
export function sendWithFastlyLogger<ExportItem, ServiceRequest>(
  collector: OTLPExporterFastlyLoggerBase<ExportItem, ServiceRequest>,
  data: string | Buffer,
): Promise<void> {
  return new Promise(resolve => {
    const logger = new Logger(collector.loggerEndpoint);
    logger.log(data);
    diag.debug('Data sent to log');
    resolve();
  });
}

export function configureCompression(
  compression: CompressionAlgorithm | undefined
): CompressionAlgorithm {
  if (compression) {
    return compression;
  } else {
    const definedCompression =
      getEnv().OTEL_EXPORTER_OTLP_TRACES_COMPRESSION ||
      getEnv().OTEL_EXPORTER_OTLP_COMPRESSION;
    return definedCompression === CompressionAlgorithm.GZIP
      ? CompressionAlgorithm.GZIP
      : CompressionAlgorithm.NONE;
  }
}
