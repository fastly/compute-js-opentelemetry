# OpenTelemetry SDK for Fastly Compute

This package provides the full OpenTelemetry SDK for Fastly Compute including tracing and metrics.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";

import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend";
import { OTLPMetricExporter } from "@fastly/compute-js-opentelemetry/exporter-metrics-otlp-fastly-backend";
import { FastlyMetricReader } from "@fastly/compute-js-opentelemetry/sdk-metrics-fastly";
import { getComputeJsAutoInstrumentations } from "@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js";

// Identify our service.
// It will be named 'test-service'.
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'test-service',
});

// Instantiate a trace exporter.
const traceExporter = new OTLPTraceExporter({
  backend: 'test_backend'
});

// Instantiate a metric exporter.
const meterExporter = new OTLPMetricExporter({
  backend: 'test_backend',
});
// Instantiate a metric reader.
const metricReader = new FastlyMetricReader({
  exporter: meterExporter,
});

// Instantiate instrumentations.
const instrumentations = [
  getComputeJsAutoInstrumentations(),
];

// Specify the resource, trace exporter, metric reader, and/or instrumentations when instantiating the SDK
const sdk = new FastlySDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations,
});

// Start the SDK.
await sdk.start();
```

`FastlySDK` simplifies the procedure of wiring up the trace exporter, span processor,
metrics exporter, instrumentations, and context manager, as well as identifying the service as a resource.
It also automatically initiates shutdown of the tracer and meter providers at the
end of the event, and extends the lifetime of the event to wait until pending data has completed
exporting.

## Constructor

The options sent to the constructor is an object that specifies the following values.

| Key                | Value                                                                                                                                                                         |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `traceExporter`    | (optional) Specifies the trace exporter to use with the API. A `BatchSpanProcessor` instance is created and associated with the trace exporter, then registered with the API. |
| `spanProcessor`    | (optional) The span processor to register with the API. If provided, then `traceExporter` is ignored.                                                                         |
| `metricReader`     | (optional) The metric reader to register with the API. If not provided, then no meter provider will be registered, and the application will not be able to send metrics.      |
| `contextManager`   | The context manager to use with the API. If not provided, a `FastlyStackContextManager` instance is created and used.                                                         | 
| `instrumentations` | An optional array of instrumentations to register.                                                                                                                            |
| `resource`         | The resource to associate with the tracer provider and meter provider. If not provided, then an unnamed resource is used.                                                     |

> NOTE: If neither `spanProcessor` nor `traceExporter` are provided, then no trace provider will be registered, and the application will not be able to send traces.

After instantiating the SDK, it is necessary to call `start()` on it.

## Methods

### `start(transformFunc?: (config: ConfigObject, event: FetchEvent) => ConfigObject): Promise<void>`

**NOTE**: May be called with an optional `transformFunc` argument. See [Transform function](#transform-function) below for details.

Starts the SDK based on the configuration object that had been provided to the constructor:

* Configures and instantiates the tracer provider, based on the span processor or trace exporter specified in 
the configuration object, if any, and registers it with the OpenTelemetry API. If a resource is specified, it is
also associated with the tracer provider.

* Configures and instantiates the meter provider, based on the metric reader specified in the configuration object,
if any, and registers it with the OpenTelemetry API. If a resource is specified, it is also associated with the meter
provider.

* Registers and starts instrumentations specified in the configuration object.

* Registers the `shutdown()` function to be called before each request's lifetime ends, so that any pending traces
can be sent before the worker shuts down.

**NOTE**: It is necessary to call this function asynchronously _before_ you call `addEventListener()` to define your
entry point.

**Example**. The following code shows the use of `start()` to initialize the SDK:

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

This is useful if you need to use features that are not available during application initialization,
such as to obtain values from [Dictionaries](https://developer.fastly.com/learning/compute/javascript/#using-edge-dictionaries)
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

**Example**. The following code shows the use of this mode to retrieve values from a Dictionary for the initialization
of an `OTLPTraceExporter` instance:

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
    traceExporter: new OTLPTraceExporter({
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

* If a meter provider was started by this SDK, then initiates shutdown on that meter provider. 

Returns a promise that represents all the shutdown processes that were initiated.
This promise is intended to be passed into `event.waitUntil()`. 
