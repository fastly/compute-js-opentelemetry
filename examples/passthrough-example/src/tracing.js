/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

import { FastlySDK } from '@fastly/compute-js-opentelemetry/sdk-fastly';
import { OTLPTraceExporter } from '@fastly/compute-js-opentelemetry/exporter-trace-otlp-fastly-backend';
import { getComputeJsAutoInstrumentations } from '@fastly/compute-js-opentelemetry/auto-instrumentations-compute-js';

const sdk = new FastlySDK({
  traceExporter: new OTLPTraceExporter({ backend: 'otlp-collector' }),
  instrumentations: [ getComputeJsAutoInstrumentations(), ],
  resource: new Resource({ [SEMRESATTRS_SERVICE_NAME]: 'my-fastly-service', }),
});
await sdk.start();
