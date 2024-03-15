/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';

import { OTLPExporterFastlyBase } from './OTLPExporterFastlyBase.js';
import { OTLPExporterFastlyLoggerConfigBase } from './types.js';
import { sendWithFastlyLogger } from './util.js';

/**
 * Collector Metric Exporter abstract base class for Fastly named log providers
 */
export abstract class OTLPExporterFastlyLoggerBase<
  ExportItem,
  ServiceRequest,
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

  getDefaultUrl(_config: OTLPExporterConfigBase): string {
    // Named log provider does not use a URL.
    return '';
  }

  override _send(
    body: string,
  ): Promise<void> {
    return sendWithFastlyLogger(
      this,
      body,
    );
  }
}
