/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';

import { OTLPExporterFastlyBase } from "./OTLPExporterFastlyBase";
import { OTLPExporterFastlyLoggerConfigBase } from './types';
import { sendWithFastlyLogger } from "./util";

/**
 * Collector Metric Exporter abstract base class for Fastly named log providers
 */
export abstract class OTLPExporterFastlyLoggerBase<
  ExportItem,
  ServiceRequest
> extends OTLPExporterFastlyBase<
  OTLPExporterFastlyLoggerConfigBase,
  ExportItem,
  ServiceRequest
> {
  loggerEndpoint: string;

  protected constructor(config: OTLPExporterFastlyLoggerConfigBase) {
    super(config);

    if (config.url) {
      diag.warn('config.url is ignored when using named logger');
    }
    if (config.headers) {
      diag.warn('config.headers is ignored when using named logger');
    }

    this.loggerEndpoint = config.endpoint;
  }

  override _send(
    serviceRequest: ServiceRequest,
  ): Promise<void> {
    return sendWithFastlyLogger(
      this,
      JSON.stringify(serviceRequest),
    );
  }
}
