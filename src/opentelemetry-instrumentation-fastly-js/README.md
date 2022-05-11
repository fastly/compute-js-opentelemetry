# OpenTelemetry Fastly Compute@Edge instrumentation

This module provides instrumentations that generate traces for the Compute@Edge JavaScript application lifecycle.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { FastlyJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-js";

// Specify the instrumentations instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  instrumentations: [
    new FastlyJsInstrumentation(),
  ],
});
await sdk.start();

// or, manually register instrumentations.
registerInstrumentations({
  instrumentations: [
    new FastlyJsInstrumentation(),
  ],
});
```

## Events

These instrumentations create spans for the following lifecycle events.

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

* `Backend Fetch` - traces a call to `fetch()` made to a backend, from the time it is called
  to the time it returns. This span is a CLIENT span and propagates the current trace and span
  information, so that the backend will be given the ability to add further child spans.

These events occur in nested contexts, setting the active context at each event. Therefore,
the spans that occur in the body of the listener function created in the application code
happens as a child span of the `listener fn` span.
