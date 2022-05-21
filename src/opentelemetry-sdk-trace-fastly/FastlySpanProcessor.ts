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
import { context, Context, TraceFlags } from "@opentelemetry/api";
import { BindOnceFuture, ExportResultCode, suppressTracing } from "@opentelemetry/core";
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
    return new Promise((resolve, reject) => {
      // prevent downstream exporter calls from generating spans
      context.with(suppressTracing(context.active()), () => {
        // Reset the finished spans buffer here because the next invocations of the _flush method
        // could pass the same finished spans to the exporter if the buffer is cleared
        // outside of the execution of this callback.
        this._exporter.export(
          this._finishedSpans,
          result => {
            if (result.code === ExportResultCode.SUCCESS) {
              resolve();
            } else {
              reject(
                result.error ??
                new Error('BatchSpanProcessor: span export failed')
              );
            }
          }
        );
      });
    });
  }

  protected onShutdown(): void {
  }
}
