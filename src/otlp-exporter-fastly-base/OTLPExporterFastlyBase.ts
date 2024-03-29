/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { OTLPExporterBase, OTLPExporterConfigBase, OTLPExporterError } from '@opentelemetry/otlp-exporter-base';

/**
 * Collector Tracer/Metric Exporter abstract base class
 */
export abstract class OTLPExporterFastlyBase<
  T extends OTLPExporterConfigBase,
  ExportItem,
  ServiceRequest,
> extends OTLPExporterBase<
  T,
  ExportItem,
  ServiceRequest
> {
  protected constructor(config: T) {
    super(config);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((config as any).metadata) {
      diag.warn('Metadata cannot be set when using http');
    }
  }

  onInit(_config: T): void {}

  send(
    items: ExportItem[],
    onSuccess: () => void,
    onError: (error: OTLPExporterError) => void
  ): void {
    if (this._shutdownOnce.isCalled) {
      diag.debug('Shutdown already started. Cannot send objects');
      return;
    }

    const serviceRequest = this.convert(items);
    const body = JSON.stringify(serviceRequest);

    const promise = this._send(body)
      .then(onSuccess, onError);

    this._sendingPromises.push(promise);
    const popPromise = () => {
      const index = this._sendingPromises.indexOf(promise);
      this._sendingPromises.splice(index, 1);
    };
    promise.then(popPromise, popPromise);
  }

  abstract _send(body: string): Promise<void>;

  // TODO: end gzip stream from util.ts if not undefined
  // It should perhaps be a class member here instead of a variable in util.ts
  onShutdown(): void {}
}
