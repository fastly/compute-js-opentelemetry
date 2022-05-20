/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from "@opentelemetry/api";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { FastlyComputeJsInstrumentation } from "../opentelemetry-instrumentation-fastly-compute-js";
import { FastlyBackendFetchInstrumentation } from "../opentelemetry-instrumentation-fastly-backend-fetch";

const InstrumentationMap = {
  '@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js': FastlyComputeJsInstrumentation,
  '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch': FastlyBackendFetchInstrumentation,
};
type InstrumentationName = keyof typeof InstrumentationMap;

// Infer the Config argument type from the first argument of the constructor of each instrumentation
type ConfigArg<T> = T extends new (...args: infer U) => unknown ? U[0] : never;

export type InstrumentationConfigMap = {
  [Name in InstrumentationName]?: ConfigArg<typeof InstrumentationMap[Name]>;
};

export function getComputeJsAutoInstrumentations(configs: InstrumentationConfigMap = {}): Instrumentation[] {

  for (const name of Object.keys(configs)) {
    if (!(name in InstrumentationMap)) {
      diag.error(`Provided instrumentation name "${name}" not found`);
    }
  }

  const instrumentations: Instrumentation[] = [];
  for(const name of Object.keys(InstrumentationMap) as InstrumentationName[]) {
    const Instance = InstrumentationMap[name];

    const instanceConfig = configs[name] ?? {};
    if (instanceConfig.enabled === false) {
      diag.debug(`Disabling instrumentation for ${name}`);
      continue;
    }

    instrumentations.push(new Instance(instanceConfig));
  }

  return instrumentations;
}
