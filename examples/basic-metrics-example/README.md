# Basic Example of OpenTelemetry Metrics on Compute@Edge

This is an example of using [@fastly/compute-js-opentelemetry](https://github.com/fastly/compute-js-opentelemetry),
an implementation of the [OpenTelemetry JavaScript API](https://opentelemetry.io/docs/instrumentation/js/) for
Compute@Edge.

> :warning: As of this writing, this demo may not be able to successfully send data to the OpenTelemetry Collector Demo. See [here](../../README.md#metrics) for details.

## Run the example

You will need [Node.js](https://nodejs.org/en/) (>= 16) and [Fastly CLI](https://developer.fastly.com/reference/cli/)
(>= 2.x recommended, may work with 1.x).

This example will export metrics to a local instance of an
[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/).

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
cd examples/basic-tracing-example
yarn
fastly compute build
```

To run this example locally:

```shell
fastly compute serve
```

TODO: If you would like to deploy this to Fastly, then you will have to make modifications.

## Description

This simple example shows the instantiation of the following objects:

* **OTLPMetricExporter**  
    an OpenTelemetry Metric Exporter adapted for use in a Compute@Edge handler.

* **FastlyMetricReader**  
    an OpenTelemetry Metric Reader adapted for use in a Compute@Edge handler.

* **FastlySDK**  
    an optional class that simplifies the initialization and coordination of the
    OpenTelemetry objects.

* **DiagConsoleLogger** (@opentelemetry/api)  
    standard logger that outputs debug messages to the console.

Beyond this, this is a basic Compute@Edge JavaScript application. A `fetch` handler
is registered using the `addEventListener()` function, which receives an `event` object.
The application responds by running `handleRequest`, which takes the event object and
generates a `Response` object (or Promise that resolves to one).

Additionally, this example application will count the number of requests that were
made to it. To do this, it needs to import the `metrics` object exported from
`@opentelemetry/api-metrics`. It obtains a meter named `my-meter` from the
default meter provider, then creates a [Counter](https://opentelemetry.io/docs/reference/specification/metrics/api/#counter)
named `requests`. It then adds 1 to the counter, along with the path as an attribute.
The metric queued for sending to the backend, and is sent when the application lifecycle ends.

Note that all the initialization of OpenTelemetry can be kept completely separate from
the application logic, by placing it in a separate file (the `./telemetry.js` file in
this example).
