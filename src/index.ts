/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

// /// <reference types="@fastly/js-compute" />

// This is a modified version of @fastly/js-compute@0.2.4
// Needed because that version of the file is missing some return types,
// which causes build errors (implicit any) used as is when
// building TypeScript code against it.
// Once 0.2.5 lands, we can uncomment the reference above
// and remove the reference below, as well as remove the referenced file.
/// <reference path="../types/index.d.ts" />

export * as autoInstrumentationsComputeJs from './auto-instrumentations-compute-js';
export * as diagFastlyLogger from './diag-fastly-logger';
export * as exporterTraceOtlpFastlyFetch from './exporter-trace-otlp-fastly-backend';
export * as exporterTraceOtlpFastlyLogger from './exporter-trace-otlp-fastly-logger';
export * as opentelemetryInstrumentationFastlyComputeJs from './opentelemetry-instrumentation-fastly-compute-js';
export * as opentelemetryExporterMetricsOtlpFastlyFetch from './opentelemetry-exporter-metrics-otlp-fastly-backend';
export * as opentelemetryExporterMetricsOtlpFastlyLogger from './opentelemetry-exporter-metrics-otlp-fastly-logger';
export * as opentelemetrySdkFastly from './opentelemetry-sdk-fastly';
export * as opentelemetrySdkMetricsFastly from './opentelemetry-sdk-metrics-fastly';
export * as opentelemetrySdkTraceFastly from './opentelemetry-sdk-trace-fastly';
export * as otlpExporterFastlyBase from './otlp-exporter-fastly-base';
