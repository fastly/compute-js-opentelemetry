# OpenTelemetry Diagnostics Logger for Fastly Compute@Edge named log providers

This module provides a diagnostics logger that logs to a
[Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).

## Installation

```bash
npm install --save @fastly/compute-js-opentelemetry
```

## Usage

```javascript
import { DiagFastlyLogger } from '@fastly/compute-js-opentelemetry/diag-fastly-logger';

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  // Note that this can only be used when processing requests,
  // not during build-time initialization. 
  diag.info('Message');
  /* ... additional code ... */
}
```
