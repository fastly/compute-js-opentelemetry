/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { addAction, doAction } from "./util";

addEventListener('fetch', event => {
  doAction('fetchEvent', event);
});

export function addFetchEventAction(priority: number, fn: (event: FetchEvent) => void) {
  addAction('fetchEvent', priority, fn);
}
