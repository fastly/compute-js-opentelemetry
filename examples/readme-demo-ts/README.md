# README demo for OpenTelemetry for Compute@Edge JavaScript in TypeScript

This is the demo in the [README.md](../../README.md) of the library.

> NOTE: This example is identical to the README demo for Fastly Compute,
> except that its source files are in TypeScript. It is meant to illustrate
> the use of this library with TypeScript.

## Run the example

You will need [Node.js](https://nodejs.org/en/) (>= 18) and [Fastly CLI](https://developer.fastly.com/reference/cli/)
(>= 9.0.3).

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
cd examples/readme-demo-ts
npm install
npm run build
```

To run this example locally:

```shell
npm run serve
```
