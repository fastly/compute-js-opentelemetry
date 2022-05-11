# OpenTelemetry SDK for Fastly Compute@Edge

This package provides the full OpenTelemetry SDK for Fastly Compute@Edge including tracing and (in progress) metrics.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";

import { Resource } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { FastlyJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-js";

// Instantiate a trace exporter.
const traceExporter = new OTLPTraceExporter({
  backend: 'test_backend'
});

// Instantiate instrumentations.
const instrumentations = [
  // Generates traces for Compute@Edge lifetime events.
  new FastlyJsInstrumentation(),
];

// Identify our service
// It will be named "test-service" in traces.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'test-service',
});

// Specify trace exporters, instrumentations, and resource info when instantiating the SDK
const sdk = new FastlySDK({
  instrumentations: [
    new FastlyJsInstrumentation(),
  ],
});
await sdk.start();

// or, manually register instrumentations.
registerInstrumentations({
  traceExporter,
  instrumentations,
  resource,
});
```

`FastlySDK` simplifies the procedure of wiring up the trace exporter, span processor,
metrics exporter, instrumentations, and context manager, as well as giving the service a name.
It also automatically initiates shutdown of the tracer and meter providers at the
end of the event, and extends the lifetime of the event to wait until pending data has completed
exporting.

## Constructor

The options sent to the constructor is an object that receives the following values.

| Key                | Value                                                                                                                                                                                                                                                                                                                               |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `traceExporter`    | The trace exporter to use with the API. If provided, a `SimpleSpanProcessor` instance is created and associated with the trace exporter, then registered with the API. If neither `spanProcessor` nor `traceExporter` are provided, then no span processor will be registered, and the application will not be able to send traces. |
| `spanProcessor`    | The span processor to register with the API. If provided, then `traceExporter` is ignored. If neither `spanProcessor` nor `traceExporter` are provided, then no span processor will be registered, and the application will not be able to send traces.                                                                             |
| `contextManager`   | The context manager to use with the API. If not provided, a `FastlyStackContextManager` instance is created and used.                                                                                                                                                                                                               | 
| `instrumentations` | An optional array of instrumentations to register.                                                                                                                                                                                                                                                                                  |
| `resource`         | The resource to associate with the tracer provider. If not provided, then an unnamed resource is used.                                                                                                                                                                                                                              |

## Methods

### `start() => Promise<void>`

Starts the SDK based on the configuration object passed to the constructor.

Configures and instantiates the tracer provider based on the passed-in span processor or trace exporter,
and registers it with the API. Then, starts instrumentations.

Call this function asynchronously _before_ calling `addEventListener()` to define your
entry point.
