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

export class LoggerMock implements Logger {
  public endpoint: string;
  public called: boolean;
  public loggedContent?: string;
  constructor(endpoint: string) {
    this.called = false;
    this.endpoint = endpoint;
  }
  log(message: any): void {
    this.called = true;
    this.loggedContent = String(message);
  }
  reset() {
    this.called = false;
    this.loggedContent = undefined;
  }
}

class FastlyMock implements Fastly {
  _loggers: {[endpoint: string]: Logger} = {};

  getLogger(endpoint: string): Logger {
    if(endpoint in this._loggers) {
      return this._loggers[endpoint];
    }
    const logger = new LoggerMock(endpoint);
    this._loggers[endpoint] = logger;
    return logger;
  }

  env!: Env;
  enableDebugLogging!: (enabled: boolean) => void;
  getGeolocationForIpAddress!: (address: string) => Geolocation;
  includeBytes!: (path: String) => Uint8Array;
}

globalThis.fastly = new FastlyMock();
