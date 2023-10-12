/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import './telemetry.js';
import { context, trace } from "@opentelemetry/api";

function doTask() {
  // Waste a few milliseconds
  let total = 0;
  for (let x = 0; x < 200000; x++) {
    total += x;
  }
}

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(_event: FetchEvent) {
  const tracer = trace.getTracerProvider()
    .getTracer('my-tracer-ts');

  const mySpan = tracer.startSpan('my-task');
  context.with(trace.setSpan(context.active(), mySpan), () => {
    doTask();
  });
  mySpan.end();

  return new Response('OK', {
    status: 200,
    headers: new Headers({"Content-Type": "text/plain"}),
  });
}
