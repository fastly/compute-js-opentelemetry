import * as assert from "assert";

import * as sinon from "sinon";

import { diag, DiagLogger, DiagLogLevel, Sampler, SamplingDecision, trace, } from "@opentelemetry/api";
import { ReadableSpan, SimpleSpanProcessor, SpanExporter, SpanProcessor, Tracer } from "@opentelemetry/sdk-trace-base";
import { MetricReader } from "@opentelemetry/sdk-metrics-base";
import { Resource } from "@opentelemetry/resources";
import { Instrumentation } from "@opentelemetry/instrumentation";

import {
  buildFakeFetchEvent,
  runRegisteredFetchEventListeners,
  MockedResponse,
} from "../computeHelpers";
import { checkLog, newNopDiagLogger } from "../commonHelpers";
import { FastlySDK } from "../../src/opentelemetry-sdk-fastly";
import { OTLPTraceExporter } from "../../src/exporter-trace-otlp-fastly-backend";
import { FastlySpanProcessor } from "../../src/opentelemetry-sdk-trace-fastly";

describe('FastlySDK', function() {
  describe('instance', function() {
    it('can be instantiated with empty constructor', function(done) {
      new FastlySDK();
      done();
    });
  });

  describe('startup', function() {

    let fastlySdk: FastlySDK;

    it('should give warning at start of event if start() isn\'t called beforehand', function() {
      fastlySdk = new FastlySDK();

      const diagLogger = newNopDiagLogger();
      const stubLoggerWarn = sinon.stub();
      diagLogger.warn = stubLoggerWarn;
      diag.setLogger(diagLogger);

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerWarn, 'sdk-fastly: listener called, but sdk-fastly not initialized.  Did you call sdk.start()?')
      );
    });

    it('should patch event.respondWith() at FetchEvent if start() is called beforehand', async function() {
      fastlySdk = new FastlySDK();
      await fastlySdk.start();

      const diagLogger = newNopDiagLogger();
      const stubLoggerDebug = sinon.stub();
      const stubLoggerWarn = sinon.stub();
      diagLogger.debug = stubLoggerDebug;
      diagLogger.warn = stubLoggerWarn;
      diag.setLogger(diagLogger, DiagLogLevel.ALL);

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerWarn, 'sdk-fastly: listener called, but sdk-fastly not initialized.  Did you call sdk.start()?', 0)
      );

      assert.ok(
        checkLog(stubLoggerDebug, 'sdk-fastly: patching event.respondWith()')
      );
    });
  });

  describe('initialization', function() {
    it('initializes with a trace exporter', async function() {

      const exportStub = sinon.stub();
      const traceExporter: SpanExporter = {
        export: exportStub,
        async shutdown(): Promise<void> {}
      };
      const fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');
      span.end();

      assert.ok(exportStub.called);
      assert.strictEqual(exportStub.args[0][0][0], span);

    });

    it('if trace exporter is OTLPExporterFastlyBackend, then it uses FastlySpanProcessor', async function() {

      const traceExporter = new OTLPTraceExporter({backend:'test-backend'});

      // FastlySDK constructor calls configureTracerProvider with provider information
      const configureTracerProviderSpy = sinon.spy(FastlySDK.prototype, 'configureTracerProvider');
      const fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start();

      // Second parameter should have been a FastlySpanProcessor
      assert.ok(configureTracerProviderSpy.calledOnce);
      assert.ok(configureTracerProviderSpy.args[0][1] instanceof FastlySpanProcessor);

    });

    it('if trace exporter is not OTLPExporterFastlyBackend, then it uses SimpleSpanProcessor', async function() {

      const traceExporter: SpanExporter = {
        export(spans, resultCallback) {},
        async shutdown(): Promise<void> {}
      };

      // FastlySDK constructor calls configureTracerProvider with provider information
      const configureTracerProviderSpy = sinon.spy(FastlySDK.prototype, 'configureTracerProvider');
      const fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start();

      // Second parameter should have been a SimpleSpanProcessor
      assert.ok(configureTracerProviderSpy.calledOnce);
      assert.ok(configureTracerProviderSpy.args[0][1] instanceof SimpleSpanProcessor);

    });

    it('initializes with a span processor', async function() {

      const onStartStub = sinon.stub();
      const spanProcessor: SpanProcessor = {
        async forceFlush() {},
        onStart: onStartStub,
        onEnd(span: ReadableSpan) {},
        async shutdown() {},
      };
      const fastlySdk = new FastlySDK({spanProcessor});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');
      span.end();

      assert.ok(onStartStub.called);
      assert.strictEqual(onStartStub.args[0][0], span);

    });

    it('when provided with both a span processor and a trace exporter, the span processor wins', async function() {

      const onStartStub = sinon.stub();
      const spanProcessor: SpanProcessor = {
        async forceFlush() {},
        onStart: onStartStub,
        onEnd(span: ReadableSpan) {},
        async shutdown() {},
      };
      const exportStub = sinon.stub();
      const traceExporter: SpanExporter = {
        export: exportStub,
        async shutdown(): Promise<void> {}
      };
      const fastlySdk = new FastlySDK({spanProcessor, traceExporter});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');
      span.end();

      assert.ok(onStartStub.called);
      assert.strictEqual(onStartStub.args[0][0], span);
      assert.ok(!exportStub.called);

    });

    it('initializes with a metric reader', async function() {

      const onShutdown = sinon.stub().resolves();
      const metricReader = new class extends MetricReader {
        protected onShutdown = onShutdown
        protected async onForceFlush(): Promise<void> {
        }
      } as MetricReader;

      const fastlySdk = new FastlySDK({metricReader});
      await fastlySdk.start();
      await fastlySdk.shutdown();

      assert.ok(onShutdown.called);

    });

    it('uses the provided resource', async function() {

      const resource = new Resource({__test_value: 'foo'});

      const exportStub = sinon.stub();
      const traceExporter: SpanExporter = {
        export: exportStub,
        async shutdown(): Promise<void> {}
      };

      const fastlySdk = new FastlySDK({traceExporter, resource});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');
      span.end();

      const readableSpan = exportStub.args[0][0][0] as ReadableSpan;
      assert.strictEqual(readableSpan.resource.attributes.__test_value, 'foo');

    });

    it('accepts sampler', async function() {

      const shouldSample = sinon.stub().returns({ decision:SamplingDecision.RECORD });
      const sampler: Sampler = {
        shouldSample,
        toString(): string {
          return 'test-sampler';
        }
      };

      const traceExporter: SpanExporter = {
        export(spans, resultCallback) {},
        async shutdown(): Promise<void> {}
      };
      const fastlySdk = new FastlySDK({traceExporter, sampler});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');

      assert.ok(shouldSample.calledOnce);
      assert.strictEqual(shouldSample.args[0][2], 'test-span');

      span.end();

    });

    it('accepts spanLimits', async function() {

      const spanLimits = {
        attributeCountLimit: 100,
      };

      const traceExporter: SpanExporter = {
        export(spans, resultCallback) {},
        async shutdown(): Promise<void> {}
      };
      const fastlySdk = new FastlySDK({traceExporter, spanLimits});
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer') as Tracer;

      assert.strictEqual(tracer.getSpanLimits().attributeCountLimit, spanLimits.attributeCountLimit);

    });


    it('can use added resource', async function() {

      const resource = new Resource({__test_value: 'foo'});

      const exportStub = sinon.stub();
      const traceExporter: SpanExporter = {
        export: exportStub,
        async shutdown(): Promise<void> {}
      };

      const fastlySdk = new FastlySDK({traceExporter, resource});
      fastlySdk.addResource(new Resource({__test_value: 'bar'}))
      await fastlySdk.start();

      const tracer = trace.getTracerProvider()
        .getTracer('test-tracer');
      const span = tracer.startSpan('test-span');
      span.end();

      const readableSpan = exportStub.args[0][0][0] as ReadableSpan;
      assert.strictEqual(readableSpan.resource.attributes.__test_value, 'bar');

    });

    it('initializes specified instrumentations', async function() {

      const enableStub = sinon.stub();
      const instrumentation: Instrumentation = {
        instrumentationName: "test-instrumentation",
        instrumentationVersion: "",
        disable(): void {},
        enable: enableStub,
        getConfig() { return {}; },
        setConfig(config): void {},
        setMeterProvider(meterProvider): void {},
        setTracerProvider(tracerProvider): void {},
      };
      const instrumentations = [
        instrumentation,
      ];

      const fastlySdk = new FastlySDK({instrumentations});
      await fastlySdk.start();

      assert.ok(enableStub.calledOnce);
    });

  });
  describe('build-time vs deferred initialization', function() {

    it('when build-time initialization is used, components are initialized before fetch event', async function() {

      const diagLogger = newNopDiagLogger();
      const stubLoggerDebug = sinon.stub();
      diagLogger.debug = stubLoggerDebug;
      diag.setLogger(diagLogger, DiagLogLevel.ALL);

      const traceExporter = {} as SpanExporter;
      const fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start();

      assert.ok(
        checkLog(stubLoggerDebug, /@opentelemetry\/api: Registered a global for trace v\d+.\d+.\d+./),
      );

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

    });

    it('when deferred initialization is used, components are initialized after fetch event', async function() {

      const diagLogger = newNopDiagLogger();
      const stubLoggerDebug = sinon.stub();
      diagLogger.debug = stubLoggerDebug;
      diag.setLogger(diagLogger, DiagLogLevel.ALL);

      const traceExporter = {} as SpanExporter;
      const fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start(config => config);

      assert.ok(
        checkLog(stubLoggerDebug, /@opentelemetry\/api: Registered a global for trace v\d+.\d+.\d+./, 0),
      );

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerDebug, /@opentelemetry\/api: Registered a global for trace v\d+.\d+.\d+./),
      );

    });

  });

  describe('event lifetime management', function() {

    let diagLogger: DiagLogger;
    let stubLoggerDebug: sinon.SinonStub;
    let stubLoggerWarn: sinon.SinonStub;

    let traceExporter: SpanExporter;
    let fastlySdk: FastlySDK;

    beforeEach(async function() {
      diagLogger = newNopDiagLogger();
      stubLoggerDebug = sinon.stub();
      stubLoggerWarn = sinon.stub();
      diagLogger.debug = stubLoggerDebug;
      diagLogger.warn = stubLoggerWarn;
      diag.setLogger(diagLogger, DiagLogLevel.ALL);

      traceExporter = {
        export(spans, resultCallback) {},
        shutdown: sinon.stub<[], Promise<void>>(),
      };
      fastlySdk = new FastlySDK({traceExporter});
      await fastlySdk.start();
    });

    it('should cause patched event.respondWith to be called.', async function() {

      function handleEvent(event: FetchEvent) {
        return new MockedResponse('success', { status: 200 });
      }
      addEventListener('fetch', (event) => event.respondWith(handleEvent(event)));

      const fetchEvent = buildFakeFetchEvent();
      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerDebug, 'sdk-fastly: running patched event.respondWith()')
      );
      assert.ok(
        checkLog(stubLoggerWarn, 'sdk-fastly: detected multiple calls to respondWith() on a single event', 0)
      );

    });

    it('should still call original event.respondWith.', async function() {

      const response = new MockedResponse('success', { status: 200 });
      function handleEvent(event: FetchEvent) {
        return response;
      }
      addEventListener('fetch', (event) => event.respondWith(handleEvent(event)));

      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith;

      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(origRespondWith.calledOnce);
      assert.strictEqual(origRespondWith.args[0][0], response);

    });

    it('should cause a handler that calls event.respondWith more than once to raise a warning message.', async function() {

      function handleEvent(event: FetchEvent) {
        return new MockedResponse('success', { status: 200 });
      }
      addEventListener('fetch', (event) => {
        event.respondWith(handleEvent(event));
        event.respondWith(handleEvent(event));
      });

      const fetchEvent = buildFakeFetchEvent();
      const origRespondWith = fetchEvent.respondWith;

      runRegisteredFetchEventListeners(fetchEvent);

      assert.ok(
        checkLog(stubLoggerWarn, 'sdk-fastly: detected multiple calls to respondWith() on a single event')
      );
      assert.ok(origRespondWith.calledTwice);

    });

    it('should cause event.waitUntil to get called', async function() {
      const response = new MockedResponse('success', { status: 200 })
      function handleEvent(event: FetchEvent) {
        return response;
      }
      addEventListener('fetch', (event) => event.respondWith(handleEvent(event)));

      const fetchEvent = buildFakeFetchEvent();
      const origWaitUntil = fetchEvent.waitUntil;

      runRegisteredFetchEventListeners(fetchEvent);

      // At this point it's been called once only.
      assert.ok(origWaitUntil.calledOnce);
      const extensionPromise = origWaitUntil.args[0][0];

      // Awaiting this would mean that the response is good to go.
      await extensionPromise;

      // At this point, waitUntil would have been called an additional time, with
      // the promise that would be returned from calling shutdown on SDK.
      assert.ok(origWaitUntil.calledTwice);
      const shutdownPromise = origWaitUntil.args[1][0];

      // Awaiting this would ensure the SDK has completely shut down.
      await shutdownPromise;

      // That shutdown would also have caused shutdown on the trace exporter to
      // have been called
      assert.ok((traceExporter.shutdown as sinon.SinonStub).calledOnce)

    });

    it('SDK without a tracer should also start and shut down without a problem', async function() {

      fastlySdk = new FastlySDK();
      await fastlySdk.start();

      function handleEvent(event: FetchEvent) {
        return new MockedResponse('success', { status: 200 });
      }
      addEventListener('fetch', (event) => event.respondWith(handleEvent(event)));

      const fetchEvent = buildFakeFetchEvent();
      const origWaitUntil = fetchEvent.waitUntil;

      runRegisteredFetchEventListeners(fetchEvent);

      // At this point it's been called once only.
      assert.ok(origWaitUntil.calledOnce);
      const extensionPromise = origWaitUntil.args[0][0];

      // Await the response
      await extensionPromise;

      // At this point, waitUntil would have been called an additional time, with
      // the promise that would be returned from calling shutdown on SDK.
      assert.ok(origWaitUntil.calledTwice);
      const shutdownPromise = origWaitUntil.args[1][0];

      // Await the shutdown of the SDK.
      await shutdownPromise;

    });

  });
});
