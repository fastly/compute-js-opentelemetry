# OpenTelemetry Metrics SDK Fastly Compute@Edge

This module provides a Tracer Provider and Context Manager for use
with OpenTelemetry in Fastly Compute@Edge.

This module is intended to be extended by other modules and not directly by
user code.

## Notes

The Fastly Stack Context Manager in this module relies on the fact that
Compute@Edge applications only ever have a single FetchEvent, as entirely new
containers are spun up for every request. Thus, it's safe to globally set the
current "fetch event span" context and allow the context manager to fall back to
that when an event is active. 
