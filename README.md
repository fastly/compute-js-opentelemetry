## OpenTelemetry for JavaScript on Compute@Edge

An implementation of the [OpenTelemetry JavaScript API](https://opentelemetry.io/docs/instrumentation/js/) for
[Fastly Compute@Edge](https://developer.fastly.com/learning/compute/).

This implementation extends the standard interfaces and objects provided by the
OpenTelemetry [JavaScript API](https://github.com/open-telemetry/opentelemetry-js-api) and
[SDK](https://github.com/open-telemetry/opentelemetry-js), adapting them for use on the Fastly Compute@Edge platform.

Whereas OpenTelemetry would separate each concern into its own `npm` package,
we provide our components as a single package with multiple exports.

| **Export Name**                                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|----------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `@fastly/compute-js-opentelemetry/opentelemetry-sdk-fastly`                      | A utility library that simplifies the initialization and coordination of OpenTelemetry components in use with a Compute@Edge JavaScript application.                                                                                                                                                                                                                                                                                                     |
| `@fastly/compute-js-opentelemetry/opentelemetry-instrumentation-fastly-js`       | An [instrumentation](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/glossary.md#instrumentation-library) implementation that generates traces for the Compute@Edge application lifecycle.                                                                                                                                                                                                                         |
| `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend`            | An [exporter](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/exporter-guide.md) implementation that exports traces using the [OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format [over a Fastly backend](https://developer.fastly.com/learning/compute/javascript/#communicating-with-backend-servers-and-the-fastly-cache).                      |
| `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger`             | An [exporter](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/exporter-guide.md) implementation that exports traces using the [OTLP/HTTP JSON](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/otlp.md#otlphttp) format [over a Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).                                                                  |
| `@fastly/compute-js-opentelemetry/diag-fastly-logger`                            | A [DiagLogger](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/diaglogger.html) implementation that logs to a [Fastly named log provider](https://developer.fastly.com/learning/integrations/logging).                                                                                                                                                                                                                                  |
| `@fastly/compute-js-opentelemetry/webpack-helpers`                               | A utility library that provides settings needed for use by [Webpack](https://webpack.js.org) as used by the build process of the Compute@Edge JavaScript application. Provides the shims and polyfills needed by the OpenTelemetry libraries.                                                                                                                                                                                                            |
| `@fastly/compute-js-opentelemetry/opentelemetry-sdk-trace-fastly` (Internal Use) | A utility library that provides a [Tracer Provider](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/tracerprovider.html) and [Context Manager](https://open-telemetry.github.io/opentelemetry-js-api/interfaces/contextmanager.html) implementations for use with a Compute@Edge JavaScript application. Currently not different than `@opentelemetry/sdk-trace-web`, but in progress to improve experience with asynchronous contexts. |
| `@fastly/compute-js-opentelemetry/otlp-exporter-fastly-base` (Internal Use)      | A base class for exporters, containing common code used by `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend` and `@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger`.                                                                                                                                                                                                                                               |

## API

For a description of each module and the APIs that they expose, see the [`src`](./src) directory.

## Webpack

Compute@Edge JavaScript applications are
[compiled as a web worker using Webpack](https://developer.fastly.com/learning/compute/javascript/#module-bundling) as
part of their build process. The Compute@Edge starter kit contains a Webpack configuration file
that sets reasonable defaults for a starting point application.

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
make the appropriate modifications yourself. See the [webpack-helpers/index.ts](./src/webpack-helpers/index.ts) file for
details.

## Examples

See the examples in the [`/examples`](./examples) directory.

| **Example Directory**                     | Description   |
|-------------------------------------------|---------------|
| [basic-example](./examples/basic-example) | Basic Example |


## Issues

If you encounter any non-security-related bug or unexpected behavior, please [file an issue][bug]
using the bug report template.

[bug]: https://github.com/fastly/compute-js-opentelemetry/issues/new?labels=bug

### Security issues

Please see our [SECURITY.md](./SECURITY.md) for guidance on reporting security-related issues.

## License

[MIT](./LICENSE).
