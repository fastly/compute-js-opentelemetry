/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, DiagLogLevel, DiagConsoleLogger } from "@opentelemetry/api";

import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { getComputeJsAutoInstrumentations } from "@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js";

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Instantiate a trace exporter.
// "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend" sends trace data to the named
// backend, using the OTLP format. Be sure to specify the backend name in addition to the URL.
// URL defaults to 'http://localhost:4318/v1/traces' if not provided.
const traceExporter = new OTLPTraceExporter({
  backend: 'test_backend',
});

// Instantiate instrumentations.
const instrumentations = [
  getComputeJsAutoInstrumentations(),
];

// Identify our service
// It will be named "basic-tracing-example-ts" in traces.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'basic-tracing-example-ts',
});

// FastlySDK simplifies the procedure of wiring up the trace exporter, span processor,
// metrics exporter, instrumentations, and context manager, as well as giving the service a name.
// It also automatically initiates shutdown of the tracer and meter providers at the
// end of the event, and extends the lifetime of the event to wait until pending data has completed
// exporting.
const sdk = new FastlySDK({
  traceExporter,
  instrumentations,
  resource,
});

await sdk.start();
