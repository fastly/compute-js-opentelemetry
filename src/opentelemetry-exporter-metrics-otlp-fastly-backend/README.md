# OpenTelemetry Metrics Exporter for Fastly Compute@Edge backends

This module provides a metrics exporter that exports metrics using the
[OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format
[over a Fastly backend](https://developer.fastly.com/learning/compute/javascript/#communicating-with-backend-servers-and-the-fastly-cache).

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { OTLPMetricExporter } from "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-backend";

// Instantiate a metric exporter.
// "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-backend" sends metrics data to the named
// backend, using the OTLP format. Be sure to specify the backend name in addition to the URL.
// URL defaults to 'http://localhost:4318/v1/metrics' if not provided.
const metricExporter = new OTLPMetricExporter({
  backend: 'test_backend'
});

// Attach the exporter to a metric reader.
// For Fastly Compute@Edge, use FastlyMetricReader which collects metrics
// for a single invocation and submits them at the end of the invocation.
const metricReader = new FastlyMetricReader({
  exporter: metricExporter,
});

// Specify the metricReader when instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  metricReader,
});
await sdk.start();

// or, register it with the API directly
import { metrics } from '@opentelemetry/api-metrics';
metrics.setGlobalMeterProvider(meterProvider);
```
