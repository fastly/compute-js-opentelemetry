# OpenTelemetry Metrics SDK Fastly Compute

This module provides a Metric Reader for use
with OpenTelemetry in Fastly Compute.

## Notes

`FastlyMetricReader` will batch all the metrics read from a metric
provider and submit them when `forceFlush()` or `shutdown()` are called.
As Compute cannot keep state from one invocation to another, this is
the only practical way to send metrics.
