/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { diag } from '@opentelemetry/api';
import { addFetchEventAction, onInit } from '../core/index.js';
import { FastlySDK } from './FastlySDK.js';

let _target!: FastlySDK;
const respondWith_called = Symbol();

onInit(() => {
  (_target as any) = null;
  // Patch event.respondWith to ensure that if the SDK has been started,
  // then the SDK's shutdown method will be called automatically before
  // the end of the event's lifetime.
  addFetchEventAction(0, event => {
    diag.debug('sdk-fastly: running listener');

    if(_target == null) {
      diag.warn('sdk-fastly: listener called, but sdk-fastly not initialized.  Did you call sdk.start()?');
      return;
    }

    // Allow the SDK to respond at the very first opportunity to react
    // after the listener starts.
    _target.onEventStart(event);

    diag.debug('sdk-fastly: patching event.respondWith()');
    const origRespondWith = event.respondWith;
    event.respondWith = (response) => {
      // Only do this patchwork on the first call to event.respondWith().
      // event.respondWith() can only be called once on a single event.
      if((event as any)[respondWith_called]) {
        diag.warn('sdk-fastly: detected multiple calls to respondWith() on a single event');
        diag.debug('sdk-fastly: calling previous event.respondWith()');
        origRespondWith.call(event, response);
        return;
      }
      (event as any)[respondWith_called] = true;

      diag.debug('sdk-fastly: running patched event.respondWith()');

      // Create a promise to extend the life of this event.
      // Calling resolveExtension later will settle this promise
      // and allow the event's lifetime to end.
      let resolveExtension: () => void;
      let extension = new Promise<void>(resolve => {
        resolveExtension = resolve;
      });
      event.waitUntil(extension);

      Promise.resolve(response)
        .finally(() => {
          diag.debug('sdk-fastly: response settled, shutting down.');
          // This ensures that target's shutdown is enqueued
          event.waitUntil(_target.shutdown());
          resolveExtension!();
        });

      diag.debug('sdk-fastly: calling previous event.respondWith()');
      origRespondWith.call(event, response);

    };
  });
});

export function setPatchTarget(target: FastlySDK) {
  _target = target;
}
