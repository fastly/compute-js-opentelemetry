import assert from "assert";

import { FastlyComputeJsInstrumentation } from "../../src/opentelemetry-instrumentation-fastly-compute-js";
import { checkLog, newNopDiagLogger } from "../commonHelpers";
import * as sinon from "sinon";
import { diag, DiagLogLevel, ROOT_CONTEXT, trace } from "@opentelemetry/api";
import {
  buildFakeFetchEvent,
  getRegisteredFetchEventErrors,
  MockedResponse,
  runRegisteredFetchEventListeners
} from "../computeHelpers";
import { ReadableSpan, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { FastlySpanProcessor } from "../../src/opentelemetry-sdk-trace-fastly";
import { FastlySDK } from "../../src/opentelemetry-sdk-fastly";
import { ExportResult } from "@opentelemetry/core";

describe('FastlyComputeJsInstrumentation', function() {
  describe('instance', function() {
    it('can be instantiated', function() {
      const instrumentation = new FastlyComputeJsInstrumentation();
      assert.strictEqual(instrumentation.instrumentationName, '@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js');
      assert.strictEqual(instrumentation.instrumentationVersion, '0.1.0');
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });

    it('can be instantiated disabled', function() {
      const instrumentation = new FastlyComputeJsInstrumentation({enabled: false});
      assert.ok(!instrumentation._eventsInstalled);
      assert.ok(!instrumentation._eventsEnabled);
    });

    it('can be instantiated disabled and then enabled', function() {
      const instrumentation = new FastlyComputeJsInstrumentation({enabled: false});
      instrumentation.enable();
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });

    it('can be instantiated enabled, disabled, and then enabled again', function() {
      const instrumentation = new FastlyComputeJsInstrumentation();
      instrumentation.disable();
      instrumentation.enable();
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });
  });

  describe('event lifecycle', function() {

    it('if the instrumentation is disabled, then event lifecycle is not patched', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();
      instrumentation.disable();

      const spy = sinon.spy(instrumentation, 'onEventStart');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(spy.notCalled);

    });

    it('if the instrumentation is enabled, then event lifecycle is patched, and onEventStart is called', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      const spy = sinon.spy(instrumentation, 'onEventStart');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(spy.calledOnce);
      assert.strictEqual(spy.args[0][0], fetchEvent);

    });

  });

  describe('listener function patching', function() {

    it('if the instrumentation is disabled, then listener function is not patched', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();
      instrumentation.disable();

      addEventListener('fetch', (event) => event.respondWith(new MockedResponse('OK', {status: 200})));

      const spy = sinon.spy(instrumentation, 'onListener');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(spy.notCalled);

    });

    it('if the instrumentation is enabled, then listener function is patched, and onListener is called', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      addEventListener('fetch', (event) => event.respondWith(new MockedResponse('OK', {status: 200})));

      const spy = sinon.spy(instrumentation, 'onListener');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(spy.calledOnce);
      assert.strictEqual(spy.args[0][0], fetchEvent);

    });

    it('if the original listener throws, then an error is thrown', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      addEventListener('fetch', () => { throw new Error('foo'); });

      const spy = sinon.spy(instrumentation, 'onListener');

      const fetchEvent = buildFakeFetchEvent();

      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(spy.calledOnce);
      assert.strictEqual(spy.args[0][0], fetchEvent);

      const errors = getRegisteredFetchEventErrors();
      assert.strictEqual(errors.length, 1);

      const error = errors[0]
      assert.strictEqual(error.name, 'Error');
      assert.strictEqual(error.message, 'foo');

    });
  });

  describe('respondWith', function() {
    it('if the instrumentation is disabled, then event.respondWith() runs normally', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();
      instrumentation.disable();

      addEventListener('fetch', (event) => event.respondWith(new MockedResponse('OK', {status: 200})));

      const onRespondWithSpy = sinon.spy(instrumentation, 'onRespondWith');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(onRespondWithSpy.notCalled);

    });

    it('if the instrumentation is enabled, then the patched event.respondWith() runs, and onRespondWith is called', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      addEventListener('fetch', (event) => event.respondWith(new MockedResponse('OK', {status: 200})));

      const onRespondWithSpy = sinon.spy(instrumentation, 'onRespondWith');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(onRespondWithSpy.calledOnce);
      assert.strictEqual(onRespondWithSpy.args[0][0], fetchEvent);

    });

    it('if the instrumentation is enabled, calling event.respondWith() twice will emit a warning', function() {
      const diagLogger = newNopDiagLogger();
      const stubLoggerWarn = sinon.stub();
      diagLogger.warn = stubLoggerWarn;
      diag.setLogger(diagLogger, DiagLogLevel.ALL);

      new FastlyComputeJsInstrumentation();

      addEventListener('fetch', (event) => {
        event.respondWith(new MockedResponse('OK', {status: 200}));
        event.respondWith(new MockedResponse('OK', {status: 200}));
      });

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerWarn, 'instrumentation-fastly-compute-js: detected multiple calls to respondWith() on a single event', 1)
      );

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a promise resolving to a response object, then the original event.respondWith receives it.', async function() {

      new FastlyComputeJsInstrumentation();

      const fakeResponse = {} as Response;
      addEventListener('fetch', (event) => event.respondWith(Promise.resolve(fakeResponse)));

      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);

      assert.strictEqual(await origRespondWith.args[0][0], fakeResponse);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a response object, then the original event.respondWith receives a promise that resolves to it.', async function() {

      new FastlyComputeJsInstrumentation();

      const fakeResponse = {} as Response;
      addEventListener('fetch', (event) => event.respondWith(fakeResponse));

      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);

      assert.strictEqual(await origRespondWith.args[0][0], fakeResponse);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a promise that rejects, then the original event.respondWith receives it.', async function() {

      new FastlyComputeJsInstrumentation();

      const fakeError = new Error('foo');
      addEventListener('fetch', (event) => event.respondWith(Promise.reject(fakeError)));

      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);

      await assert.rejects(async () => {
        await origRespondWith.args[0][0]
      }, (err) => {
        assert.strictEqual(err, fakeError);
        return true;
      });

    });

  });

  describe('onEventEnd', function() {

    it('if the instrumentation is disabled, then event.respondWith() runs normally, and onEventEnd() is not called', function() {

      const instrumentation = new FastlyComputeJsInstrumentation();
      instrumentation.disable();

      addEventListener('fetch', (event) => event.respondWith(new MockedResponse('OK', {status: 200})));

      const onEventEnd = sinon.spy(instrumentation, 'onEventEnd');
      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(onEventEnd.notCalled);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a promise resolving to a Response object, then onEventEnd receives Response object.', async function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      const fakeResponse = {} as Response;
      addEventListener('fetch', (event) => event.respondWith(Promise.resolve(fakeResponse)));

      const onEventEnd = sinon.spy(instrumentation, 'onEventEnd');
      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);
      await origRespondWith.args[0][0];

      assert.ok(onEventEnd.calledOnce);
      assert.ok(onEventEnd.calledAfter(origRespondWith));

      assert.strictEqual(onEventEnd.args[0][1], fakeResponse);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a Response object, then onEventEnd receives it.', async function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      const fakeResponse = {} as Response;
      addEventListener('fetch', (event) => event.respondWith(fakeResponse));

      const onEventEnd = sinon.spy(instrumentation, 'onEventEnd');
      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);
      await origRespondWith.args[0][0]; // remember this receives a promise

      assert.ok(onEventEnd.calledOnce);
      assert.ok(onEventEnd.calledAfter(origRespondWith));

      assert.strictEqual(onEventEnd.args[0][1], fakeResponse);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a promise that rejects to an Error object, then onEventEnd receives the Error object.', async function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      const fakeError = new Error('foo');
      addEventListener('fetch', (event) => event.respondWith(Promise.reject(fakeError)));

      const onEventEnd = sinon.spy(instrumentation, 'onEventEnd');
      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);
      await assert.rejects(async () => {
        await origRespondWith.args[0][0]; // remember this receives a promise
      });

      assert.ok(onEventEnd.calledOnce);
      assert.ok(onEventEnd.calledAfter(origRespondWith));
      assert.strictEqual(onEventEnd.args[0][0], fakeError);

    });

    it('if the instrumentation is enabled, and event.respondWith is sent a promise that rejects to a non-Error object, then onEventEnd receives it wrapped in an Error object.', async function() {

      const instrumentation = new FastlyComputeJsInstrumentation();

      const fakeError = 'foo';
      addEventListener('fetch', (event) => event.respondWith(Promise.reject(fakeError)));

      const onEventEnd = sinon.spy(instrumentation, 'onEventEnd');
      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith; // need to keep this because it will get patched
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);
      await assert.rejects(async () => {
        await origRespondWith.args[0][0]; // remember this receives a promise
      });

      assert.ok(onEventEnd.calledOnce);
      assert.ok(onEventEnd.calledAfter(origRespondWith));
      assert.ok(onEventEnd.args[0][0] != null);
      assert.strictEqual(onEventEnd.args[0][0].name, 'Error');
      assert.strictEqual(onEventEnd.args[0][0].message, 'foo');

    });

  });


  describe('incoming propagation', function() {
    let traceExporter: SpanExporter;
    let spanProcessor: SpanProcessor;
    beforeEach(async function() {
      traceExporter = {
        export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void) {},
        async shutdown(): Promise<void> {}
      };

      spanProcessor = new FastlySpanProcessor(traceExporter);
      const sdk = new FastlySDK({
        spanProcessor,
        instrumentations: [
          new FastlyComputeJsInstrumentation()
        ],
      });
      await sdk.start();
    });

    it('if there are no traceparent headers, then we should have the root context', async function() {
      const fetchEvent = buildFakeFetchEvent();

      const spy = sinon.spy(spanProcessor, 'onStart');

      runRegisteredFetchEventListeners(fetchEvent);

      // onStart should have been called with a FetchEvent span
      assert.ok(spy.called);

      const theArgs = spy.args.find(([span]) => span.name === 'FetchEvent');
      assert.ok(theArgs != null);

      const [, parentContext] = theArgs;

      assert.strictEqual(parentContext, ROOT_CONTEXT);
    });

    it('if there are traceparent headers, then they are used to build a context', async function() {
      const fetchEvent = buildFakeFetchEvent();
      fetchEvent.request.headers
        .set('traceparent', '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');

      const spy = sinon.spy(spanProcessor, 'onStart');

      runRegisteredFetchEventListeners(fetchEvent);

      // onStart should have been called with a FetchEvent span
      assert.ok(spy.called);

      const theArgs = spy.args.find(([span]) => span.name === 'FetchEvent');
      assert.ok(theArgs != null);

      const [, parentContext] = theArgs;
      const parentSpan = trace.getSpan(parentContext);
      assert.ok(parentSpan != null);

      const spanContext = parentSpan.spanContext();
      assert.strictEqual(spanContext.spanId, 'b7ad6b7169203331');
      assert.strictEqual(spanContext.traceId, '0af7651916cd43dd8448eb211c80319c');
    });
  });


});
