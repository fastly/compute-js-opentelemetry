/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

import { FastlySDK } from '@fastly/compute-js-opentelemetry/sdk-fastly';
import { getComputeJsAutoInstrumentations } from '@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js';
import { OTLPTraceExporter } from "@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-logger";

const sdk = new FastlySDK({
  traceExporter: new OTLPTraceExporter({ endpoint: 'my-fastly-otlp'}),
  instrumentations: [ getComputeJsAutoInstrumentations(), ],
  resource: new Resource({ [SEMRESATTRS_SERVICE_NAME]: 'named-logging-example' }),
});
await sdk.start();
