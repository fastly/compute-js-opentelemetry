/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ContextManager, TextMapPropagator, metrics } from "@opentelemetry/api";

import { InstrumentationOption, registerInstrumentations } from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";
import { SimpleSpanProcessor, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";

import { FastlySDKConfiguration } from "./types";
import { FastlySpanProcessor, FastlyTracerConfig, FastlyTracerProvider } from "../opentelemetry-sdk-trace-fastly";
import { setPatchTarget } from "./util";
import { OTLPExporterFastlyBackendBase } from "../otlp-exporter-fastly-base";

type TransformConfigurationFunction = (configuration: Partial<FastlySDKConfiguration>, event: FetchEvent) => Partial<FastlySDKConfiguration>;

export class FastlySDK {
  private _resource: Resource;

  private _tracerProviderConfig?: {
    tracerConfig: FastlyTracerConfig;
    spanProcessor: SpanProcessor;
    contextManager?: ContextManager;
    textMapPropagator?: TextMapPropagator;
  };
  private _tracerProvider?: FastlyTracerProvider;

  private _metricReader?: MetricReader;
  private _meterProvider?: MeterProvider;

  private _instrumentations: InstrumentationOption[];

  /** a copy of the configuration object passed to the constructor. */
  private _configuration: Partial<FastlySDKConfiguration>;

  /**
   * @private
   * An optional function that can be set, by passing it into the start() function.
   * If this is set, then when a FetchEvent starts, this transform configuration will
   * run against the saved configuration object, giving the application an opportunity
   * to modify the configuration and start the SDK with the modified configuration.
  */
  private _transformConfiguration?: TransformConfigurationFunction;

  public constructor(configuration: Partial<FastlySDKConfiguration> = {}) {
    this._configuration = configuration;
    this._resource = new Resource({});
    this._instrumentations = [];
    this._initConfiguration(this._configuration);
  }

  /**
   * @private
   * Apply the initial configuration that is set during the constructor, or,
   * if a transform configuration is passed to the start() function, after it is
   * called in response to the start of a FetchEvent.
   */
  private _initConfiguration(configuration: Partial<FastlySDKConfiguration>) {
    this._resource = configuration.resource ?? new Resource({});

    if (configuration.spanProcessor || configuration.traceExporter) {
      const tracerProviderConfig: FastlyTracerConfig = {};

      if (configuration.sampler) {
        tracerProviderConfig.sampler = configuration.sampler;
      }
      if (configuration.spanLimits) {
        tracerProviderConfig.spanLimits = configuration.spanLimits;
      }

      const SpanProcessorClass =
        configuration.traceExporter instanceof OTLPExporterFastlyBackendBase ?
          FastlySpanProcessor : SimpleSpanProcessor;

      const spanProcessor =
        configuration.spanProcessor ??
        new SpanProcessorClass(configuration.traceExporter!);

      this.configureTracerProvider(
        tracerProviderConfig,
        spanProcessor,
        configuration.contextManager,
        configuration.textMapPropagator,
      );
    }

    if (configuration.metricReader) {
      this.configureMeterProvider(configuration.metricReader);
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
    textMapPropagator?: TextMapPropagator,
  ): void {
    this._tracerProviderConfig = {
      tracerConfig,
      spanProcessor,
      contextManager,
      textMapPropagator,
    };
  }

  /** Set configurations needed to register a MeterProvider */
  public configureMeterProvider(reader: MetricReader): void {
    this._metricReader = reader;
  }

  /** Manually add a resource */
  public addResource(resource: Resource): void {
    this._resource = this._resource.merge(resource);
  }

  /**
   * @private
   * Apply the various configurations that have been set up by _initConfiguration(),
   * which has been called either by the constructor or in response to the FetchEvent.
   */
  private _applyConfiguration() {
    if (this._tracerProviderConfig) {
      const tracerProvider = new FastlyTracerProvider({
        ...this._tracerProviderConfig.tracerConfig,
        resource: this._resource,
      });

      this._tracerProvider = tracerProvider;

      tracerProvider.addSpanProcessor(this._tracerProviderConfig.spanProcessor);
      tracerProvider.register({
        contextManager: this._tracerProviderConfig.contextManager,
        propagator: this._tracerProviderConfig.textMapPropagator,
      });
    }

    if (this._metricReader) {
      const meterProvider = new MeterProvider({
        resource: this._resource,
      });
      meterProvider.addMetricReader(this._metricReader);

      this._meterProvider = meterProvider;

      metrics.setGlobalMeterProvider(meterProvider);
    }

    registerInstrumentations({
      instrumentations: this._instrumentations,
    });
  }

  /**
   * Start the SDK by applying the configuration.
   * This function can be called with an optional transform configuration function.
   * If it is, then the remaining steps of applying the configuration are deferred until
   * event start.
   * @param transform
   */
  async start(transform?: TransformConfigurationFunction) {

    setPatchTarget(this);

    if(transform != null) {
      this._transformConfiguration = transform;
    } else {
      this._applyConfiguration();
    }

  }

  /**
   * Shut down the SDK.  Returns a promise that settles when the components have
   * finished shutting down.
   */
  public shutdown(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (this._tracerProvider) {
      promises.push(this._tracerProvider.shutdown());
    }
    if (this._meterProvider) {
      promises.push(this._meterProvider.shutdown());
    }

    return (
      Promise.all(promises)
        // return void instead of the array from Promise.all
        .then(() => {
        })
    );
  }

  /**
   * When the FetchEvent happens, check if start() had been called with a transform
   * function. If so, then perform the transform and apply all of the configuration
   * at this point.
   * @param event
   */
  public onEventStart(event: FetchEvent) {
    if(this._transformConfiguration != null) {
      this._configuration = this._transformConfiguration(this._configuration, event);
      this._tracerProviderConfig = undefined;
      this._initConfiguration(this._configuration);
      this._applyConfiguration();
    }
  }
}
