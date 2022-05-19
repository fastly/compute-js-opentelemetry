/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from "@opentelemetry/api";
import { FastlyBackendFetchInstrumentation } from "./instrumentation";

export function patchRuntime(target: FastlyBackendFetchInstrumentation) {
  diag.debug('instrumentation-fastly-backend-fetch: running patchRuntime()');

  diag.debug('instrumentation-fastly-backend-fetch: patching runtime');
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init) => {
    if ((init as any)?.excludeFromTelemetry) {
      return await origFetch(resource, init);
    }
    diag.debug('instrumentation-fastly-backend-fetch: running patched fetch()');
    return await target.onBackendFetch(resource, init, async (resource: RequestInfo, init: RequestInit | undefined) => {
      diag.debug('instrumentation-fastly-backend-fetch: calling original fetch()');
      return await origFetch(resource, init);
    });
  };
}
