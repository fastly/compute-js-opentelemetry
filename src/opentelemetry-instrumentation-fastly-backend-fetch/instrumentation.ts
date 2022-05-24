/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, trace, context, propagation, SpanKind, SpanStatusCode, } from "@opentelemetry/api";

import { InstrumentationBase, safeExecuteInTheMiddle } from '@opentelemetry/instrumentation';
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

import { patchRuntime, setPatchTarget, unPatchRuntime } from "./util";
import { AttributeNames } from "./enums/AttributeNames";
import { FastlyBackendFetchInstrumentationConfig } from "./types";
import { onInit, onShutdown } from "../core";

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
  
  _eventsInstalled?: boolean;
  _eventsEnabled?: boolean;

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
  async onBackendFetch(resource: RequestInfo, init: RequestInit | undefined, fn: (resource: RequestInfo, init: RequestInit | undefined) => Promise<Response>): Promise<Response> {
    try {
      diag.debug('onBackendFetch start');
      const url = typeof resource === 'object' && 'url' in resource ? resource.url : resource;
      const backendFetchSpan = this.tracer.startSpan('Backend Fetch', {
        kind: SpanKind.CLIENT,
        attributes: {
          [AttributeNames.COMPONENT]: this.moduleName,
          [SemanticAttributes.HTTP_METHOD]: init?.method ?? 'GET',
          [SemanticAttributes.HTTP_URL]: url,
        },
      });
      const backendFetchContext = trace.setSpan(context.active(), backendFetchSpan);
      const carrier = {};
      propagation.inject(backendFetchContext, carrier);
      return context.with(backendFetchContext, async () => {
        const options = { ...(init ?? {}) };
        options.headers = Object.assign({}, init?.headers, carrier);
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

            backendFetchSpan.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, result.status);
            backendFetchSpan.setStatus({
              code: SpanStatusCode.OK,
            });

          } catch(ex) {

            backendFetchSpan.recordException(ex);
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
