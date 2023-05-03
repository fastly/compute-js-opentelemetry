# OpenTelemetry Trace SDK Fastly Compute@Edge

This module provides a Span Processor, a Tracer Provider, and a Context Manager for use
with OpenTelemetry in Fastly Compute@Edge.

## Notes

`FastlySpanProcessor` will batch all the spans that are generated
during its lifetime and submit them when `forceFlush()` or `shutdown()` are called.
This is intended for use with `OTLPTraceExporter` exported by
`@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend`, as
every Fastly Compute@Edge invocation has a limited number of backend fetches that
it may perform.

`FastlyTracerProvider` is a basic `TracerProvider` implementation based on
`BasicTracerProvider`, but uses `FastlyStackContextManager` (described below)
as its default Context Manager implementation.

`FastlyStackContextManager` relies on the fact that
Compute@Edge applications only ever have a single FetchEvent, as entirely new
containers are spun up for every request. Thus, it's safe to globally set the
current "fetch event span" context and allow the context manager to fall back to
that when an event is active. 
