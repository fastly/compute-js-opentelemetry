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
import { FastlyComputeJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js";
import { FastlyBackendFetchInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch";

// Instantiate a trace exporter.
const traceExporter = new OTLPTraceExporter({
  backend: 'test_backend'
});

// Instantiate instrumentations.
const instrumentations = [
  // Generates traces for Compute@Edge lifetime events.
  new FastlyComputeJsInstrumentation(),
  // Generates traces for Fastly backend fetch.
  new FastlyBackendFetchInstrumentation(),
];

// Identify our service
// It will be named "test-service" in traces.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'test-service',
});

// Specify trace exporters, instrumentations, and resource info when instantiating the SDK
const sdk = new FastlySDK({
  traceExporter,
  instrumentations,
  resource,
});
await sdk.start();
```

`FastlySDK` simplifies the procedure of wiring up the trace exporter, span processor,
metrics exporter, instrumentations, and context manager, as well as giving the service a name.
It also automatically initiates shutdown of the tracer and meter providers at the
end of the event, and extends the lifetime of the event to wait until pending data has completed
exporting.

## Constructor

The options sent to the constructor is an object that receives the following values.

| Key                | Value                                                                                                                                                                                                                                                                                                                                                                                                       |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `traceExporter`    | The trace exporter to use with the API. If provided, a `SimpleSpanProcessor` (or `FastlySpanProcessor`, if the trace provider uses a Fastly backend) instance is created and associated with the trace exporter, then registered with the API. If neither `spanProcessor` nor `traceExporter` are provided, then no span processor will be registered, and the application will not be able to send traces. |
| `spanProcessor`    | The span processor to register with the API. If provided, then `traceExporter` is ignored. If neither `spanProcessor` nor `traceExporter` are provided, then no span processor will be registered, and the application will not be able to send traces.                                                                                                                                                     |
| `contextManager`   | The context manager to use with the API. If not provided, a `FastlyStackContextManager` instance is created and used.                                                                                                                                                                                                                                                                                       | 
| `instrumentations` | An optional array of instrumentations to register.                                                                                                                                                                                                                                                                                                                                                          |
| `resource`         | The resource to associate with the tracer provider. If not provided, then an unnamed resource is used.                                                                                                                                                                                                                                                                                                      |

## Methods

### `start() => Promise<void>`

Starts the SDK based on the configuration object passed to the constructor:

* Configures and instantiates the tracer provider, based on the span processor or trace exporter specified in 
the configuration object, if any, and registers it with the OpenTelemetry API.

* Registers and starts instrumentations specified in the configuration object.

* Registers the `shutdown()` function to be called before each request's lifetime ends, so that any pending traces
can be sent before the worker shuts down.

**NOTE**: It is necessary to call this function asynchronously _before_ you call `addEventListener()` to define your
entry point.

```javascript
const sdk = new FastlySDK({
  traceExporter: new OTLPTraceExporterLogger({
    backend: 'otel-collector',
    url: 'https://otelcollector.your.app/v1/traces',
  }),
  instrumentations: [ new FastlyComputeJsInstrumentation(), new FastlyBackendFetchInstrumentation(), ],
  resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: 'example-service', }),
});
await sdk.start();

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(event) {
  /* ... */
}
```

#### Transform function

If you call `start()` without any parameters, then the SDK's startup steps occur right away,
during the build-time initialization of your application.

Alternatively, `start()` may be called with a transformation function as the first argument,
used to transform the configuration object immediately after the Fetch Event is received,
but before your listener function is called.

Signature: `start(transformFunc?: (config: ConfigObject, event: FetchEvent) => ConfigObject) => Promise<void>`

This is useful if you need to use features that are not available during application initialization,
such as to obtain values from [Edge Dictionaries](https://developer.fastly.com/learning/compute/javascript/#using-edge-dictionaries)
or to [perform logging](https://developer.fastly.com/learning/compute/javascript/#logging).

If you provide this function, then the SDK's actual startup is deferred until after request processing
has started. After each request is received, the transformation function is called with two
parameters: 1. the configuration object that was originally passed to the constructor; and 2. the
`FetchEvent` object for the current invocation. The value you return from this function is used as the
final configuration object, and the SDK is started.

**NOTE**: If you do provide this function, then keep in mind you are designating the code inside
the transform function, as well as the startup steps of the SDK, to run after request processing has started.
They will not be included in the pre-initialization of the resulting Wasm module, and instead will be
run on each request.

```javascript
const sdk = new FastlySDK({
  instrumentations: [ new FastlyComputeJsInstrumentation(), new FastlyBackendFetchInstrumentation(), ],
  resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: 'example-service', }),
});

await sdk.start((config, event) => {
  // At this point, request processing has started, so Dictionary can be used.
  const configDict = new Dictionary('config');
  return {
    ...config,
    traceExporter: new OTLPTraceExporterLogger({
      backend: configDict.get('OTLP_HTTP_COLLECTOR_BACKEND'),
      url: configDict.get('OTEL_HTTP_COLLECTOR_URL'),
    }),
  };
});

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(event) {
  /* ... */
}
```

### `shutdown(): Promise<void>`

**NOTE**: _When you call `start()`, this function is registered to be called automatically at the end of the
event's lifecycle. You should not call this function from your code._

Initiates shutdown:

* If a tracer provider was started by this SDK, then initiates shutdown on that tracer provider. 

Returns a promise that represents all the shutdown processes that were initiated.
This promise is intended to be passed into `event.waitUntil()`. 
