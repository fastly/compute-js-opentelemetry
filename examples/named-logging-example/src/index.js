//! Default Compute@Edge template program.                                                                                                                                                                                                                                                                                                                                 

/// <reference types="@fastly/js-compute" />                                                                                                                                                                                                                                                                                                                               
import './tracing.js';
import { context, trace } from "@opentelemetry/api";

function doTask() {
  // Waste a few milliseconds
  let total = 0;
  for (let x = 0; x < 200000; x++) {
    total += x;
  }
}

async function handleRequest(event) {
  // Get the client request.                                                                                                                                                                                                                                                                                                                                               
  let req = event.request;

  // Filter requests that have unexpected methods.                                                                                                                                                                                                                                                                                                                         
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return new Response("This method is not allowed", {
      status: 405,
    });
  }

  const tracer = trace.getTracerProvider()
    .getTracer('my-tracer');

  const mySpan = tracer.startSpan('my-task');
  context.with(trace.setSpan(context.active(), mySpan), () => {
    doTask();
  });

  mySpan.end();

  const backendResponse = await fetch('https://httpbin.org', { backend: 'httpbin'});
  const data = await backendResponse.text();
  return new Response(data.length, {
    status: 200,
    Headers: {
      'Content-Type': 'text/plain',
      'X-Test-Header': 'test'
    },
  });
}

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
