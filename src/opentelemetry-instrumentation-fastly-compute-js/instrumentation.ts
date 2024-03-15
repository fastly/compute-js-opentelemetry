/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag, trace, context, propagation, Context, Span, SpanKind, SpanStatusCode, } from '@opentelemetry/api';

import {
  SEMATTRS_HTTP_HOST,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_SCHEME,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
} from '@opentelemetry/semantic-conventions';
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import { AttributeNames } from './enums/AttributeNames.js';
import { patchRuntime, setPatchTarget, unPatchRuntime } from './util.js';
import { _resetEventContext, _setEventContext } from '../opentelemetry-sdk-trace-fastly/index.js';
import { onInit, onShutdown } from '../core/index.js';

onInit(() => {
  patchRuntime();
});
onShutdown(() => {
  unPatchRuntime();
});

export class FastlyComputeJsInstrumentation extends InstrumentationBase<unknown> {

  readonly component: string = '@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js';
  readonly version: string = '1';
  
  readonly moduleName = this.component;
  declare _eventsInstalled: boolean;
  declare _eventsEnabled: boolean;

  _fetchEventSpan?: Span;
  _fetchEventContext?: Context;

  constructor(config: InstrumentationConfig = {}) {
    super('@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js', '0.1.0', config);
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

  // This event marks the beginning of the lifetime of a single FetchEvent.
  // This is the absolute earliest that this event can be trapped.
  onEventStart(event: FetchEvent) {
    try {
      diag.debug('onEventStart start');

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

      this._fetchEventSpan = this.tracer.startSpan('FetchEvent', {
        kind: SpanKind.SERVER,
        attributes: {
          [AttributeNames.COMPONENT]: this.moduleName,
          [SEMATTRS_HTTP_METHOD]: event.request.method,
          [SEMATTRS_HTTP_URL]: event.request.url,
        },
      }, parentContext);

      try {
        const url = new URL(event.request.url);
        this._fetchEventSpan.setAttribute(SEMATTRS_HTTP_HOST, url.host);
        this._fetchEventSpan.setAttribute(
          SEMATTRS_HTTP_SCHEME,
          url.protocol.replace(':', '')
        );
      } catch(ex) {
        // if result.url happens to not parse correctly then
        // don't bother with this
      }

      // Set the root context on the context manager to this event.
      this._fetchEventContext = trace.setSpan(context.active(), this._fetchEventSpan);
      _setEventContext(this._fetchEventContext);

    } finally {
      diag.debug('onEventStart end');
    }
  }

  // This event marks the end of the lifetime of a single FetchEvent, corresponding to the time when
  // the Response to be sent back is determined. This is the last opportunity we have of doing anything in the
  // c@e request lifecycle.
  onEventEnd(err: Error | null, response?: Response) {
    try {
      diag.debug('onEventEnd start');

      try {
        /* istanbul ignore if */
        if(this._fetchEventSpan == null) {
          diag.error('onEventEnd: unexpected FetchEvent span is null');
          return;
        }
        try {
          if(err != null) {
            this._fetchEventSpan.recordException(err);
            this._fetchEventSpan.setStatus({
              code: SpanStatusCode.ERROR,
            });
          } else {
            this._fetchEventSpan.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response!.status);
            this._fetchEventSpan.setStatus({
              code: SpanStatusCode.OK,
            });
          }
        } finally {
          this._fetchEventSpan.end();
        }
      } finally {
        // Reset the root event on the context manager.
        _resetEventContext();
      }

    } finally {
      diag.debug('onEventEnd end');
    }
  }

  // This event wraps the call to the app-provided listener function that is registered
  // with the 'fetch' event.
  onListener(event: FetchEvent, fn: () => void) {
    try {
      diag.debug('onListener start');

      const theSpan = this.tracer.startSpan(
        'listener fn', {
          kind: SpanKind.INTERNAL,
        },
        this._fetchEventContext
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
