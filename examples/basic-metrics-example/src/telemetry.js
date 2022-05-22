/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, DiagLogLevel, DiagConsoleLogger } from "@opentelemetry/api";

import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPMetricExporter } from "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-backend";
import { FastlyMetricReader } from "@fastly/compute-js-opentelemetry/sdk-metrics-fastly";

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Instantiate a metric exporter.
// "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-backend" sends metrics data to the named
// backend, using the OTLP format. Be sure to specify the backend name in addition to the URL.
// URL defaults to 'http://localhost:4318/v1/metrics' if not provided.
const meterExporter = new OTLPMetricExporter({
  backend: 'test_backend',
});

// A metric exporter needs to be connected to a metric reader.
// FastlyMetricReader will batch the metrics collected during a single
// invocation of your application and send it to the metric exporter
// at the end of the application's life cycle.
const metricReader = new FastlyMetricReader({
  exporter: meterExporter,
});

// Identify our service.
// It will be named "basic-metrics-example" in traces.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'basic-metrics-example',
});

// FastlySDK simplifies the procedure of wiring up the trace exporter, span processor,
// metrics exporter, instrumentations, and context manager, as well as giving the service a name.
// It also automatically initiates shutdown of the tracer and meter providers at the
// end of the event, and extends the lifetime of the event to wait until pending data has completed
// exporting.
const sdk = new FastlySDK({
  metricReader,
  resource,
});

await sdk.start();
