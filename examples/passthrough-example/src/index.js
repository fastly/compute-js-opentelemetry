/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types='@fastly/js-compute' />
import './tracing.js';

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handleRequest(event) {
  const backendResponse = await fetch('https://httpbin.org/json', {
    backend: 'httpbin',
  });

  const data = await backendResponse.json();
  data.source = event.request.url;

  return new Response(JSON.stringify(data), {
    status: backendResponse.status,
    headers: backendResponse.headers,
  });
}

addEventListener('fetch', (event) => event.respondWith(handleRequest(event)));
