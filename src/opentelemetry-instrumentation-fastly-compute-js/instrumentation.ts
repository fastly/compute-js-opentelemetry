/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, trace, context, propagation, SpanKind, SpanStatusCode, } from "@opentelemetry/api";

import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import { AttributeNames } from './enums/AttributeNames';
import { patchRuntime } from "./util";
import { _resetEventContext, _setEventContext } from "../opentelemetry-sdk-trace-fastly";

export class FastlyComputeJsInstrumentation extends InstrumentationBase<unknown> {

  readonly component: string = '@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js';
  readonly version: string = '1';
  
  readonly moduleName = this.component;
  
  _eventsInstalled?: boolean;
  _eventsEnabled?: boolean;

  constructor(config: InstrumentationConfig = {}) {
    super('@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js', '0.1.0', config);
  }

  init() {}

  override enable() {
    if(!this._eventsInstalled) {
      patchRuntime(this);
      this._eventsInstalled = true;
    }
    this._eventsEnabled = true;
  }
  
  override disable() {
    this._eventsEnabled = false;
  }

  // This event wraps the lifetime of a single FetchEvent, corresponding to the time between
  // the start of handling an incoming event and when the Response to be sent back is
  // determined.
  // This is the first and last opportunity we have of doing anything in the c@e request
  // lifecycle.
  async onEvent(event: FetchEvent, fn: () => Promise<Response>): Promise<void> {
    if(!this._eventsEnabled) {
      await fn();
      return;
    }
    try {
      diag.debug('onEvent start');

      const carrier: Record<string, string> = {};

      for (const field of propagation.fields()) {
        const value = event.request.headers.get(field);
        if(value != null) {
          carrier[field] = value;
          // Delete this so that if the main app tries to extract
          // propagation it will see nothing
          event.request.headers.delete(field);
        }
      }

      const parentContext = propagation.extract(context.active(), carrier);

      const fetchEventSpan = this.tracer.startSpan('FetchEvent', {
        kind: SpanKind.SERVER,
        attributes: {
          [AttributeNames.COMPONENT]: this.moduleName,
          [SemanticAttributes.HTTP_METHOD]: event.request.method,
          [SemanticAttributes.HTTP_URL]: event.request.url,
        },
      }, parentContext);

      try {
        const url = new URL(event.request.url);
        fetchEventSpan.setAttribute(SemanticAttributes.HTTP_HOST, url.host);
        fetchEventSpan.setAttribute(
          SemanticAttributes.HTTP_SCHEME,
          url.protocol.replace(':', '')
        );
      } catch(ex) {
        // if result.url happens to not parse correctly then
        // don't bother with this
      }

      // Set the root context on the context manager to this event.
      const fetchEventContext = trace.setSpan(context.active(), fetchEventSpan);
      _setEventContext(fetchEventContext);

      try {

        await context.with(fetchEventContext, async () => {
          try {

            const result = await fn();

            fetchEventSpan.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, result.status);
            fetchEventSpan.setStatus({
              code: SpanStatusCode.OK,
            });

          } catch(ex) {

            fetchEventSpan.recordException(ex);
            fetchEventSpan.setStatus({
              code: SpanStatusCode.ERROR,
            });

          } finally {
            fetchEventSpan.end();
          }
        });
      } finally {

        // Reset the root event on the context manager.
        _resetEventContext();
      }

    } finally {
      diag.debug('onEvent end');
    }
  }

  // This event wraps the call to the app-provided listener function that is registered
  // with the 'fetch' event.
  onListener(event: FetchEvent, fn: () => void) {
    if(!this._eventsEnabled) {
      fn();
      return;
    }
    try {
      diag.debug('onListener start');

      const theSpan = this.tracer.startSpan(
        'listener fn', {
          kind: SpanKind.INTERNAL,
        }
      );

      try {
        context.with(trace.setSpan(context.active(), theSpan), () => {
          fn();
        });
      } finally {
        theSpan.end();
      }

      return;
    } finally {
      diag.debug('onListener end');
    }
  }

  // This event wraps the call to event.respondWith from the app-provided listener function.
  // Receives the Response, or promise that resolves to the Response, built by the app.
  onRespondWith(event: FetchEvent, response: Response | Promise<Response>, fn: (response: Response | Promise<Response>) => void) {
    if(!this._eventsEnabled) {
      fn(response);
      return;
    }
    try {
      diag.debug('onRespondWith start');

      const theSpan = this.tracer.startSpan(
        'event.respondWith', {
          kind: SpanKind.INTERNAL,
        },
      );

      try {
        context.with(trace.setSpan(context.active(), theSpan), () => {
          fn(response);
        });
      } finally {
        theSpan.end();
      }

      return;
    } finally {
      diag.debug('onRespondWith end');
    }
  }
}
