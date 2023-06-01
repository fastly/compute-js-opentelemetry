/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { env } from "fastly:env";

import {
  DEFAULT_ENVIRONMENT,
  ENVIRONMENT,
} from '@opentelemetry/core';

/**
 * Gets environment variables.
 * In Compute@Edge, we cannot use environment variables, so
 * this simply returns the default values as defined by
 * OpenTelemetry.
 */
export function getEnv(): Required<ENVIRONMENT> {
  return Object.assign(
    {
      HOSTNAME: env('FASTLY_HOSTNAME'),
    },
    DEFAULT_ENVIRONMENT,
  );
}
