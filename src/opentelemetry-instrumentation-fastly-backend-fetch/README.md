# OpenTelemetry Fastly Backend Fetch instrumentation

This module provides an instrumentation that generate traces for performing `fetch()` calls to Fastly backends from a
Compute JavaScript application.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { FastlyBackendFetchInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch";

// Specify the instrumentations instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  instrumentations: [
    new FastlyBackendFetchInstrumentation(),
  ],
});
await sdk.start();

// or, manually register instrumentations.
registerInstrumentations({
  instrumentations: [
    new FastlyBackendFetchInstrumentation(),
  ],
});
```

## Events

This instrumentation creates spans for the following.

* `Backend Fetch` - traces a call to `fetch()` made to a backend, from the time it is called
  to the time it returns. This span is a CLIENT span and propagates the current trace and span
  information, so that the backend will be given the ability to add further child spans.
