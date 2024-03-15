/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { ExportResult, getEnv } from '@opentelemetry/core';
import {
  Aggregation, AggregationSelector,
  AggregationTemporality,
  AggregationTemporalitySelector,
  InstrumentType,
  PushMetricExporter,
  ResourceMetrics
} from '@opentelemetry/sdk-metrics';
import {
  AggregationTemporalityPreference,
  OTLPMetricExporterOptions
} from '@opentelemetry/exporter-metrics-otlp-http';
import { IExportMetricsServiceRequest } from '@opentelemetry/otlp-transformer';

import { OTLPExporterFastlyBase } from './OTLPExporterFastlyBase.js';

export const CumulativeTemporalitySelector: AggregationTemporalitySelector =
  () => AggregationTemporality.CUMULATIVE;

export const DeltaTemporalitySelector: AggregationTemporalitySelector = (
  instrumentType: InstrumentType
) => {
  switch (instrumentType) {
    case InstrumentType.COUNTER:
    case InstrumentType.OBSERVABLE_COUNTER:
    case InstrumentType.HISTOGRAM:
    case InstrumentType.OBSERVABLE_GAUGE:
      return AggregationTemporality.DELTA;
    case InstrumentType.UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
      return AggregationTemporality.CUMULATIVE;
  }
};

export const LowMemoryTemporalitySelector: AggregationTemporalitySelector = (
  instrumentType: InstrumentType
) => {
  switch (instrumentType) {
    case InstrumentType.COUNTER:
    case InstrumentType.HISTOGRAM:
      return AggregationTemporality.DELTA;
    case InstrumentType.UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_UP_DOWN_COUNTER:
    case InstrumentType.OBSERVABLE_COUNTER:
    case InstrumentType.OBSERVABLE_GAUGE:
      return AggregationTemporality.CUMULATIVE;
  }
};

function chooseTemporalitySelectorFromEnvironment() {
  const env = getEnv();
  const configuredTemporality =
    env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE.trim().toLowerCase();

  if (configuredTemporality === 'cumulative') {
    return CumulativeTemporalitySelector;
  }
  if (configuredTemporality === 'delta') {
    return DeltaTemporalitySelector;
  }
  if (configuredTemporality === 'lowmemory') {
    return LowMemoryTemporalitySelector;
  }

  diag.warn(
    `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE is set to '${env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE}', but only 'cumulative' and 'delta' are allowed. Using default ('cumulative') instead.`
  );
  return CumulativeTemporalitySelector;
}

function chooseTemporalitySelector(
  temporalityPreference?:
    | AggregationTemporalityPreference
    | AggregationTemporality
): AggregationTemporalitySelector {
  // Directly passed preference has priority.
  if (temporalityPreference != null) {
    if (temporalityPreference === AggregationTemporalityPreference.DELTA) {
      return DeltaTemporalitySelector;
    } else if (
      temporalityPreference === AggregationTemporalityPreference.LOWMEMORY
    ) {
      return LowMemoryTemporalitySelector;
    }
    return CumulativeTemporalitySelector;
  }

  return chooseTemporalitySelectorFromEnvironment();
}

function chooseAggregationSelector(
  config: OTLPMetricExporterOptions | undefined
) {
  if (config?.aggregationPreference) {
    return config.aggregationPreference;
  } else {
    return (_instrumentType: any) => Aggregation.Default();
  }
}

export class OTLPMetricExporterFastlyBase<
  T extends OTLPExporterFastlyBase<
    OTLPMetricExporterOptions,
    ResourceMetrics,
    IExportMetricsServiceRequest
  >,
> implements PushMetricExporter {
  public _otlpExporter: T;
  private _aggregationTemporalitySelector: AggregationTemporalitySelector;
  private _aggregationSelector: AggregationSelector;

  constructor(exporter: T,
              config: OTLPMetricExporterOptions) {
    this._otlpExporter = exporter;
    this._aggregationSelector = chooseAggregationSelector(config);
    this._aggregationTemporalitySelector = chooseTemporalitySelector(
      config?.temporalityPreference
    );
  }

  export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void
  ): void {
    this._otlpExporter.export([metrics], resultCallback);
  }

  async shutdown(): Promise<void> {
    await this._otlpExporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  selectAggregation(instrumentType: InstrumentType): Aggregation {
    return this._aggregationSelector(instrumentType);
  }

  selectAggregationTemporality(
    instrumentType: InstrumentType
  ): AggregationTemporality {
    return this._aggregationTemporalitySelector(instrumentType);
  }
}
