/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import { context, trace, diag, DiagLogLevel, DiagConsoleLogger } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { FastlyComputeJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js";

// Instantiate a trace exporter.
// "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend" sends trace data to the named
// backend, using the OTLP format. Be sure to specify the backend name in addition to the URL.
// URL defaults to 'http://localhost/v1/traces' if not provided.
const traceExporter = new OTLPTraceExporter({
  backend: 'test_backend'
});

// Instantiate instrumentations.
const instrumentations = [
  // Generates traces for Compute@Edge lifetime events.
  new FastlyComputeJsInstrumentation(),
];

// Identify our service
// It will be named "basic-service" in traces.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'basic-service',
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

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Standard Compute@Edge JavaScript entry point
addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  // Get a tracer.
  // Any spans made with this tracer will have the otel.library.name
  // value of "fastly-js-opentelemetry-demo".
  const tracer = trace.getTracerProvider()
    .getTracer('fastly-js-opentelemetry-demo');

  // Create a span.  This span will be created under the active context.
  // Since this function is running within the Compute@Edge lifetime,
  // the parent span will be the 'listener fn' span, provided by
  // "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js"
  const span1 = tracer.startSpan('my-span');
  context.with(trace.setSpan(context.active(), span1), () => {
    try {

      // Add event at start
      trace.getSpan(context.active()).addEvent("start");

      // Waste a few milliseconds
      let total = 0;
      for (let x = 0; x < 200000; x++) {
        total += x;
      }

      // Add event at end, with attribute
      trace.getSpan(context.active()).addEvent("end", { total });

    } finally {
      // End the span
      span1.end();
    }
  });

  return new Response('OK', {
    status: 200,
    headers: new Headers({"Content-Type": "text/plain"}),
  });
}
