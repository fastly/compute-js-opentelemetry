/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import './telemetry.js';
import { metrics } from '@opentelemetry/api';

// Standard Compute JavaScript entry point
addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {

  // Get a meter.
  const meter = metrics.getMeterProvider()
    .getMeter('my-meter');

  // Create a counter.
  const requestCount = meter.createCounter("requests", {
    description: "Count all incoming requests"
  });

  // Increment the counter, passing the path as an attribute.
  const url = new URL(event.request.url);
  const path = url.pathname;
  requestCount.add(1, { route: path });

  return new Response('OK', {
    status: 200,
    headers: new Headers({"Content-Type": "text/plain"}),
  });
}
