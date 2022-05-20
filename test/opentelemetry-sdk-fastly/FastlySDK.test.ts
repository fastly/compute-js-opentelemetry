import * as assert from "assert";

import * as sinon from "sinon";

import { diag, DiagLogLevel, trace, } from "@opentelemetry/api";
import { ReadableSpan, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { Instrumentation } from "@opentelemetry/instrumentation";

import { buildFakeFetchEvent, runRegisteredFetchEventListeners } from "../computeHelpers";
import { checkLog, newNopDiagLogger } from "../commonHelpers";
import { removeAction } from "../../src/core";
import { FastlySDK } from "../../src/opentelemetry-sdk-fastly";
import { _fastly_sdk_init } from "../../src/opentelemetry-sdk-fastly/util";

describe('FastlySDK', function() {
  beforeEach(function() {
    sinon.restore();
    diag.disable();
    trace.disable();
    removeAction('fetchEvent');
    _fastly_sdk_init();
  });

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
});
