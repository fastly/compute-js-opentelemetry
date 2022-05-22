# OpenTelemetry Metrics Exporter for Fastly Compute@Edge named log providers

This module provides a metrics exporter that exports metrics using the
[OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format
[over a Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { OTLPMetricExporter } from "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-logger";

// Instantiate a metric exporter.
// "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-logger" sends metrics data to the named
// log provider, using the OTLP format. Be sure to specify the log provider, rather than a URL.
const metricExporter = new OTLPMetricExporter({
  backend: 'test_logger'
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
