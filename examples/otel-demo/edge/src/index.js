/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter as OTLPTraceExporterLogger } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";
import { OTLPTraceExporter as OTLPTraceExporterBackend } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { FastlyJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-js";

const IS_LOCAL = fastly.env.get('FASTLY_HOSTNAME') === 'localhost';

const OTEL_BACKEND_NAME = 'otel-collector';
const OTEL_HTTP_PROXY_ENDPOINT = 'otel-http-proxy';

// Instantiate instrumentations.
const instrumentations = [
  // Generates traces for Compute@Edge lifetime events.
  new FastlyJsInstrumentation(),
];

// Identify our service
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'otel-demo-edge',
  [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'JavaScript',
  [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: 'opentelemetry',
  [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: '1.2.0',
  [SemanticResourceAttributes.HOST_NAME]: fastly.env.get('FASTLY_HOSTNAME'),
});

const textMapPropagator = new W3CTraceContextPropagator();

// Start OpenTelemetry
const sdk = new FastlySDK({
  instrumentations,
  resource,
  textMapPropagator,
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

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {

  // Get the client request.
  let req = event.request;

  let url = new URL(req.url);

  const headers = Object.assign({}, req.headers);

  let backend;
  let requestUrl;
  if(url.pathname === '/json') {
    backend = 'httpbin';
    requestUrl = 'https://httpbin.org/json';
  } else {
    const configDict = new Dictionary('config');
    const appengineUrl = new URL(url.pathname, configDict.get('APPENGINE_URL'));
    backend = 'appengine';
    requestUrl = String(appengineUrl);
    headers['host'] = appengineUrl.hostname;
  }

  const beReq = new Request(requestUrl, { headers, redirect: "error" });
  try {
    const res = await fetch(beReq, { backend });
    return new Response(res.body, { headers: res.headers, status: res.status });
  } catch(ex) {
    return new Response('Failed?!', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

}
