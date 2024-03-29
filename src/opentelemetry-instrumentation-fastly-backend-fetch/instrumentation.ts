/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, trace, context, propagation, SpanKind, SpanStatusCode, } from '@opentelemetry/api';

import { InstrumentationBase, safeExecuteInTheMiddle } from '@opentelemetry/instrumentation';
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
} from '@opentelemetry/semantic-conventions';

import { headersToObject, patchRuntime, setPatchTarget, unPatchRuntime } from './util.js';
import { AttributeNames } from './enums/AttributeNames.js';
import { FastlyBackendFetchInstrumentationConfig } from './types.js';
import { onInit, onShutdown } from '../core/index.js';

onInit(() => {
  patchRuntime();
});

onShutdown(() => {
  unPatchRuntime();
});

export class FastlyBackendFetchInstrumentation extends InstrumentationBase<unknown> {

  readonly component: string = '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch';
  readonly version: string = '1';
  
  readonly moduleName = this.component;
  declare _eventsInstalled: boolean;
  declare _eventsEnabled: boolean;

  constructor(config: FastlyBackendFetchInstrumentationConfig = {}) {
    super('@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch', '0.1.0', config);
  }

  private _getConfig(): FastlyBackendFetchInstrumentationConfig {
    return this._config;
  }

  init() {}

  override enable() {
    if(!this._eventsInstalled) {
      setPatchTarget(this);
      this._eventsInstalled = true;
    }
    this._eventsEnabled = true;
  }
  
  override disable() {
    this._eventsEnabled = false;
  }

  // This event wraps the lifetime of a single backend fetch, or `fetch()` made to a backend, from the time it is called
  // to the time it returns.
  async onBackendFetch(resource: RequestInfo | URL, init: RequestInit | undefined, fn: (resource: RequestInfo | URL, init: RequestInit | undefined) => Promise<Response>): Promise<Response> {
    try {
      diag.debug('onBackendFetch start');
      const url = resource instanceof Request ? resource.url : String(resource);
      const backendFetchSpan = this.tracer.startSpan('Backend Fetch', {
        kind: SpanKind.CLIENT,
        attributes: {
          [AttributeNames.COMPONENT]: this.moduleName,
          [SEMATTRS_HTTP_METHOD]: init?.method ?? 'GET',
          [SEMATTRS_HTTP_URL]: url,
        },
      });
      const backendFetchContext = trace.setSpan(context.active(), backendFetchSpan);
      const carrier = {};
      propagation.inject(backendFetchContext, carrier);
      return context.with(backendFetchContext, async () => {
        const options = {
          ...(init ?? {}),
          headers: ({
            ...(init?.headers ? headersToObject(init.headers) : {}),
            ...carrier
          }),
        };
        try {
          let result: Response;
          try {
            result = await fn(resource, options);

            if (this._getConfig().applyCustomAttributesOnSpan) {
              safeExecuteInTheMiddle(
                () =>
                  this._getConfig().applyCustomAttributesOnSpan!(
                    backendFetchSpan,
                    resource,
                    options,
                    result
                  ),
                () => {},
                true
              );
            }

            backendFetchSpan.setAttribute(SEMATTRS_HTTP_STATUS_CODE, result.status);
            backendFetchSpan.setStatus({
              code: SpanStatusCode.OK,
            });

          } catch(ex) {

            backendFetchSpan.recordException(ex instanceof Error ? ex : String(ex));
            backendFetchSpan.setStatus({
              code: SpanStatusCode.ERROR,
            });

            throw ex;
          }
          return result;
        } finally {
          backendFetchSpan.end();
        }
      });
    } finally {
      diag.debug('onBackendFetch end');
    }
  }
}
