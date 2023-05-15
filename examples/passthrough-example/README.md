# README demo for OpenTelemetry for Compute@Edge JavaScript

This is the demo in the [README.md](../../README.md) of the library.

## Run the example

You will need [Node.js](https://nodejs.org/en/) (>= 16) and [Fastly CLI](https://developer.fastly.com/reference/cli/)
(>= 2.x recommended, may work with 1.x).

This example will export traces to a local instance of an
[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/). It has been tested with
[OpenTelemetry Collector Demo](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/examples/demo).

First, build `compute-js-opentelemetry`.

Clone `fastly/compute-js-opentelemetry` and build it:

```shell
git clone https://github.com/fastly/compute-js-opentelemetry.git
cd compute-js-opentelemetry
yarn
yarn build
```

Next, move to this subdirectory, and build this example:

```shell
cd examples/readme-demo
yarn
fastly compute build
```

To run this example locally:

```shell
fastly compute serve
```
