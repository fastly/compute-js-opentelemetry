# OpenTelemetry HTTP Collector Proxy

An example Node.js Express application that listens for traces sent to it over a Fastly named log provider
that sends data over HTTPS, re-emitting them to an OpenTelemetry collector.

## Introduction

When a Compute@Edge application (or VCL service) running on Fastly generates OpenTelemetry traces,
it can emit them using the OTLP (OpenTelemetry Protocol) format. Emitting them using Fastly's
[real-time log streaming](https://docs.fastly.com/en/guides/about-fastlys-realtime-log-streaming-features)
is a performant, ideal method for doing this.

Because Fastly named log providers do not currently have direct integration with the OTLP format,
this collector proxy can be set up as a log provider that sends data over HTTPS. This proxy will, in turn,
send those traces to a configured OpenTelemetry collector.

As an HTTPS log provider, this application simply separates these entries at newlines, and, treating
each entry as a OTLP JSON-encoded trace, sends them to the OpenTelemetry Collector.

## Requirements

You need [Node.js](https://nodejs.org/) 16.x or newer.

You will need to run this application at an endpoint that is publicly visible, as it will
be receiving traces from a program running at your Fastly service.

You will also need an OpenTelemetry collector that will receive the traces that will
receive the traces that are re-emitted by this application.

This demo has been tested against the
[OpenTelemetry Collector Demo](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/examples/demo).

For testing purposes, you may run it on your local machine and make it publicly available
by using a reverse proxy tool such as [ngrok](https://ngrok.com).

## Running the application

1. Configure the app.

Copy `sample.env` to `.env` and make changes. Each key that is not given a
value receives the default value listed below.

| Variable                   | Description                                             | Default                           |
|----------------------------|---------------------------------------------------------|-----------------------------------|
| `PORT`                     | The port at which to run this application               | `3001`                            |
| `OTEL_HTTP_COLLECTOR_URL`  | The trace collection URL of the OpenTelemetry collector | `http://localhost:4318/v1/traces` |

2. Install dependencies.

```shell
yarn
```

3. Run the application.

```shell
yarn start
```

## Use with Compute@Edge local test server

Note that it is **not** possible to use this proxy to collect traces from an application running under the [Compute@Edge local
test server](https://developer.fastly.com/learning/compute/testing/#running-a-local-testing-server).

This is because when named log endpoints are used on the local test server, output is emitted to stdout instead of being
sent to an actual log provider.
