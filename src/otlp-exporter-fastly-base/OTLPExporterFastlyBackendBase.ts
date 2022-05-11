/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { parseHeaders } from "@opentelemetry/otlp-exporter-base";
import { baggageUtils, getEnv } from "@opentelemetry/core";

import { OTLPExporterFastlyBase } from "./OTLPExporterFastlyBase";
import { CompressionAlgorithm, OTLPExporterFastlyBackendConfigBase } from "./types";
import { configureCompression, sendWithFetch } from "./util";

/**
 * Collector Metric Exporter abstract base class for Fastly backend
 */
export abstract class OTLPExporterFastlyBackendBase<
  ExportItem,
  ServiceRequest
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
    serviceRequest: ServiceRequest,
  ): Promise<void> {
    return sendWithFetch(
      this,
      JSON.stringify(serviceRequest),
      'application/json'
    );
  }
}
