/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { ReadableSpan, Span, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {ExportResult, ExportResultCode, setGlobalErrorHandler} from "@opentelemetry/core";
import { FastlySpanProcessor } from "../../src/opentelemetry-sdk-trace-fastly";
import { Context, TraceFlags } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";

function buildMockSpan(sampled = true) {
  return {
    spanContext() {
      return {
        traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
      }
    },
    resource: {} as Resource
  } as ReadableSpan;
}

describe('FastlySpanProcessor', function() {
  let exporter: SpanExporter;
  beforeEach(function() {
    exporter = new class implements SpanExporter {
      export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        resultCallback({code: ExportResultCode.SUCCESS});
      }
      async shutdown() {}
    };
  });

  describe('instance', function () {
    it('can be instantiated with a Span Exporter', async function() {

      // calling spanProcessor.shutdown() should cause exporter.shutdown() to be called
      const spy = sinon.spy(exporter, 'shutdown');

      const spanProcessor = new FastlySpanProcessor(exporter);
      await spanProcessor.shutdown();

      assert.ok(spy.calledOnce);
    });
  });

  describe('adding spans', function() {
    it('should accept spans', async function() {
      const spy = sinon.spy(exporter, 'export');

      const spanProcessor = new FastlySpanProcessor(exporter);

      // add some spans to the buffer
      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      const span1 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span1);

      await spanProcessor.forceFlush();

      // when exported, we should see two spans
      assert.ok(spy.calledOnce);
      assert.strictEqual(spy.args[0][0].length, 2);
    });

    it('should reject spans that will not be sample', async function() {
      const spy = sinon.spy(exporter, 'export');

      const spanProcessor = new FastlySpanProcessor(exporter);

      // add some spans to the buffer
      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      // reject this one
      const span1 = buildMockSpan(false);
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span1);

      await spanProcessor.forceFlush();

      // when exported, we should see only one span
      assert.ok(spy.calledOnce);
      assert.strictEqual(spy.args[0][0].length, 1);
    });
  });

  describe('forceFlush', function() {
    let defaultHandler: sinon.SinonSpy;

    beforeEach(function() {
      defaultHandler = sinon.spy();
      setGlobalErrorHandler(defaultHandler);
    });

    it('should cause exporter\'s export to be called', async function() {

      const spy = sinon.spy(exporter, 'export');

      const spanProcessor = new FastlySpanProcessor(exporter);

      // add some spans to the buffer
      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      const span1 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span1);

      await spanProcessor.forceFlush();

      assert.ok(spy.calledOnce);

      // spans received by export
      const spans = spy.args[0][0];
      assert.strictEqual(spans[0], span0);
      assert.strictEqual(spans[1], span1);
    });

    it('should not call exporter\'s export if no spans created', async function() {

      const spy = sinon.spy(exporter, 'export');

      const spanProcessor = new FastlySpanProcessor(exporter);
      await spanProcessor.forceFlush();

      assert.ok(spy.notCalled);

    });

    it('should not call exporter\'s export if shutdown already called', async function() {

      const spanProcessor = new FastlySpanProcessor(exporter);
      await spanProcessor.shutdown();

      const spy = sinon.spy(exporter, 'export');

      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);
      await spanProcessor.forceFlush();

      assert.ok(spy.notCalled);

    });

    it('should return same promise as shutdown, if already called', function() {

      const spanProcessor = new FastlySpanProcessor(exporter);
      const shutdownPromise = spanProcessor.shutdown();
      const flushPromise = spanProcessor.forceFlush();

      assert.strictEqual(flushPromise, shutdownPromise);

    });

    it('should throw if exporter\'s export returns error', async function() {

      exporter.export = (spans, resultCallback) => {
        resultCallback({code: ExportResultCode.FAILED});
      };

      const spanProcessor = new FastlySpanProcessor(exporter);

      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      await spanProcessor.forceFlush();

      assert.ok(defaultHandler.calledOnce);
      const err = defaultHandler.args[0][0];
      assert.ok(err instanceof Error);
      assert.strictEqual(err.name, 'Error');
      assert.strictEqual(err.message, 'FastlySpanProcessor: span export failed (status [object Object])');
    });

    it('should throw if exporter\'s export returns specific error', async function() {

      const error = new Error('foo');

      exporter.export = (spans, resultCallback) => {
        resultCallback({code: ExportResultCode.FAILED, error});
      };

      const spanProcessor = new FastlySpanProcessor(exporter);

      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      await spanProcessor.forceFlush();

      assert.ok(defaultHandler.calledOnce);
      const err = defaultHandler.args[0][0];
      assert.ok(err instanceof Error);
      assert.strictEqual(err.name, 'Error');
      assert.strictEqual(err.message, 'foo');

    });
  });

  describe('shutdown', function() {
    it('should cause exporter\'s export to be called', async function () {

      const spy = sinon.spy(exporter, 'export');

      const spanProcessor = new FastlySpanProcessor(exporter);

      // add some spans to the buffer
      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      await spanProcessor.shutdown();

      assert.ok(spy.calledOnce);

      // spans received by export
      const spans = spy.args[0][0];
      assert.strictEqual(spans[0], span0);
    });

    it('should cause exporter\'s shutdown to be called', async function () {

      const spy = sinon.spy(exporter, 'shutdown');

      const spanProcessor = new FastlySpanProcessor(exporter);

      // add some spans to the buffer
      const span0 = buildMockSpan();
      spanProcessor.onStart({} as Span, {} as Context);
      spanProcessor.onEnd(span0);

      await spanProcessor.shutdown();

      assert.ok(spy.calledOnce);
    });
  });
});
