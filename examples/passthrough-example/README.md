# Passthrough example demo for OpenTelemetry for JavaScript on Fastly Compute

This is a very simple demo of passing a request to a backend, making a small change to the response, and returning it,
meanwhile capturing the trace data.

## Run the example

You will need [Node.js](https://nodejs.org/en/) (>= 18) and [Fastly CLI](https://developer.fastly.com/reference/cli/)
(>= 9.x recommended).

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
cd examples/readme-demo
npm install
fastly compute build
```

To run this example locally:

```shell
fastly compute serve
```
