/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { addAction, doAction, onInit } from "./util";

export function addFetchEventAction(priority: number, fn: (event: FetchEvent) => void) {
  addAction('fetchEvent', priority, fn);
}

onInit(() => {
  addEventListener('fetch', event => {
    doAction('fetchEvent', event);
  });
});
