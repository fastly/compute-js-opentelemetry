/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { OTLPExporterBase, OTLPExporterConfigBase, OTLPExporterError } from '@opentelemetry/otlp-exporter-base';

export interface ExportItemConverter<TExportItem, TServiceRequest> {
  convert(objects: TExportItem[]): TServiceRequest;
}

/**
 * Collector Tracer/Metric Exporter abstract base class
 */
export abstract class OTLPExporterFastlyBase<
  T extends OTLPExporterConfigBase,
  Converter extends ExportItemConverter<ExportItem, ServiceRequest>,
  ExportItem = {},
  ServiceRequest = {},
> extends OTLPExporterBase<
  T,
  ExportItem,
  ServiceRequest
> {
  _converter: Converter;

  protected constructor(config: T, converter: Converter) {
    super(config);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((config as any).metadata) {
      diag.warn('Metadata cannot be set when using http');
    }

    this._converter = converter;
  }

  onInit(_config: T): void {}

  send(
    objects: ExportItem[],
    onSuccess: () => void,
    onError: (error: OTLPExporterError) => void
  ): void {
    if (this._shutdownOnce.isCalled) {
      diag.debug('Shutdown already started. Cannot send objects');
      return;
    }

    const serviceRequest = this.convert(objects);

    const promise = this._send(serviceRequest)
      .then(onSuccess, onError);

    this._sendingPromises.push(promise);
    const popPromise = () => {
      const index = this._sendingPromises.indexOf(promise);
      this._sendingPromises.splice(index, 1);
    };
    promise.then(popPromise, popPromise);
  }

  abstract _send(
    serviceRequest: ServiceRequest,
  ): Promise<void>;

  // TODO: end gzip stream from util.ts if not undefined
  // It should perhaps be a class member here instead of a variable in util.ts
  onShutdown(): void {}

  override convert(objects: ExportItem[]): ServiceRequest {
    return this._converter.convert(objects);
  }
}
