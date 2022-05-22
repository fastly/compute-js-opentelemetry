/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from "@opentelemetry/api";
import { addFetchEventAction, onInit } from "../core";
import { FastlyComputeJsInstrumentation } from "./instrumentation";

let _target!: FastlyComputeJsInstrumentation;

onInit(() => {
  (_target as any) = null;
  addFetchEventAction(10, event => {
    if(_target == null) {
      return;
    }
    diag.debug('instrumentation-fastly-compute-js: running listener');

    diag.debug('instrumentation-fastly-compute-js: calling event.onEventStart()');
    _target.onEventStart(event);
    diag.debug('instrumentation-fastly-compute-js: returned from event.onEventStart()');

    diag.debug('instrumentation-fastly-compute-js: patching event.respondWith()');
    const origRespondWith = event.respondWith;
    event.respondWith = (response) => {
      // Only do this patchwork on the first call to event.respondWith().
      // event.respondWith() can only be called once on a single event.
      if((event as any).__instrumentation_compute_js_respondWith_called) {
        diag.warn('instrumentation-fastly-compute-js: detected multiple calls to respondWith() on a single event');
        diag.debug('instrumentation-fastly-compute-js: calling previous event.respondWith()');
        origRespondWith.call(event, response);
        return;
      }
      (event as any).__instrumentation_compute_js_respondWith_called = true;

      diag.debug('instrumentation-fastly-compute-js: running patched event.respondWith()');

      Promise.resolve(response)
        .then(value => {
          diag.debug('instrumentation-fastly-compute-js: calling onEventEnd with Response');
          _target.onEventEnd(null, value);
          diag.debug('instrumentation-fastly-compute-js: returned from onEventEnd');
        }, error => {
          diag.debug('instrumentation-fastly-compute-js: calling onEventEnd with Error');
          _target.onEventEnd(error instanceof Error ? error : new Error(error));
          diag.debug('instrumentation-fastly-compute-js: returned from onEventEnd');
        });

      // We want to pass a proxy Promise to the original event.respondWith(),
      // which will settle after the eventPromise has been settled.
      diag.debug('instrumentation-fastly-compute-js: creating proxy response promise');
      const responseProxy = new Promise<Response>((resolve, reject) => {
        Promise.resolve(response)
          .then(value => {
            diag.debug('instrumentation-fastly-compute-js: proxy response promise resolved');
            resolve(value);
          }, value => {
            diag.debug('instrumentation-fastly-compute-js: proxy response promise rejected');
            reject(value);
          });
      });

      diag.debug('instrumentation-fastly-compute-js: calling onRespondWith handler with proxy response promise');
      _target.onRespondWith(event, responseProxy, (response) => {
        diag.debug('instrumentation-fastly-compute-js: calling previous event.respondWith() with proxy response promise');
        origRespondWith.call(event, response);
      });
      diag.debug('instrumentation-fastly-compute-js: returned from onRespondWith handler');
    };

  });
});

export function patchRuntime() {
  diag.debug('instrumentation-fastly-compute-js: patching runtime');

  diag.debug('instrumentation-fastly-compute-js: patching addEventListener()');
  const origAddEventListener = globalThis.addEventListener;
  globalThis.addEventListener = ( type, listener ) => {
    diag.debug('instrumentation-fastly-compute-js: running patched addEventListener()');

    diag.debug('instrumentation-fastly-compute-js: patching listener fn');
    const patchedListener = async (event: FetchEvent) => {
      if(_target == null) {
        diag.debug('instrumentation-fastly-compute-js: calling previous listener fn');
        listener(event);
        return;
      }
      diag.debug('instrumentation-fastly-compute-js: running patched listener fn');

      try {
        diag.debug('instrumentation-fastly-compute-js: calling onListener handler');
        _target.onListener(event, () => {
          diag.debug('instrumentation-fastly-compute-js: calling previous listener fn');
          listener(event);
        });
        diag.debug('instrumentation-fastly-compute-js: returned from onListener handler');
      } catch(error) {
        // Even though this listener crashed, there may be others pending, so we just warn about
        // this error and keep going.
        diag.warn('instrumentation-fastly-compute-js: detected exception from onListener handler');
        throw error;
      }
    };

    diag.debug('instrumentation-fastly-compute-js: registering patched listener fn');
    origAddEventListener.call( null, type, patchedListener );
  };
}

export function setPatchTarget(target: FastlyComputeJsInstrumentation) {
  _target = target;
}
