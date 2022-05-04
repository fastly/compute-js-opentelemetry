/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { FastlySDK } from "./FastlySDK";

let _target: FastlySDK | null = null;

export function patchRuntime() {
  const origAddEventListener = globalThis.addEventListener;
  globalThis.addEventListener = ( type, listener ) => {

    const patchedListener = (event: FetchEvent) => {

      const origRespondWith = event.respondWith;
      event.respondWith = (response) => {
        Promise.resolve(response)
          .finally(() => _target != null ? event.waitUntil(_target.shutdown()) : (void 0));
        origRespondWith.call(event, response);
      };

      listener(event);
    };

    origAddEventListener.call( null, type, _target != null ? patchedListener : listener);
  };
}

export function setPatchTarget(target: FastlySDK) {
  _target = target;
}
