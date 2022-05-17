/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { FastlyBackendFetchInstrumentation } from "./instrumentation";

export function patchRuntime(target: FastlyBackendFetchInstrumentation) {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init) => {
    if ((init as any)?.excludeFromTelemetry) {
      return await origFetch(resource, init);
    }
    return await target.onBackendFetch(resource, init, async (resource: RequestInfo, init: RequestInit | undefined) => {
      return await origFetch(resource, init);
    });
  };
}
