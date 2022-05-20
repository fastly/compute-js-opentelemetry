/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { addAction, doAction, isTest } from "./util";

export function addFetchEventAction(priority: number, fn: (event: FetchEvent) => void) {
  addAction('fetchEvent', priority, fn);
}

export function _lifecycle_init() {
  addEventListener('fetch', event => {
    doAction('fetchEvent', event);
  });
}

/* istanbul ignore if */
if(!isTest()) {
  _lifecycle_init();
}
