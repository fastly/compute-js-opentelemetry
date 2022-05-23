/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';

import { context, ROOT_CONTEXT } from '@opentelemetry/api';

import {
  _resetEventContext,
  _setEventContext,
  FastlyStackContextManager
} from "../../src/opentelemetry-sdk-trace-fastly";

describe('FastlyStackContextManager', function() {
  describe('instance', function () {
    it('instantiates with no arg', function () {
      const contextManager = new FastlyStackContextManager();
      assert.ok(contextManager != null);
    });
  });

  describe('active context', function() {


    it('should give ROOT_CONTEXT if no active context and no event context', function() {
      const contextManager = new FastlyStackContextManager();
      context.setGlobalContextManager(contextManager);
      assert.strictEqual(context.active(), ROOT_CONTEXT);
    });

    it('should give the active context if we have switched to it', function() {
      const contextManager = new FastlyStackContextManager();
      context.setGlobalContextManager(contextManager);

      const innerContext = context.active().setValue(Symbol(), 'inner');
      context.with(innerContext, () => {
        assert.strictEqual(context.active(), innerContext);
      });
    });

    it('should give the event context if given and no active context', function() {
      const contextManager = new FastlyStackContextManager();
      context.setGlobalContextManager(contextManager);

      const eventContext = context.active().setValue(Symbol(), 'event');
      _setEventContext(eventContext);

      assert.strictEqual(context.active(), eventContext);
    });

    it('should give the root context if event context is removed', function() {
      const contextManager = new FastlyStackContextManager();
      context.setGlobalContextManager(contextManager);

      const eventContext = context.active().setValue(Symbol(), 'event');
      _setEventContext(eventContext);

      assert.strictEqual(context.active(), eventContext);

      _resetEventContext();
      assert.strictEqual(context.active(), ROOT_CONTEXT);
    });

    it('should give the active context if we have switched to it even if there is an event context', function() {
      const contextManager = new FastlyStackContextManager();
      context.setGlobalContextManager(contextManager);

      const eventContext = context.active().setValue(Symbol(), 'event');
      _setEventContext(eventContext);

      const innerContext = context.active().setValue(Symbol(), 'inner');
      context.with(innerContext, () => {
        assert.strictEqual(context.active(), innerContext);
      });
    });

  });
});

