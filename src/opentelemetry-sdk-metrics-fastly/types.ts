/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { PushMetricExporter } from "@opentelemetry/sdk-metrics";

export type FastlyMetricReaderOptions = {
  exporter: PushMetricExporter,
};
