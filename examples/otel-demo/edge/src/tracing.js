/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter as OTLPTraceExporterLogger } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";
import { OTLPTraceExporter as OTLPTraceExporterBackend } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { FastlyComputeJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js";
import { FastlyBackendFetchInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch";

const IS_LOCAL = fastly.env.get('FASTLY_HOSTNAME') === 'localhost';

const OTEL_BACKEND_NAME = 'otel-collector';
const OTEL_HTTP_PROXY_ENDPOINT = 'otel-http-proxy';

// Instantiate instrumentations.
const instrumentations = [
  // Generates traces for Compute@Edge lifetime events.
  new FastlyComputeJsInstrumentation(),
  // Generates traces for Fastly backend fetch.
  new FastlyBackendFetchInstrumentation(),
];

// Identify our service
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'otel-demo-edge',
  [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'JavaScript',
  [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: 'opentelemetry',
  [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: '1.2.0',
  [SemanticResourceAttributes.HOST_NAME]: fastly.env.get('FASTLY_HOSTNAME'),
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
