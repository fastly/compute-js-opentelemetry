/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

const origin = Date.now();

export const performance = {
  timeOrigin: origin,
  now() {
    return Date.now() - origin;
  },
};
