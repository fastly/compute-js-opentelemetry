/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Context, ROOT_CONTEXT } from '@opentelemetry/api';

// We are specifically ONLY bringing in StackContextManager from sdk-trace-web.
import { StackContextManager } from '@opentelemetry/sdk-trace-web/build/src/StackContextManager';
import { onShutdown } from "../core";

let _eventContext: Context | null = null;

// Set the event context.
export function _setEventContext(context: Context) {
  _eventContext = context;
}

// Reset the event context.
export function _resetEventContext() {
  _eventContext = null;
}

/**
 * Stack Context Manager for managing the state in Fastly Compute apps.
 * It doesn't fully support async calls.
 * It (ab)uses the fact that there is only one FetchEvent in Compute apps,
 * to fall back to the FetchEvent context if it exists instead of ROOT_CONTEXT.
 */
export class FastlyStackContextManager extends StackContextManager {
  /**
   * Returns the active context
   */
  override active(): Context {
    return this._currentContext === ROOT_CONTEXT && _eventContext != null ?
      _eventContext : this._currentContext;
  }
}

onShutdown(() => {
  _resetEventContext();
});
