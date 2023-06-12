/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

/**
 * An implementation of the {@link SpanProcessor} that converts {@link Span}s from a single
 * FetchEvent to {@link ReadableSpan}s and passes them to the configured exporter.
 *
 * Only spans that are sampled are converted.
 *
 * It is recommended to use this over SimpleSpanProcessor in Compute@Edge when using
 * an exporter that sends data using a Fastly backend, because each Compute@Edge invocation
 * has a limit on the number of allowed backend fetches.
 */
import { Context, TraceFlags } from "@opentelemetry/api";
import {
  internal,
  globalErrorHandler,
  BindOnceFuture,
  ExportResultCode,
  ExportResult,
} from "@opentelemetry/core";
import { ReadableSpan, Span, SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-base";

export class FastlySpanProcessor implements SpanProcessor {
  private _finishedSpans: ReadableSpan[] = [];
  private _shutdownOnce: BindOnceFuture<void>;

  constructor(private readonly _exporter: SpanExporter) {
    this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
  }

  forceFlush(): Promise<void> {
    if (this._shutdownOnce.isCalled) {
      return this._shutdownOnce.promise;
    }
    return this._flushAll();
  }

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    if (this._shutdownOnce.isCalled) {
      return;
    }

    if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
      return;
    }

    this._addToBuffer(span);
  }

  shutdown(): Promise<void> {
    return this._shutdownOnce.call();
  }

  private _shutdown(): Promise<void> {
    return Promise.resolve()
      .then(() => {
        return this.onShutdown();
      })
      .then(() => {
        return this._flushAll();
      })
      .then(() => {
        return this._exporter.shutdown();
      });
  }

  /** Add a span in the buffer. */
  private _addToBuffer(span: ReadableSpan) {
    this._finishedSpans.push(span);
  }

  /**
   * Send all buffered spans to the exporter.
   * */
  private _flushAll(): Promise<void> {
    if (this._finishedSpans.length === 0) {
      return Promise.resolve();
    }

    const doExport = () =>
      internal
        ._export(this._exporter, this._finishedSpans)
        .then((result: ExportResult) => {
          if (result.code !== ExportResultCode.SUCCESS) {
            globalErrorHandler(
              result.error ??
              new Error(
                `FastlySpanProcessor: span export failed (status ${result})`
              )
            );
          }
        });

    const resourceAsyncAttributes =
      this._finishedSpans
        .map(span => {
          if (span.resource.asyncAttributesPending) {
            return span.resource.waitForAsyncAttributes?.();
          }
          return null;
        });

    return Promise.all(resourceAsyncAttributes)
      .then(() => doExport())
      .catch(error => globalErrorHandler(error));
  }

  protected onShutdown(): void {
  }
}
