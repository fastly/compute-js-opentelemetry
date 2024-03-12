/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ExportResult } from '@opentelemetry/core';
import { AggregationTemporality, PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';

import { OTLPExporterFastlyBase } from './OTLPExporterFastlyBase.js';

export class OTLPMetricExporterFastlyBase<
  T extends OTLPExporterFastlyBase<OTLPMetricExporterOptions, ExportItem, ServiceRequest>,
  ExportItem extends ResourceMetrics,
  ServiceRequest,
> implements PushMetricExporter {
  public _otlpExporter: T;
  protected _temporalityPreference: AggregationTemporality;

  constructor(exporter: T,
              config: OTLPMetricExporterOptions) {
    this._otlpExporter = exporter;
    this._temporalityPreference = config.temporalityPreference ?? AggregationTemporality.CUMULATIVE;
  }

  export(metrics: ExportItem, resultCallback: (result: ExportResult) => void): void {
    this._otlpExporter.export([metrics], resultCallback);
  }

  async shutdown(): Promise<void> {
    await this._otlpExporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  selectAggregationTemporality(): AggregationTemporality {
    return this._temporalityPreference;
  }

}
