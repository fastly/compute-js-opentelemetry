/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { FastlyBackendFetchInstrumentation } from './instrumentation.js';
import { onShutdown } from '../core/index.js';

let _origFetch: typeof globalThis.fetch;
let _target!: FastlyBackendFetchInstrumentation;

export function patchRuntime() {
  diag.debug('instrumentation-fastly-backend-fetch: running patchRuntime()');

  diag.debug('instrumentation-fastly-backend-fetch: patching runtime');
  _origFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init) => {
    if(_target == null || !_target._eventsEnabled || (init as any)?.excludeFromTelemetry) {
      return await _origFetch(resource, init);
    }
    diag.debug('instrumentation-fastly-backend-fetch: running patched fetch()');
    return await _target.onBackendFetch(resource, init, async (resource: RequestInfo | URL, init: RequestInit | undefined) => {
      diag.debug('instrumentation-fastly-backend-fetch: calling original fetch()');
      return await _origFetch(resource, init);
    });
  };
}

export function unPatchRuntime() {
  /* istanbul ignore else */
  if (_origFetch != null) {
    globalThis.fetch = _origFetch;
    (_origFetch as any) = null;
  }
}

onShutdown(() => {
  (_target as any) = null;
});

export function setPatchTarget(target: FastlyBackendFetchInstrumentation) {
  _target = target;
}

export function headersToObject(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries([...headers]);
  } else if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  } else {
    return headers;
  }
}
