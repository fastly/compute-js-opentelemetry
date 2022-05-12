/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { FastlySDK } from "./FastlySDK";

let _target: FastlySDK | null = null;

// Patch event.respondWith to ensure that if the SDK has been started,
// then the SDK's shutdown method will be called automatically before
// the end of the event's lifetime.

addEventListener('fetch', (event) => {

  if(_target == null) {
    return;
  }

  // Allow the SDK to respond to the very first opportunity to react
  // after the listener starts.
  _target!.onEventStart(event);

  const origRespondWith = event.respondWith;
  event.respondWith = (response) => {

    // Create a promise to extend the life of this event.
    // Calling resolveExtension later will settle this promise
    // and allow the event's lifetime to end.
    let resolveExtension: () => void;
    let extension = new Promise<void>(resolve => {
      resolveExtension = resolve;
    });
    event.waitUntil(extension);

    origRespondWith.call(event, response);

    Promise.resolve(response)
      .finally(() => {
        // This ensures that target's shutdown is enqueued
        event.waitUntil(_target!.shutdown());
        resolveExtension!();
      });
  };

});

export function setPatchTarget(target: FastlySDK) {
  _target = target;
}
