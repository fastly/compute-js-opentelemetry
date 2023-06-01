/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { baggageUtils, getEnv } from "@opentelemetry/core";
import { parseHeaders, configureCompression, CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";

import { OTLPExporterFastlyBase, ExportItemConverter } from "./OTLPExporterFastlyBase";
import { OTLPExporterFastlyBackendConfigBase } from "./types";
import { sendWithFetch } from "./util";

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

  protected constructor(config: OTLPExporterFastlyBackendConfigBase, converter: ExportItemConverter<ExportItem, ServiceRequest>) {
    super(config, converter);

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
