/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, trace, context, propagation, Context, Span, SpanKind, SpanStatusCode, } from "@opentelemetry/api";

import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import { AttributeNames } from './enums/AttributeNames';
import { patchRuntime } from "./util";

interface EventContext {
  fetchEventSpan: Span;
  fetchEventSpanContext: Context;
}

export class FastlyJsInstrumentation extends InstrumentationBase<unknown> {

  readonly component: string = 'fastly-js';
  readonly version: string = '1';
  
  readonly moduleName = this.component;
  
  _eventsInstalled?: boolean;
  _eventsEnabled?: boolean;

  _eventsContextMap: WeakMap<FetchEvent, Partial<EventContext>>;
  
  constructor(config: InstrumentationConfig = {}) {
    super('@fastly/compute-js-opentelemetry/instrumentation-fastly-js', '0.1.0', config);

    this._eventsContextMap = new WeakMap<FetchEvent, EventContext>();
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

  getEventContext(event: FetchEvent): Partial<EventContext> {
    let eventContext = this._eventsContextMap.get(event);
    if(eventContext == null) {
      eventContext = {};
      this._eventsContextMap.set(event, eventContext);
    }
    return eventContext;
  }

  deleteEventContext(event: FetchEvent) {
    this._eventsContextMap.delete(event);
  }

  async onBackendFetch(resource: RequestInfo, init: RequestInit | undefined, fn: (resource: RequestInfo, init: RequestInit | undefined) => Promise<Response>): Promise<Response> {
    if(!this._eventsEnabled) {
      return await fn(resource, init);
    }
    const backendFetchSpan = this.tracer.startSpan('Backend Fetch', {
      kind: SpanKind.CLIENT,
    });
    const backendFetchContext = trace.setSpan(context.active(), backendFetchSpan);
    const carrier = {};
    propagation.inject(backendFetchContext, carrier);
    return context.with(backendFetchContext, async () => {
      const options = { ...(init ?? {}) };
      options.headers = Object.assign({}, init?.headers, carrier);
      try {
        return await fn(resource, options);
      } finally {
        backendFetchSpan.end();
      }
    });
  }

  // Start of the lifetime of a single FetchEvent.
  // This is the first opportunity we have of doing anything in the
  // c@e request lifecycle.
  onEventStart(event: FetchEvent) {
    if(!this._eventsEnabled) {
      return;
    }
    try {
      diag.debug('onEventStart start');

      const eventContext = this.getEventContext(event);

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

      eventContext.fetchEventSpan = fetchEventSpan;
      eventContext.fetchEventSpanContext = trace.setSpan(context.active(), fetchEventSpan);

    } finally {
      diag.debug('onEventStart end');
    }
  }

  // Event result determined. Receives the response, or the error if event threw.
  // This is the final opportunity we have of doing anything meaningful.
  onEventResult(event: FetchEvent, result: Response | Error) {
    if(!this._eventsEnabled) {
      return;
    }
    try {
      diag.debug('onEventResult start');

      const eventContext = this.getEventContext(event);

      const { fetchEventSpan } = eventContext;
      if (fetchEventSpan != null) {

        if(result instanceof Error) {

          fetchEventSpan.recordException(result);
          fetchEventSpan.setStatus({
            code: SpanStatusCode.ERROR,
          });

        } else {

          fetchEventSpan.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, result.status);
          fetchEventSpan.setStatus({
            code: SpanStatusCode.OK,
          });

        }

        fetchEventSpan.end();
        delete eventContext.fetchEventSpan;
      }

      this.deleteEventContext(event);

    } finally {
      diag.debug('onEventResult end');
    }
  }

  // Event has ended.
  // This is the FINAL opportunity we have of doing anything
  // in the c@e request lifecycle. Usually not too useful since
  // the event is probably no longer active.
  onEventEnd(event: FetchEvent) {
    if(!this._eventsEnabled) {
      return;
    }
    try {
      diag.debug('onEventEnd start');

    } finally {
      diag.debug('onEventEnd end');
    }
  }

  // Wraps the execution of the listener callback that is registered with the `fetch` event.
  onListener(event: FetchEvent, fn: () => void) {
    if(!this._eventsEnabled) {
      fn();
      return;
    }
    try {
      diag.debug('onListener start');

      const eventContext = this.getEventContext(event);

      const theSpan = this.tracer.startSpan(
        'listener fn', {
          kind: SpanKind.INTERNAL,
        },
        eventContext.fetchEventSpanContext
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

  // Wraps the calling of event.respondWith. Receives the response or promise that resolves to the response.
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
