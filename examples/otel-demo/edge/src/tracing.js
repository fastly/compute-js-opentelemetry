/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { env } from "fastly:env";

import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_HOST_NAME,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
  SEMRESATTRS_TELEMETRY_SDK_NAME,
  SEMRESATTRS_TELEMETRY_SDK_VERSION,
} from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter as OTLPTraceExporterLogger } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";
import { OTLPTraceExporter as OTLPTraceExporterBackend } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { getComputeJsAutoInstrumentations } from "@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js";

const IS_LOCAL = env('FASTLY_HOSTNAME') === 'localhost';

const OTEL_BACKEND_NAME = 'otel-collector';
const OTEL_HTTP_PROXY_ENDPOINT = 'otel-http-proxy';

// Instantiate instrumentations.
const instrumentations = [
  getComputeJsAutoInstrumentations(),
];

// Identify our service
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'otel-demo-edge',
  [SEMRESATTRS_TELEMETRY_SDK_LANGUAGE]: 'JavaScript',
  [SEMRESATTRS_TELEMETRY_SDK_NAME]: 'opentelemetry',
  [SEMRESATTRS_TELEMETRY_SDK_VERSION]: '1.2.0',
  [SEMRESATTRS_HOST_NAME]: env('FASTLY_HOSTNAME'),
});

// Start OpenTelemetry
const sdk = new FastlySDK({
  instrumentations,
  resource,
});

await sdk.start((config, event) => {
  const configDict = new Dictionary('config');

  let tracerType = 'backend';
  if (IS_LOCAL) {
    if (configDict.get('TRACE_EXPORTER_TYPE') != null) {
      console.warn('Config value TRACE_EXPORTER_TYPE ignored when running under local test server, using \'backend\'.');
    }
  } else {
    tracerType = configDict.get('TRACE_EXPORTER_TYPE') ?? 'backend';
  }

  // Instantiate a trace exporter.
  let traceExporter;
  if(tracerType === 'logger') {
    traceExporter = new OTLPTraceExporterLogger({
      endpoint: OTEL_HTTP_PROXY_ENDPOINT,
    });
  } else {
    if(tracerType !== 'backend') {
      console.warn('Unknown tracer type \'' + tracerType + '\', using backend instead.');
    }
    traceExporter = new OTLPTraceExporterBackend({
      backend: OTEL_BACKEND_NAME,
      url: configDict.get('OTEL_HTTP_COLLECTOR_URL'),
    });
  }

  return {
    ...config,
    traceExporter,
  };
});
