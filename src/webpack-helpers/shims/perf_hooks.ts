/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

let origin: number | null;
addEventListener('fetch', () => {
  origin = Date.now();
});

export const performance = {
  get timeOrigin() {
    if(origin == null) {
      console.warn('Read from performance.timeOrigin before fetch likely to give unexpected results.');
      return 1;
    }
    return origin!;
  },
  now() {
    if(origin == null) {
      console.warn('Read from performance.now before fetch event likely to give unexpected results.');
      return 1;
    }
    return Date.now() - origin;
  },
};
