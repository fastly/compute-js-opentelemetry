/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/// <reference types="@fastly/js-compute" />

import './tracing';

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
