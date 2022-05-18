/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

class CacheOverrideMock {
  mode: CacheOverrideMode;
  init: CacheOverrideInit | undefined;
  constructor(mode: CacheOverrideMode, init?: CacheOverrideInit) {
    this.mode = mode;
    this.init = init;
  }
}
globalThis.CacheOverride = CacheOverrideMock;

export class MockedResponse implements Response {
  constructor(body?: BodyInit, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    if(typeof body === 'string') {
      this._body = body;
    }
  }

  status: number;
  _body?: string;
  text(): Promise<string> {
    return Promise.resolve(this._body ?? '');
  };

  headers!: Headers;
  ok!: boolean;
  redirected!: boolean;
  url!: string;
  body!: ReadableStream;
  bodyUsed!: boolean;
  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
}
