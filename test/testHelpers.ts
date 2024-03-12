/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as sinon from 'sinon';
import { diag, context, propagation, trace } from '@opentelemetry/api';
import { doInit, doShutdown, removeAllActions } from '../src/core/index.js';
import {
  registerFastlyNamespacedMocks,
  resetRegisteredFetchEventListeners,
} from './computeHelpers.js';

declare global {
  function onBeforeEach(): void;
  function onAfterEach(): void;
}

registerFastlyNamespacedMocks();

globalThis.onBeforeEach = () => {
  resetRegisteredFetchEventListeners();
  removeAllActions();
  doInit();
};

globalThis.onAfterEach = () => {
  doShutdown();
  diag.disable();
  trace.disable();
  context.disable();
  propagation.disable();
  sinon.restore();
};
