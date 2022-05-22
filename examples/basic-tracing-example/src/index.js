/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import './telemetry';
import { context, trace } from "@opentelemetry/api";

// Standard Compute@Edge JavaScript entry point
addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest() {
  // Get a tracer.
  // Any spans made with this tracer will have the otel.library.name
  // value of "fastly-js-basic-tracing-example".
  const tracer = trace.getTracerProvider()
    .getTracer('fastly-js-basic-tracing-example');

  // Create a span.  This span will be created under the active context.
  // Since this function is running within the Compute@Edge lifetime,
  // the parent span will be the 'listener fn' span, provided by
  // "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js"
  const span1 = tracer.startSpan('my-span');
  context.with(trace.setSpan(context.active(), span1), () => {
    try {

      // Add event at start
      trace.getSpan(context.active())?.addEvent("start");

      // Waste a few milliseconds
      let total = 0;
      for (let x = 0; x < 200000; x++) {
        total += x;
      }

      // Add event at end, with attribute
      trace.getSpan(context.active())?.addEvent("end", { total });

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
