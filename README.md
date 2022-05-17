## OpenTelemetry for JavaScript on Compute@Edge

An implementation of the [OpenTelemetry JavaScript API](https://opentelemetry.io/docs/instrumentation/js/) for
[Fastly Compute@Edge](https://developer.fastly.com/learning/compute/).

```javascript
/// <reference types="@fastly/js-compute" />

import { context, trace } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { FastlySDK } from "@fastly/compute-js-opentelemetry/sdk-fastly";
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";
import { FastlyJsInstrumentation } from "@fastly/compute-js-opentelemetry/instrumentation-fastly-js";

const sdk = new FastlySDK({
  traceExporter: new OTLPTraceExporter({ endpoint: 'otlp-logger' }),
  instrumentations: [ new FastlyJsInstrumentation(), ],
  resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: 'example-service', }),
});
await sdk.start();

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));
async function handleRequest(event) {
  const tracer = trace.getTracerProvider()
    .getTracer('example-tracer');

  const span = tracer.startSpan('my-span');
  context.with(trace.setSpan(context.active(), span), () => {
    try {
      trace.getSpan(context.active()).addEvent("start");
      
      // Do something
      performMainActivity();

      trace.getSpan(context.active()).addEvent("end");
    } finally {
      // End the span
      span.end();
    }
  });

  return new Response('OK', {
    status: 200,
    headers: new Headers({"Content-Type": "text/plain"}),
  });
}
```

This implementation extends the standard interfaces and objects provided by the
OpenTelemetry [JavaScript API](https://github.com/open-telemetry/opentelemetry-js-api) and
[SDK](https://github.com/open-telemetry/opentelemetry-js), adapting them for use on the Fastly Compute@Edge platform.

Whereas `opentelemetry-js` would separate each concern into its own `npm` package,
we provide our components as a single package with multiple exports.

The table below provides links to the documentation for each module. 

| **Module**                                                                                | **Export Name**                                                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                         |
|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Fastly OpenTelemetry SDK](./src/opentelemetry-sdk-fastly)                                | `@fastly/compute-js-opentelemetry/opentelemetry-sdk-fastly`                | A utility library that simplifies the initialization and coordination of OpenTelemetry components in use with a Compute@Edge JavaScript application.                                                                                                                                                                                                                                                                                |
| [Compute@Edge JavaScript instrumentations](./src/opentelemetry-instrumentation-fastly-js) | `@fastly/compute-js-opentelemetry/opentelemetry-instrumentation-fastly-js` | An [instrumentation](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/glossary.md#instrumentation-library) implementation that generates traces for the Compute@Edge application lifecycle.                                                                                                                                                                                                    |
| [Trace Exporter for Fastly backend](./src/exporter-trace-otlp-fastly-backend)             | `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend`      | An [exporter](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/exporter-guide.md) implementation that exports traces using the [OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format [over a Fastly backend](https://developer.fastly.com/learning/compute/javascript/#communicating-with-backend-servers-and-the-fastly-cache). |
| [Trace Exporter for Fastly named log provider](./src/exporter-trace-otlp-fastly-logger)   | `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger`       | An [exporter](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/exporter-guide.md) implementation that exports traces using the [OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format [over a Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).                                             |
| [Diagnostic Logger for Fastly named log provider](./src/diag-fastly-logger)               | `@fastly/compute-js-opentelemetry/diag-fastly-logger`                      | A [DiagLogger](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/diaglogger.html) implementation that logs to a [Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).                                                                                                                                                                                                             |
| [Webpack helpers](./src/webpack-helpers)                                                  | `@fastly/compute-js-opentelemetry/webpack-helpers`                         | A utility library that provides settings needed for use by [Webpack](https://webpack.js.org) as used by the build process of the Compute@Edge JavaScript application. Provides the shims and polyfills needed by the OpenTelemetry libraries.                                                                                                                                                                                       |
| [Trace SDK for Fastly](./src/opentelemetry-sdk-trace-fastly) (Internal Use)               | `@fastly/compute-js-opentelemetry/opentelemetry-sdk-trace-fastly`          | A utility library that provides a [Tracer Provider](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/tracerprovider.html) and [Context Manager](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/contextmanager.html) implementations for use with a Compute@Edge JavaScript application.                                                                                                           |
| [Trace Exporter Base](./src/otlp-exporter-fastly-base) (Internal Use)                     | `@fastly/compute-js-opentelemetry/otlp-exporter-fastly-base`               | A base class for exporters, containing common code used by `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend` and `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger`.                                                                                                                                                                                                                          |

## Examples

See the examples in the [`/examples`](./examples) directory.

| **Example Directory**                         | Description                                                                                                                                |
|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| [basic-example](./examples/basic-example)     | Basic Example                                                                                                                              |
| [otel-demo](./examples/otel-demo)             | Example that demonstrates OpenTelemetry traces that start at the Edge and nest into an operation at the backend.                           |
| [otel-http-proxy](./examples/otel-http-proxy) | A sample application designed to collect traces as an HTTPS log endpoint for a Fastly service, sending them to an OpenTelemetry collector. |

## Webpack

Compute@Edge JavaScript applications are
[compiled as a web worker using Webpack](https://developer.fastly.com/learning/compute/javascript/#module-bundling) as
part of their build process. The [Compute@Edge starter kit for JavaScript](https://github.com/fastly/compute-starter-kit-javascript-default)
contains a Webpack configuration file that sets reasonable defaults for a starting point application.

In order to use the OpenTelemetry packages that we rely on, additions need to be made to this configuration,
for example the addition of polyfills and shims. These changes are included in a helper module, `@fastly/compute-js-opentelemetry/webpack-helpers`,
so that they may be applied as such:

```javascript
const webpackHelpers = require("@fastly/compute-js-opentelemetry/webpack-helpers");

module.exports = {
  entry: "./src/index.js",
  /* ... other configuration */
};

// Add this line
module.exports = webpackHelpers.apply(module.exports);
```

You are not required to use this module, but if you do choose not to use it, you will have to
make the appropriate modifications yourself. See [webpack-helpers](./src/webpack-helpers) for
details.

## Notes

### Compatibility

Some `opentelemetry-js` modules are not currently compatible with Fastly Compute@Edge.
The table below is a non-comprehensive list of such components.

| **Component**                                                     | Package                                                                                                                             | Reason / Workaround                                                                                                                                                                                                                                        |
|-------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `BatchSpanProcessor`                                              | `@opentelemetry/sdk-trace-base`                                                                                                     | Relies on `setTimeout`. Use `SimpleSpanProcessor`.                                                                                                                                                                                                         |
| `NodeSDK`                                                         | `@opentelemetry/sdk-node`                                                                                                           | Relies on `BatchSpanProcessor` as well as platforms detectors that are incompatible with Compute@Edge. Use `FastlySDK`.                                                                                                                                    |
| `OTLPTraceExporter`                                               | `@opentelemetry/exporter-trace-otlp-http`                                                                                           | Relies on `http` and `https`, which are not available in Compute@Edge. Use `OTLPTraceExporter` from `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend` or `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger` instead. |
| `ZoneContextManager`                                              | `@opentelemetry/context-zone`<br />`@opentelemetry/context-zone-peer-dep`                                                           | Relies on `zone.js`, which is incompatible with Compute@Edge. Use `FastlyStackContextManager`.                                                                                                                                                             |
| `AsyncHooksContextManager`<br />`AsyncLocalStorageContextManager` | `@opentelemetry/context-async-hooks`                                                                                                | Relies on `async_hooks`, which is not available in Compute@Edge. Use `FastlyStackContextManager`.                                                                                                                                                          |
| Instrumentations included in `opentelemetry-js`                   | `@opentelemetry/instrumentation-*`<br />`@opentelemetry/auto-instrumentations-node`<br />`@opentelemetry/auto-instrumentations-web` | These rely on other frameworks and modules that are not compatible with Compute@Edge. Use `FastlyJsInstrumentation`.                                                                                                                                       |

## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/compute-js-opentelemetry/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](./SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](./LICENSE).
