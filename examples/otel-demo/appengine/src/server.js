/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import 'dotenv/config';
import './tracing.js';

import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';

import openTelemetry, { defaultTextMapSetter } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core"

const URLS = {
  'Profile data': String(new URL('/json', process.env.EDGE_APP_URL ?? 'http://localhost:7676/')),
  'Flags': "https://httpbin.org/json",
  'Ad data': "https://accounts.google.com/.well-known/openid-configuration",
  'Articles API': "https://httpbin.org/headers",
  'Partner content API': "https://serverless-architecture.io/keynotes/",
}

const app = express();

app.get('/__health', (_req, res) => res.end('OK'));

app.get("*", async (req, res) => {
  console.log('Request: ' + req.url, req.headers);
  const reqHandlerContext = openTelemetry.context.active();

  // Example custom spans
  const tracer = openTelemetry.trace.getTracer("Backend stuff");
  await Promise.all(Object.entries(URLS).map(async ([label, url]) => {
    const span = tracer.startSpan(label);

    // https://github.com/open-telemetry/opentelemetry-js/issues/1963
    const fetchContext = openTelemetry.trace.setSpan(reqHandlerContext, span);
    await openTelemetry.context.with(fetchContext, async () => {
      const propagator = new W3CTraceContextPropagator();
      const carrier = {};

      // https://github.com/open-telemetry/opentelemetry-js/issues/2458
      propagator.inject(fetchContext, carrier, defaultTextMapSetter);
      console.log(carrier);
      const options = { headers: carrier };
      await fetch(url, options).then(resp => resp.text());
    });
    span.end();
  }));

  res.end("OK!");
});

let port = null;
try {
  port = parseInt(process.env.PORT ?? "3000", 10);
} catch(ex) {
  console.warn("Cannot parse PORT, ignoring.")
  port = null;
}
app.listen(port ?? 3000, '0.0.0.0', () => console.log(`Server up at port ${port}`));
