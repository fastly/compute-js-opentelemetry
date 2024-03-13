/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import type { Logger } from 'fastly:logger';
import { getRequestFetchEvent } from '../computeHelpers.js';

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

export { LoggerMock as Logger };
