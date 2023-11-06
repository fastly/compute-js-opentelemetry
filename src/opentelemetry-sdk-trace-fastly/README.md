# OpenTelemetry Trace SDK for Fastly Compute

This module provides a Tracer Provider and a Context Manager for use with OpenTelemetry
on Fastly Compute.

## Notes

`FastlyTracerProvider` is a basic `TracerProvider` implementation based on
`BasicTracerProvider`, but uses `FastlyStackContextManager` (described below)
as its default Context Manager implementation.

`FastlyStackContextManager` relies on the fact that
Compute applications only ever have a single FetchEvent, as entirely new
containers are spun up for every request. Thus, it's safe to globally set the
current "fetch event span" context and allow the context manager to fall back to
that when an event is active. 
