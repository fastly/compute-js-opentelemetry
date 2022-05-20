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

export class MockedClientInfo implements ClientInfo {
  readonly address: string = "10.0.0.1";
  readonly geo!: Geolocation;
}

export class MockedRequest implements Request {
  backend!: string;
  readonly body!: ReadableStream<any>;
  bodyUsed!: boolean;
  headers!: Headers;
  method!: string;
  url!: string;

  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
  setCacheOverride!: (override: CacheOverride) => void;
  text!: () => Promise<string>;
}

export class MockedFetchEvent implements FetchEvent {
  constructor() {
    this.client = new MockedClientInfo();
    this.request = new MockedRequest();
  }

  readonly client: ClientInfo;
  readonly request: Request;

  respondWith(response: Response | Promise<Response>): void {
  }

  waitUntil(promise: Promise<any>): void {
  }
}

export function buildFakeFetchEvent() {
  return new MockedFetchEvent();
}

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

type FetchEventListener = (event: FetchEvent) => void;

let _listeners: FetchEventListener[] = [];
function registerFetchEventListener(listener: FetchEventListener): void {
  _listeners.push(listener);
}
export function getRegisteredFetchEventListeners() {
  return _listeners;
}
export function runRegisteredFetchEventListeners(event: FetchEvent) {
  for(const listener of _listeners) {
    listener(event);
    if((event as any)._stopPropagation) {
      break;
    }
  }
}
export function resetRegisteredFetchEventListeners() {
  _listeners = [];
}

function addEventListenerMock(type: 'fetch', listener: FetchEventListener): void {
  registerFetchEventListener(listener);
}
globalThis.addEventListener = addEventListenerMock;
