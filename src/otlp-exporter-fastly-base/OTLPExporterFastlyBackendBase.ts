/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from '@opentelemetry/core';
import { parseHeaders } from '@opentelemetry/otlp-exporter-base';

import { OTLPExporterFastlyBase } from './OTLPExporterFastlyBase.js';
import { CompressionAlgorithm, OTLPExporterFastlyBackendConfigBase } from './types.js';
import { configureCompression, sendWithFetch } from './util.js';

/**
 * Collector Metric Exporter abstract base class for Fastly backend
 */
export abstract class OTLPExporterFastlyBackendBase<
  ExportItem,
  ServiceRequest,
> extends OTLPExporterFastlyBase<
  OTLPExporterFastlyBackendConfigBase,
  ExportItem,
  ServiceRequest
> {
  DEFAULT_HEADERS: Record<string, string> = {};
  headers: Record<string, string>;

  backend: string;
  compression: CompressionAlgorithm;

  protected constructor(config: OTLPExporterFastlyBackendConfigBase) {
    super(config);

    this.headers = Object.assign(
      this.DEFAULT_HEADERS,
      parseHeaders(config.headers),
      baggageUtils.parseKeyPairsIntoRecord(getEnv().OTEL_EXPORTER_OTLP_HEADERS)
    );

    this.backend = config.backend;

    this.compression = configureCompression(config.compression);
  }

  override _send(
    body: string,
  ): Promise<void> {
    return sendWithFetch(
      this,
      body,
      'application/json'
    );
  }
}
