/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from "@opentelemetry/api";
import { FastlyBackendFetchInstrumentation } from "./instrumentation";
import { onInit } from "../core";

let _target!: FastlyBackendFetchInstrumentation;

export function patchRuntime() {
  diag.debug('instrumentation-fastly-backend-fetch: running patchRuntime()');

  diag.debug('instrumentation-fastly-backend-fetch: patching runtime');
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init) => {
    if(_target == null || !_target._eventsEnabled || (init as any)?.excludeFromTelemetry) {
      return await origFetch(resource, init);
    }
    diag.debug('instrumentation-fastly-backend-fetch: running patched fetch()');
    return await _target.onBackendFetch(resource, init, async (resource: RequestInfo, init: RequestInit | undefined) => {
      diag.debug('instrumentation-fastly-backend-fetch: calling original fetch()');
      return await origFetch(resource, init);
    });
  };
}

onInit(() => {
  (_target as any) = null;
});

export function setPatchTarget(target: FastlyBackendFetchInstrumentation) {
  _target = target;
}
