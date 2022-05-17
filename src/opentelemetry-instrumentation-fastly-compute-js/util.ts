/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { FastlyComputeJsInstrumentation } from "./instrumentation";

export function patchRuntime(target: FastlyComputeJsInstrumentation) {
  const origAddEventListener = globalThis.addEventListener;
  globalThis.addEventListener = ( type, listener ) => {

    const patchedListener = (event: FetchEvent) => {

      // noinspection JSIgnoredPromiseFromCall
      target.onEvent(event, () => {

        // This inner function returns a promise that represents the lifetime of a FetchEvent,
        // as it roughly corresponds to the time between the start of handling an incoming event
        // and when the Response to be sent back is determined.

        // The event is instantiated by the framework just before it calls the app-provided
        // listener function. The listener function is expected to build a Response
        // (or a promise that resolves to a Response) and then it must synchronously call
        // event.respondWith with that value.

        // If the listener function builds the entire Response, then this promise resolves
        // with the Response value.

        // If the listener instead passes a promise to event.respondWith, then that promise
        // is awaited until it resolves, and then this promise is resolved with that value.

        // In either case, this promise fully resolves before the original event.respondWith
        // sees the resolved Response value.

        // If the listener function throws an error, or if event.respondWith is not called,
        // throws an error, or if a promise is passed to it which eventually rejects, then
        // this promise will reject with that value.

        // The promise that represents the lifetime of the event
        let eventResolve: (obj: Response | PromiseLike<Response>) => void;
        let eventReject: (obj: any) => void;
        const eventPromise = new Promise<Response>((resolve, reject) => {
          eventResolve = resolve;
          eventReject = reject;
        })
          .catch(error => {
            throw error instanceof Error ? error : new Error(error);
          });

        // Flag to check that event.respondWith has been called.
        let respondWithHasBeenCalled = false;

        const origRespondWith = event.respondWith;
        event.respondWith = (response) => {

          respondWithHasBeenCalled = true;

          // In this patched event.respondWith method, we create a new proxy promise to pass
          // to the original function that settles after the eventPromise has been settled.

          const responseProxy = new Promise<Response>((resolve, reject) => {

            // This two-layered then is necessary, as we must allow the eventPromise to
            // completely resolve before letting the original event.respondWith process the
            // Response value.

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

          // Make sure that by the time we return from listener(),
          // event.respondWith has been called.
          if(!respondWithHasBeenCalled) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('event.respondWith has not been called.');
          }
        } catch(ex) {
          eventReject!(ex);
          throw ex;
        }

        return eventPromise;
      });

    };

    origAddEventListener.call( null, type, patchedListener );
  };
}
