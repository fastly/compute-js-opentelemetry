# OpenTelemetry Fastly Compute Lifecycle instrumentation

This module provides an instrumentation that generate traces for the Compute JavaScript application lifecycle.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { FastlyComputeJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js";

// Specify the instrumentations instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  instrumentations: [
    new FastlyComputeJsInstrumentation(),
  ],
});
await sdk.start();

// or, manually register instrumentations.
registerInstrumentations({
  instrumentations: [
    new FastlyComputeJsInstrumentation(),
  ],
});
```

## Events

This instrumentation creates spans for the following lifecycle events.

* `FetchEvent` - traces the lifetime of the FetchEvent, from the time it is first passed in
  to the listener, until the time its result value (`Response` or `Error`) is determined.
  This means that if a promise is passed to `event.respondWith`, then this will include the time
  it takes until that promise is settled. This span is a SERVER span, and if a parent span is
  detected to be propagated into this request, then this span will be created as a child of that span.

* `listener fn` - traces the lifetime of the application-provided listener function,
  from the time it is called to the time it returns. Note that this can return early if it returns
  a promise.

* `event.respondWith` - traces the call to the framework function `event.respondWith`,
  from the time it is called to the time it returns. Note that this can return before the
  full `Response` is generated, if the application passes in a promise.

These events occur in nested contexts, setting the active context at each event. Therefore,
the spans that occur in the body of the listener function created in the application code
happens as a child span of the `listener fn` span.
