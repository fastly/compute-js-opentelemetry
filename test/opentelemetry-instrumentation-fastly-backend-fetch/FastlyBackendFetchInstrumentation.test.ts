/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { SpanStatusCode, SpanKind, Span } from "@opentelemetry/api";
import { ExportResult, ExportResultCode, parseTraceParent } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { SemanticAttributes, SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ReadableSpan, SimpleSpanProcessor, SpanExporter } from "@opentelemetry/sdk-trace-base";

import { MockedResponse } from "../computeHelpers";
import {
  FastlyBackendFetchInstrumentation,
  FastlyBackendFetchInstrumentationConfig
} from "../../src/opentelemetry-instrumentation-fastly-backend-fetch";
import { FastlySDK } from "../../src/opentelemetry-sdk-fastly";

declare function setFetchFunc(fn: (resource: RequestInfo, init?: RequestInit) => Promise<Response>): void;
declare function resetFetchFunc(): void;

describe('FastlyBackendFetchInstrumentation', function() {
  describe('instance', function() {
    it('can be instantiated', function() {
      const instrumentation = new FastlyBackendFetchInstrumentation();
      assert.strictEqual(instrumentation.instrumentationName, '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch');
      assert.strictEqual(instrumentation.instrumentationVersion, '0.1.0');
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });

    it('can be instantiated disabled', function() {
      const instrumentation = new FastlyBackendFetchInstrumentation({enabled: false});
      assert.ok(!instrumentation._eventsInstalled);
      assert.ok(!instrumentation._eventsEnabled);
    });

    it('can be instantiated disabled and then enabled', function() {
      const instrumentation = new FastlyBackendFetchInstrumentation({enabled: false});
      instrumentation.enable();
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });

    it('can be instantiated enabled, disabled, and then enabled again', function() {
      const instrumentation = new FastlyBackendFetchInstrumentation();
      instrumentation.disable();
      instrumentation.enable();
      assert.ok(instrumentation._eventsInstalled);
      assert.ok(instrumentation._eventsEnabled);
    });
  });

  describe('fetch hook', function() {
    it('if the instrumentation is disabled, then fetch() happens normally', async function() {

      const instrumentation = new FastlyBackendFetchInstrumentation();
      instrumentation.disable();

      setFetchFunc(sinon.stub().resolves(new MockedResponse('foo', {status: 200})));
      const onBackendFetchSpy = sinon.spy(instrumentation, 'onBackendFetch');

      await fetch('http://www.example.com/');

      // the hook should not have been called.
      assert.ok(onBackendFetchSpy.notCalled);

    });

    it('if the instrumentation is enabled, but request init says to exclude from telemetry, then fetch() happens normally', async function() {

      const instrumentation = new FastlyBackendFetchInstrumentation();

      setFetchFunc(sinon.stub().resolves(new MockedResponse('foo', {status: 200})));
      const onBackendFetchSpy = sinon.spy(instrumentation, 'onBackendFetch');

      await fetch('http://www.example.com/', {excludeFromTelemetry: true} as RequestInit);

      // the hook should not have been called.
      assert.ok(onBackendFetchSpy.notCalled);

    });

    it('if the instrumentation is enabled, then fetch() triggers onBackendFetch(), with string url', async function() {

      const instrumentation = new FastlyBackendFetchInstrumentation();

      setFetchFunc(sinon.stub().resolves(new MockedResponse('foo', {status: 200})));
      const onBackendFetchSpy = sinon.spy(instrumentation, 'onBackendFetch');

      await fetch('http://www.example.com/', { backend: 'test-backend', method: 'GET' });

      // the hook should not have been called.
      assert.ok(onBackendFetchSpy.calledOnce);

    });

    it('if the instrumentation is enabled, then fetch() triggers onBackendFetch(), with Request object', async function() {

      const instrumentation = new FastlyBackendFetchInstrumentation();

      setFetchFunc(sinon.stub().resolves(new MockedResponse('foo', {status: 200})));
      const onBackendFetchSpy = sinon.spy(instrumentation, 'onBackendFetch');

      await fetch({url: 'http://www.example.com/'} as Request, { backend: 'test-backend' });

      // the hook should not have been called.
      assert.ok(onBackendFetchSpy.calledOnce);

    });
  });

  describe('instrumentation', function() {
    let traceExporter: SpanExporter;
    let fastlySdk: FastlySDK;
    let fetchFunc: sinon.SinonStub<[RequestInfo, RequestInit | undefined], Promise<Response>>;
    beforeEach(async function() {
      traceExporter = new class implements SpanExporter {
        export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
          resultCallback({code: ExportResultCode.SUCCESS});
        }
        async shutdown() {}
      }

      let instrumentationConfig: FastlyBackendFetchInstrumentationConfig | undefined = undefined;
      if(this.currentTest?.title === 'apply custom attributes') {
        instrumentationConfig = {
          applyCustomAttributesOnSpan(span: Span) {
            span.setAttribute('test', 'test-value');
          },
        };
      }

      const instrumentations = [
        new FastlyBackendFetchInstrumentation(instrumentationConfig),
      ];
      const resource = new Resource({
        'service.name': 'test-resource',
      });
      const spanProcessor = new SimpleSpanProcessor(traceExporter);
      fastlySdk = new FastlySDK({spanProcessor, instrumentations, resource});
      await fastlySdk.start();

      fetchFunc = sinon.stub<[RequestInfo, RequestInit | undefined], Promise<Response>>().resolves(new MockedResponse('foo', {status: 200}));
      setFetchFunc(fetchFunc);
    });

    it('fetch makes a trace', async function() {
      const exportStub = sinon.spy(traceExporter, 'export');

      await fetch('http://www.example.com/');

      assert.ok(exportStub.calledOnce);
      const readableSpans = exportStub.args[0][0];
      assert.strictEqual(readableSpans.length, 1);

      const readableSpan = readableSpans[0];

      assert.strictEqual(readableSpan.resource.attributes[SemanticResourceAttributes.SERVICE_NAME], 'test-resource');
      assert.strictEqual(readableSpan.status.code, SpanStatusCode.OK);
      assert.strictEqual(readableSpan.kind, SpanKind.CLIENT);
      assert.strictEqual(readableSpan.attributes['component'], '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch');
      assert.strictEqual(readableSpan.attributes[SemanticAttributes.HTTP_METHOD], 'GET');
      assert.strictEqual(readableSpan.attributes[SemanticAttributes.HTTP_URL], 'http://www.example.com/');
      assert.strictEqual(readableSpan.attributes[SemanticAttributes.HTTP_STATUS_CODE], 200);
    });

    it('apply custom attributes', async function() {
      const exportStub = sinon.spy(traceExporter, 'export');

      await fetch('http://www.example.com/');

      assert.ok(exportStub.calledOnce);
      const readableSpans = exportStub.args[0][0];
      assert.strictEqual(readableSpans.length, 1);

      const readableSpan = readableSpans[0];
      assert.strictEqual(readableSpan.attributes['test'], 'test-value');
    });

    it('fetch propagates context', async function() {
      const exportStub = sinon.spy(traceExporter, 'export');

      await fetch('http://www.example.com/');

      assert.ok(exportStub.calledOnce);
      const readableSpans = exportStub.args[0][0];
      assert.strictEqual(readableSpans.length, 1);
      const readableSpan = readableSpans[0];

      const requestInfo = fetchFunc.args[0][1];
      assert.ok(requestInfo?.headers != null);
      const traceparent = (requestInfo.headers as Record<string, string>)['traceparent'];

      // Make sure that the elements of the propagated context match
      // the elements of the span generated by the fetch.
      const spanContext = parseTraceParent(traceparent);
      assert.strictEqual(spanContext?.traceId, readableSpan.spanContext().traceId);
      assert.strictEqual(spanContext?.spanId, readableSpan.spanContext().spanId);
      assert.strictEqual(spanContext?.traceFlags, readableSpan.spanContext().traceFlags);
    });

    it('fetch error makes an error trace', async function() {

      fetchFunc.rejects(new Error('foo'));

      const exportStub = sinon.spy(traceExporter, 'export');

      try {
        await fetch('http://www.example.com/');
      } catch {
      }

      assert.ok(exportStub.calledOnce);
      const readableSpans = exportStub.args[0][0];
      assert.strictEqual(readableSpans.length, 1);

      const readableSpan = readableSpans[0];
      assert.strictEqual(readableSpan.status.code, SpanStatusCode.ERROR);
      assert.strictEqual(readableSpan.events.length, 1);

      const event = readableSpan.events[0];
      assert.strictEqual(event.name, 'exception');
      assert.strictEqual(event.attributes?.['exception.type'], 'Error');
      assert.strictEqual(event.attributes?.['exception.message'], 'foo');
    });
  });
});
