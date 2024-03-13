/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { CacheOverride } from 'fastly:cache-override';
import type { Geolocation } from 'fastly:geolocation';

import * as sinon from 'sinon';
import { addFetchEventAction, onInit } from '../src/core/index.js';
import { FastlyLoggerMock } from './fastly-mocks/logger.js';

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
  values!: () => IterableIterator<string>;
  getSetCookie!: () => string[];
  [Symbol.iterator]!: () => IterableIterator<[string, string]>;
}

export class MockedClientInfo implements ClientInfo {
  readonly address: string = "10.0.0.1";
  readonly geo!: Geolocation;
  readonly tlsCipherOpensslName!: string;
  readonly tlsClientCertificate!: ArrayBuffer;
  readonly tlsClientHello!: ArrayBuffer;
  readonly tlsJA3MD5!: string;
  readonly tlsProtocol!: string;
}

export class MockedRequest implements Request {
  url = 'https://www.example.com/';
  headers = new MockedHeaders();

  backend!: string;
  readonly body!: ReadableStream<any>;
  bodyUsed!: boolean;
  method!: string;
  cache!: RequestCache;
  credentials!: RequestCredentials;
  destination!: RequestDestination;
  integrity!: string;
  keepalive!: boolean;
  mode!: RequestMode;
  redirect!: RequestRedirect;
  referrer!: string;
  referrerPolicy!: ReferrerPolicy;
  signal!: AbortSignal;

  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
  blob!: () => Promise<Blob>;
  formData!: () => Promise<FormData>;
  setCacheOverride!: (override: CacheOverride) => void;
  setCacheKey!: (key: string) => void;
  text!: () => Promise<string>;
  clone!: () => Request;
  setManualFramingHeaders!: (manual: boolean) => void;
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
  type!: ResponseType;

  arrayBuffer!: () => Promise<ArrayBuffer>;
  json!: () => Promise<any>;
  blob!: () => Promise<Blob>;
  formData!: () => Promise<FormData>;
  setManualFramingHeaders!: (manual: boolean) => void;
  clone!: () => Response;
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
// @ts-ignore
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
