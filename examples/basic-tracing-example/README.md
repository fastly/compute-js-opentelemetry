# Basic Example of OpenTelemetry Instrumentation and Tracing on Fastly Compute

This is an example of using [@fastly/compute-js-opentelemetry](https://github.com/fastly/compute-js-opentelemetry),
an implementation of the [OpenTelemetry JavaScript API](https://opentelemetry.io/docs/instrumentation/js/) for
Compute.

## Run the example

You will need [Node.js](https://nodejs.org/en/) (>= 18) and [Fastly CLI](https://developer.fastly.com/reference/cli/)
(>= 9.x).

This example will export traces to a local instance of an
[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/). It has been tested with
[OpenTelemetry Collector Demo](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/examples/demo).

First, build `compute-js-opentelemetry`.

Clone `fastly/compute-js-opentelemetry` and build it:

```shell
git clone https://github.com/fastly/compute-js-opentelemetry.git
cd compute-js-opentelemetry
npm install
npm run build
```

Next, move to this subdirectory, and build this example:

```shell
cd examples/basic-tracing-example
npm install
fastly compute build
```

To run this example locally:

```shell
fastly compute serve
```

TODO: If you would like to deploy this to Fastly, then you will have to make modifications.

## Description

This simple example shows the instantiation of the following objects:

* **OTLPTraceExporter**  
    an OpenTelemetry Trace Exporter adapted for use in a Compute handler.

* **FastlySDK**  
    an optional class that simplifies the initialization and coordination of
    OpenTelemetry objects. 

* **DiagConsoleLogger** (@opentelemetry/api)  
    standard logger that outputs debug messages to the console.

The following objects are implicitly instantiated:

* **FastlyStackContextManager** (by `FastlySDK`)  
    a rudimentary Context Manager that provides context. Although this does not currently
    support asynchronous context stacks, it is able to associate all traces created to
    the current fetch event.

* **FastlyTraceProvider** (by `FastlySDK`)  
    a Trace Provider that associates the trace exporter with a default context
    manager.

* **FastlyComputeJsInstrumentation** (by `getComputeJsAutoInstrumentations`)  
  an OpenTelemetry instrumentation that generates traces for the
  Compute lifecycle.

As **FastlyComputeJsInstrumentation** is active, OpenTelemetry will also automatically create spans to
trace the following events:

* `fetchevent` - traces the lifetime of the FetchEvent, from the time it is first passed in
  to the listener, until the time its result value (`Response` or `Error`) is determined.
  This means that if a promise is passed to `event.respondWith`, then this will include the time
  it takes until that promise is settled.

* `listener fn` - traces the lifetime of the application-provided listener function,
  from the time it is called to the time it returns. Note that this can return early if it returns
  a promise.

* `event.respondWith` - traces the call to the framework function `event.respondWith`,
  from the time it is called to the time it returns. Note that this can return before the
  full `Response` is generated, if the application passes in a promise.

These events occur in nested contexts, setting the active context at each event. Therefore,
the `my-span` span created in the application code happens as a child span of the `listener fn`
span.

Beyond this, this is a basic Compute JavaScript application. A `fetch` handler
is registered using the `addEventListener()` function, which receives an `event` object.
The application responds by running `handleRequest`, which takes the event object and
generates a `Response` object (or Promise that resolves to one).

During this time, this example application wants to add its own tracing data.
To do this, it only needs to import the `context` and `trace` objects exported from
`@opentelemetry/api`. It obtains a tracer named `basic-tracing-example` from the
default tracer provider, then starts a span named `my-span`. It creates a new context
with the span active, adds an event at the start of the span, spends a few milliseconds in a loop,
and then finally adds an event at the end of the context. After exiting the context, the application
ends the span, causing the tracer to queue the trace to the backend. The trace is finally
sent when the application lifecycle ends.

Note that all the initialization of OpenTelemetry can be kept completely separate from
the application logic, by placing it in a separate file (the `./telemetry.js` file in
this example).
