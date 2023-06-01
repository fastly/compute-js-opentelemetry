/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Logger } from "fastly:logger";

import * as assert from "assert";
import * as sinon from "sinon";

import { diag, DiagLogLevel } from "@opentelemetry/api";
import { DiagFastlyLogger } from "../../src/diag-fastly-logger";
import { buildFakeFetchEvent, LoggerMockInstance, runRegisteredFetchEventListeners } from "../computeHelpers";

describe('DiagFastlyLogger', function() {
  describe('instance', function() {
    it('should instantiate with an endpoint', function() {
      const logger = new DiagFastlyLogger('test-logger');
      assert.ok(logger != null);
    });

    it('should register with API', function() {
      const logger = new DiagFastlyLogger('test-logger');

      const debugSpy = sinon.stub(logger, 'debug');
      diag.setLogger(logger, DiagLogLevel.ALL);

      // The above actually causes diagnostic message to be sent to
      // diag.debug, so let's remove it once.
      debugSpy.reset();

      diag.debug('foo');
      assert.ok(debugSpy.calledOnce);
      assert.strictEqual(debugSpy.args[0][0], 'foo');
    });

    it('calling each log method before fetch event should log error to console', function() {
      const consoleErrorSpy = sinon.stub(console, 'error');

      const logger = new DiagFastlyLogger('test-logger');

      consoleErrorSpy.reset();
      logger.verbose('verbose');
      assert.strictEqual(consoleErrorSpy.args[0][0], 'Error: no fetch event');

      consoleErrorSpy.reset();
      logger.debug('debug');
      assert.strictEqual(consoleErrorSpy.args[0][0], 'Error: no fetch event');

      consoleErrorSpy.reset();
      logger.info('info');
      assert.strictEqual(consoleErrorSpy.args[0][0], 'Error: no fetch event');

      consoleErrorSpy.reset();
      logger.warn('warn');
      assert.strictEqual(consoleErrorSpy.args[0][0], 'Error: no fetch event');

      consoleErrorSpy.reset();
      logger.error('error');
      assert.strictEqual(consoleErrorSpy.args[0][0], 'Error: no fetch event');
    });

    it('calling each log method after fetch event should be fine', function() {
      const consoleErrorSpy = sinon.stub(console, 'error');

      const logger = new DiagFastlyLogger('test-logger');

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      const loggerMock = new Logger('test-logger') as LoggerMockInstance;

      logger.verbose('verbose');
      assert.ok(!consoleErrorSpy.called);
      assert.strictEqual(loggerMock.loggedContent, 'VERBOSE: verbose');

      logger.debug('debug');
      assert.ok(!consoleErrorSpy.called);
      assert.strictEqual(loggerMock.loggedContent, 'DEBUG: debug');

      logger.info('info');
      assert.ok(!consoleErrorSpy.called);
      assert.strictEqual(loggerMock.loggedContent, 'INFO: info');

      logger.warn('warn');
      assert.ok(!consoleErrorSpy.called);
      assert.strictEqual(loggerMock.loggedContent, 'WARN: warn');

      logger.error('error');
      assert.ok(!consoleErrorSpy.called);
      assert.strictEqual(loggerMock.loggedContent, 'ERROR: error');
    });
  });
});
