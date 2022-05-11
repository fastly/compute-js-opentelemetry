/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ContextManager } from "@opentelemetry/api";

import { InstrumentationOption, registerInstrumentations } from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";
import { SimpleSpanProcessor, SpanProcessor } from "@opentelemetry/sdk-trace-base";

import { FastlySDKConfiguration } from "./types";
import { FastlyTracerConfig, FastlyTracerProvider } from "../opentelemetry-sdk-trace-fastly";
import { setPatchTarget } from "./util";

export class FastlySDK {
  private _resource: Resource;

  private _tracerProviderConfig?: {
    tracerConfig: FastlyTracerConfig;
    spanProcessor: SpanProcessor;
    contextManager?: ContextManager;
  };
  private _tracerProvider?: FastlyTracerProvider;

  private readonly _instrumentations: InstrumentationOption[];

  public constructor(configuration: Partial<FastlySDKConfiguration> = {}) {
    this._resource = configuration.resource ?? new Resource({});

    if (configuration.spanProcessor || configuration.traceExporter) {
      const tracerProviderConfig: FastlyTracerConfig = {};

      if (configuration.sampler) {
        tracerProviderConfig.sampler = configuration.sampler;
      }
      if (configuration.spanLimits) {
        tracerProviderConfig.spanLimits = configuration.spanLimits;
      }

      const spanProcessor =
        configuration.spanProcessor ??
        new SimpleSpanProcessor(configuration.traceExporter!);

      this.configureTracerProvider(
        tracerProviderConfig,
        spanProcessor,
        configuration.contextManager,
      );
    }

    let instrumentations: InstrumentationOption[] = [];
    if (configuration.instrumentations) {
      instrumentations = configuration.instrumentations;
    }
    this._instrumentations = instrumentations;
  }

  /** Set configurations required to register a FastlyTracerProvider */
  public configureTracerProvider(
    tracerConfig: FastlyTracerConfig,
    spanProcessor: SpanProcessor,
    contextManager?: ContextManager,
  ): void {
    this._tracerProviderConfig = {
      tracerConfig,
      spanProcessor,
      contextManager,
    };
  }

  /** Manually add a resource */
  public addResource(resource: Resource): void {
    this._resource = this._resource.merge(resource);
  }

  async start() {
    if (this._tracerProviderConfig) {
      const tracerProvider = new FastlyTracerProvider({
        ...this._tracerProviderConfig.tracerConfig,
        resource: this._resource,
      });

      this._tracerProvider = tracerProvider;

      tracerProvider.addSpanProcessor(this._tracerProviderConfig.spanProcessor);
      tracerProvider.register({
        contextManager: this._tracerProviderConfig.contextManager,
      });
    }

    registerInstrumentations({
      instrumentations: this._instrumentations,
    });

    setPatchTarget(this);
  }

  public shutdown(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (this._tracerProvider) {
      promises.push(this._tracerProvider.shutdown());
    }
    // if (this._meterProvider) {
    //   promises.push(this._meterProvider.shutdown());
    // }

    return (
      Promise.all(promises)
        // return void instead of the array from Promise.all
        .then(() => {
        })
    );
  }
}
