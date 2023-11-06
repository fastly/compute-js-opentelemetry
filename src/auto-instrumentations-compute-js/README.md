# OpenTelemetry Meta Package for JavaScript on Fastly Compute

Provides a simple way to initialize multiple Fastly Compute instrumentations.

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

Automatically loads instrumentations for Compute JavaScript.

Custom configuration for each of the instrumentations can be passed to the function, by providing an object with the name of the instrumentation as a key, and its configuration as the value.

```javascript
import { getComputeJsAutoInstrumentations } from '@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js';

const instrumentations = [
  getComputeJsAutoInstrumentations({
    // Provide custom configuration for Fastly backend fetch instrumentation
    '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch': {
      applyCustomAttributesOnSpan: (span) => {
        span.setAttribute('foo', 'bar');
      },
    },
  }),
];

// Specify the instrumentations instantiating the SDK
import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
const sdk = new FastlySDK({
  instrumentations,
});
await sdk.start();

// or, manually register instrumentations
import { registerInstrumentations } from '@opentelemetry/instrumentation';
registerInstrumentations({
  instrumentations,
});
```

## Supported instrumentations

- [@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js](../opentelemetry-instrumentation-fastly-compute-js)
- [@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch](../opentelemetry-instrumentation-fastly-backend-fetch)
