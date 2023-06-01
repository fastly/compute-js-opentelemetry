/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { CacheOverride } from "fastly:cache-override";
import { Logger } from "fastly:logger";

import * as sinon from 'sinon';
import { addFetchEventAction, onInit } from "../src/core";

declare function setRequireFunc(fn: (id: string) => any | undefined): void;

export class MockedHeaders implements Headers {
  _headers: Record<string, string> = {};

  set(name: string, value: string) {
    this._headers[name] = value;
  }
  get(name: string): string | null {
    return this._headers[name] ?? null;
  }
  has(name: string): boolean {
    return name in this._headers;
  }
  delete(name: string): void {
    delete this._headers[name];
  }

  append!: (name: string, value: string) => void;
  entries!: () => IterableIterator<[string, string]>;
  forEach!: (callback: (value: string, name: string, parent: Headers) => void, thisArg?: any) => void;
  keys!: () => IterableIterator<string>;
  values!: () => IterableIterator<[string]>;
  [Symbol.iterator]!: () => Iterator<[string, string]>;
}

export class MockedClientInfo implements ClientInfo {
  readonly address: string = "10.0.0.1";
  readonly geo!: Geolocation;
}

export class MockedRequest implements Request {
  url = 'https://www.example.com/';
  headers = new MockedHeaders();

  backend!: string;
  readonly body!: ReadableStream<any>;
  bodyUsed!: boolean;
  method!: string;

  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
  setCacheOverride!: (override: CacheOverride) => void;
  setCacheKey!: (key: string) => void;
  text!: () => Promise<string>;
  clone!: () => Request;
}

export class MockedFetchEvent implements FetchEvent {
  constructor() {
    this.client = new MockedClientInfo();
    this.request = new MockedRequest();
  }

  readonly client: ClientInfo;
  readonly request: Request;

  respondWith = sinon.stub<[Response | Promise<Response>], void>()
    .callsFake(() => {
      (this as any)._stopPropagation = true
    });
  waitUntil = sinon.stub<[Promise<any>], void>();
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

  statusText!: string;
  headers!: Headers;
  ok!: boolean;
  redirected!: boolean;
  url!: string;
  body!: ReadableStream;
  bodyUsed!: boolean;
  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
}

// fastly:logger
export class LoggerMockInstance implements Logger {
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

export class FastlyLoggerMock {
  static _loggers: {[endpoint: string]: Logger} = {};
  static _requireFetchEvent: boolean = true;
  static getLogger(endpoint: string) {
    if(this._requireFetchEvent) {
      const fetchEvent = getRequestFetchEvent();
      if(fetchEvent == null) {
        throw new Error('no fetch event');
      }
    }
    if(endpoint in this._loggers) {
      return this._loggers[endpoint];
    }
    const logger = new LoggerMockInstance(endpoint);
    this._loggers[endpoint] = logger;
    return logger;
  };
  static clearLoggers() {
    this._loggers = {};
  }
  static mockLoggersRequireFetchEvent(require: boolean = true) {
    this._requireFetchEvent = require;
  }
}

function LoggerMock(name: string) {
  if (!new.target) {
    throw new Error('Must be called as constructor');
  }
  return FastlyLoggerMock.getLogger(name);
}

const fastlyLoggerMockModule = {
  Logger: LoggerMock,
};

// fastly:cache-override
type CacheOverrideMode = ConstructorParameters<typeof CacheOverride>[0];
type CacheOverrideInit = NonNullable<ConstructorParameters<typeof CacheOverride>[1]>;

export class CacheOverrideMock {
  mode: ConstructorParameters<typeof CacheOverride>[0];
  init: CacheOverrideInit | undefined;
  constructor(mode: CacheOverrideMode, init?: CacheOverrideInit) {
    this.mode = mode;
    this.init = init;
  }
}

const fastlyCacheOverrideMockModule = {
  CacheOverride: CacheOverrideMock,
};

export function registerFastlyNamespacedMocks() {
  setRequireFunc((id:string) => {
    if (id === 'fastly:logger') {
      return fastlyLoggerMockModule;
    }
    if (id === 'fastly:cache-override') {
      return fastlyCacheOverrideMockModule;
    }
    return undefined;
  });
}

type FetchEventListener = (event: FetchEvent) => void;

let _fetchEventErrors: any[] = [];
let _listeners: FetchEventListener[] = [];
function registerFetchEventListener(listener: FetchEventListener): void {
  _listeners.push(listener);
}
export function getRegisteredFetchEventListeners() {
  return _listeners;
}
export function getRegisteredFetchEventErrors() {
  return _fetchEventErrors;
}
export function runRegisteredFetchEventListeners(event: FetchEvent) {
  for(const listener of _listeners) {
    try {
      listener(event);
    } catch(ex) {
      _fetchEventErrors.push(ex);
    }
    if((event as any)._stopPropagation) {
      break;
    }
  }
}
export function resetRegisteredFetchEventListeners() {
  _listeners = [];
  _fetchEventErrors = [];
}

function addEventListenerMock(type: 'fetch', listener: FetchEventListener): void {
  registerFetchEventListener(listener);
}
globalThis.addEventListener = addEventListenerMock;

let _requestFetchEvent: FetchEvent | null = null;
export function getRequestFetchEvent() {
  return _requestFetchEvent;
}

onInit(() => {
  _requestFetchEvent = null;
  FastlyLoggerMock.clearLoggers();
  FastlyLoggerMock.mockLoggersRequireFetchEvent();
  addFetchEventAction(-1, (event) => {
    _requestFetchEvent = event;
  });
});
