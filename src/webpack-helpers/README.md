# Webpack helpers for using OpenTelemetry libraries with Fastly Compute@Edge

## Usage

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
make the appropriate modifications yourself.

## Features that are enabled

### Top-level await

To enable `await sdk.start();` at the top level.

Top-level await support is planned to be allowed by default in the next version
of Webpack, and this can be removed at that time.

### Fix for `mainFields`

Since we are building for `webworker`, the default value for `mainFields` is
`['browser', 'module', 'main']`, but due to a bug in the current version of
some `opentelemetry-js` libraries, 'module' must be removed from this list.

A fix for this will be coming in the next release (>=0.29), and this can be
removed at that time.

### Shims / fallbacks / globals

In order to get opentelemetry libraries working, a number of shims and fallbacks
have been added to the environment.

* assert
* buffer
* stream
* timers
* util
* zlib

Additionally the following globals are made available.

* document - returns null
* performance - for timers
* process - for fake values of pid and version
