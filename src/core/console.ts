/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as util from 'node-inspect-extracted';

export function toLoggerString(...args: any[]): string {
  return util.format(...args);
}
