# OpenTelemetry Trace Exporter for Fastly Compute backends

This module provides a collector exporter that exports traces using the
[OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format
[over a Fastly backend](https://developer.fastly.com/learning/compute/javascript/#communicating-with-backend-servers-and-the-fastly-cache).

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";

// Instantiate a trace exporter.
// "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend" sends trace data to the named
// backend, using the OTLP format. Be sure to specify the backend name in addition to the URL.
// URL defaults to 'http://localhost:4318/v1/traces' if not provided.
const traceExporter = new OTLPTraceExporter({
  url: 'https://your-collector.domain.com/v1/traces',
  backend: 'test_backend'
});

// Specify the traceExporter when instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  traceExporter,
});
await sdk.start();

// or, use it to manually create a span processor.
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
const spanProcessor = new SimpleSpanProcessor(traceExporter);
```

## Notes

The hostname of the collector URL you specify must also be registered as a backend on your Fastly service.

## Constructor

The options sent to the constructor is an object that receives the following values.

| Key                  | Value                                                                                                                                         |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `backend` (required) | The name of the Fastly backend to send traces to. You may use any backend defined on your service.                                            |
| `url`                | The URL to send traces to. The URL must correspond to the specified backend. If not specified, defaults to `http://localhost:4318/v1/traces`. |
| `compression`        | Describes the compression algorithm used to send traces. Valid values are `none` or `gzip`.                                                   | 
