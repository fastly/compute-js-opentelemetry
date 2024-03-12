/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { context, Context, ContextManager, ROOT_CONTEXT } from '@opentelemetry/api';
import { FastlyStackContextManager, FastlyTracerProvider } from '../../src/opentelemetry-sdk-trace-fastly/index.js';

describe('FastlyTracerProvider', function() {
  describe('instance', function() {
    it('instantiates with no arg', function() {

      const tracerProvider = new FastlyTracerProvider();
      assert.ok(tracerProvider != null);

    });
  });

  describe('register', function() {
    it('uses passed-in context manager, if any', function() {
      const tracerProvider = new FastlyTracerProvider();

      const contextManager = new class implements ContextManager {
        active(): Context {
          return ROOT_CONTEXT;
        }
        enable(): this {
          return this;
        }
        disable(): this {
          return this;
        }
        bind<T>(context: Context, target: T): T {
          return target;
        }
        with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(context: Context, fn: F, thisArg?: ThisParameterType<F>, ...args: A): ReturnType<F> {
          return fn.call(thisArg, ...args);
        }
      }

      // Spy on active
      const spy = sinon.spy(contextManager, 'active');

      // This should register it as the global context manager
      tracerProvider.register({
        contextManager,
      });

      // so calling this should have called active on the above class.
      context.active();

      assert.ok(spy.calledOnce);
    });

    it('uses FastlyStackContextManager, if not specified', function() {
      const tracerProvider = new FastlyTracerProvider();

      // Spy on active
      const spy = sinon.spy(FastlyStackContextManager.prototype, 'active');

      // This should register FastlyStackContextManager as the global context manager
      tracerProvider.register();

      // so calling this should have called active on the above class.
      context.active();

      assert.ok(spy.calledOnce);
    });

    it('uses no context manager, if specifically set to null', function() {

      const tracerProvider = new FastlyTracerProvider();

      // This should skip registering a context manager
      tracerProvider.register({contextManager: null});

      // we change the context, but with no context manager,
      // we will have the same active context as outside the closure
      const root = context.active();
      context.with(context.active().setValue(Symbol(), 'bar'), () => {
        assert.strictEqual(root, context.active());
      });
    });
  });
});
