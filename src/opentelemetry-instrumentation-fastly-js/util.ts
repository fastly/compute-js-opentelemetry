/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { FastlyJsInstrumentation } from "./instrumentation";

export function patchRuntime(target: FastlyJsInstrumentation) {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init) => {
    return await target.onBackendFetch(resource, init, async (resource: RequestInfo, init: RequestInit | undefined) => {
      return await origFetch(resource, init);
    });
  };

  const origAddEventListener = globalThis.addEventListener;
  globalThis.addEventListener = ( type, listener ) => {

    const patchedListener = (event: FetchEvent) => {
      // Start of event's lifetime.
      target.onEventStart(event);

      const lifePromises: any[] = [];

      const origWaitUntil = event.waitUntil;
      event.waitUntil = (promise) => {
        lifePromises.push(promise);
        origWaitUntil.call(event, promise);
      }

      let eventResolve: (obj: Response | PromiseLike<Response>) => void;
      let eventReject: (obj: any) => void;
      new Promise<Response>((resolve, reject) => {
        eventResolve = resolve;
        eventReject = reject;
      })
        .catch(error => {
          return error instanceof Error ? error : new Error(error);
        })
        .then((result: Response | Error) => {
          // Result of event now known.
          target.onEventResult(event, result);

          // End of event's lifetime.
          Promise.all(lifePromises)
            .then(() => {
              target.onEventEnd(event);
            })
        });

      const origRespondWith = event.respondWith;
      event.respondWith = (response) => {
        // Create a new response that only resolves after the eventResolve / eventReject
        // have been hit.
        const responseProxy = new Promise<Response>((resolve, reject) => {
          Promise.resolve(response)
            .then(value => {
              eventResolve(value);
              return value;
            }, value => {
              eventReject(value);
              throw value;
            })
            .then(resolve, reject);
        });

        target.onRespondWith(event, responseProxy, (response) => {
          origRespondWith.call(event, response);
        });
      };

      try {
        target.onListener(event, () => {
          listener(event);
        });
      } catch(ex) {
        eventReject!(ex);
        throw ex;
      }
    };

    origAddEventListener.call( null, type, patchedListener );
  };
}
