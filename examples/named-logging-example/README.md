# Basic Example of OpenTelemetry Instrumentation and Tracing on Compute using a Fastly Named Log Provider

This is a very simple demo of capturing trace data using a Fastly named log provider. This demo has been tested with the New Relic OTLP logging endpoint

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
cd examples/named-logging-example
npm install
fastly compute build
```

To run this example locally:

```shell
fastly compute serve
```
## Configuring your service

This demo assumes you have added a Fastly Log Streaming endpoint, named `my-fastly-otlp`, to a named logging provider that supports OTLP.

This demo also assumes you have added a backend named `httpbin`.
