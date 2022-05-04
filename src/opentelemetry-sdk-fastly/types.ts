/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

// import { TextMapPropagator } from '@opentelemetry/api';
import { Sampler } from "@opentelemetry/api";
import type { ContextManager } from '@opentelemetry/api';
import { InstrumentationOption } from '@opentelemetry/instrumentation';
// import { MetricReader } from '@opentelemetry/sdk-metrics-base';
import { Resource } from '@opentelemetry/resources';
import {
  SpanExporter,
  SpanProcessor,
  SpanLimits,
} from '@opentelemetry/sdk-trace-base';

export interface FastlySDKConfiguration {

  resource: Resource;

  spanProcessor: SpanProcessor;
  traceExporter: SpanExporter;
  contextManager: ContextManager;

  sampler: Sampler;
  spanLimits: SpanLimits;

  instrumentations: InstrumentationOption[];

  /*
  autoDetectResources: boolean;

  textMapPropagator: TextMapPropagator;
  metricReader: MetricReader;
  */
}
