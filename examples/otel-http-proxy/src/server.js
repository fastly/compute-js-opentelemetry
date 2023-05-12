/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import 'dotenv/config';
import fetch from "node-fetch";
import express from "express";
import bodyParser from 'body-parser';

const COLLECTION_TIMEOUT_MS = 3000;

const app = express();

const traceTimers = {};
const spansByTrace = {};
const logsByTrace = {};

app.use(bodyParser.text({ type: "*/*", limit: 32768 }));

app.use(async (req, res, next) => {
  console.log(req.method, req.url, req.headers['user-agent'], req.headers['content-length']);
  next();
})

app.get("/.well-known/fastly/logging/challenge", (req, res) => {
  console.log('Answering challenge');
  res.end("*");
});

app.post("/", async (req, res) => {
  const lines = req.body.split('\n').filter(x => !!x);
  console.log('Handling POST ' + req.url, req.headers['content-length'], lines.length);
  lines.forEach(async(line) => {
    const data = JSON.parse(line);
    let traceId;
    if (data.resourceSpans) {
      traceId = data.resourceSpans[0].scopeSpans[0].spans[0].traceId;
      if (!spansByTrace[traceId]) spansByTrace[traceId] = []
      spansByTrace[traceId].push(data);
      console.log(" - Saved trace data", traceId);
    } else if (data.resourceLogs) {
      traceId = data.resourceLogs[0].instrumentationLibraryLogs[0].logRecords[0].traceId;
      if (!logsByTrace[traceId]) logsByTrace[traceId] = []
      logsByTrace[traceId].push(...data.resourceLogs[0].instrumentationLibraryLogs[0].logRecords);
      console.log(" - Saved log data", traceId);
    }
    if (traceTimers[traceId]) clearTimeout(traceTimers[traceId]);
    traceTimers[traceId] = setTimeout(() => processTrace(traceId), COLLECTION_TIMEOUT_MS);
  });
  res.status(204).end("");
});

let port = null;
try {
  port = parseInt(process.env.PORT ?? "3001", 10);
} catch(ex) {
  console.warn("Cannot parse PORT, ignoring.")
  port = null;
}
app.listen(port ?? 3001, '0.0.0.0', () => console.log(`Server up at port ${port}`));

const processTrace = async (traceId) => {
  console.log("Aggregating log data for trace", traceId);
  (logsByTrace[traceId] ?? []).forEach(log => {
    console.log(" - Looking at log", log.body.stringValue);
    spansByTrace[traceId].find(spanData => {
      const spans = spanData.resourceSpans[0].scopeSpans[0].spans;
      console.log("   - Looking at spans", spans.map(s => s.spanId));
      const span = spans.find(s => s.spanId === log.spanId);
      if (span) {
        span.events = [...(span.events || []), {
          timeUnixNano: log.timeUnixNano,
          name: log.body.stringValue,
          attributes: log.attributes
        }];
        console.log("     - Attached log to span", log.spanId, log.body.stringValue, span.name);
        return true;
      }
      return false;
    });
  });
  await Promise.all((spansByTrace[traceId] ?? []).map(async traceData => {
    const url = process.env.OTEL_HTTP_COLLECTOR_URL;
    const body = JSON.stringify(traceData);
    const resp = await fetch(url, {
      method: 'post',
      body,
      headers: {
        "content-type": "application/json"
      }
    });
    const data = await resp.text();
    console.log("Processed: ", traceId, data, body);
  }));
  delete spansByTrace[traceId];
  delete logsByTrace[traceId];
  delete traceTimers[traceId];
  console.log("Completed trace", traceId);
}

