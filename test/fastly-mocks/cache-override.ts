/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { CacheOverride } from 'fastly:cache-override';

type CacheOverrideMode = ConstructorParameters<typeof CacheOverride>[0];
type CacheOverrideInit = NonNullable<ConstructorParameters<typeof CacheOverride>[1]>;

export class CacheOverrideMock {
  mode: CacheOverrideMode;
  init: CacheOverrideInit | undefined;
  constructor(mode: CacheOverrideMode, init?: CacheOverrideInit) {
    this.mode = mode;
    this.init = init;
  }
}

export { CacheOverrideMock as CacheOverride };
