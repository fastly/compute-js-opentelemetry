# OpenTelemetry Collector Exporter for Fastly Compute@Edge backends

This module provides a collector exporter that exports traces using the
[OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format
[over a Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";

// Instantiate a trace exporter.
// "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger" sends trace data to the named
// log provider, using the OTLP format. Be sure to specify the log provider, rather than a URL.
const traceExporter = new OTLPTraceExporter({
  endpoint: 'test_logger'
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
