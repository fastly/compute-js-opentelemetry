/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import {
  BasicTracerProvider,
  SDKRegistrationConfig,
  TracerConfig,
} from '@opentelemetry/sdk-trace-base';
import {
  FastlyStackContextManager
} from './FastlyStackContextManager.js';

/**
 * FastlyTracerConfig provides an interface for configuring a Fastly Tracer.
 */
export type FastlyTracerConfig = TracerConfig;

/**
 * This class represents a tracer with {@link FastlyStackContextManager}
 */
export class FastlyTracerProvider extends BasicTracerProvider {
  /**
   * Constructs a new Tracer instance.
   * @param config Fastly Tracer config
   */
  constructor(config: FastlyTracerConfig = {}) {
    super(config);
  }

  /**
   * Register this TracerProvider for use with the OpenTelemetry API.
   * Undefined values may be replaced with defaults, and
   * null values will be skipped.
   *
   * @param config Configuration object for SDK registration
   */
  override register(config: SDKRegistrationConfig = {}): void {
    if (config.contextManager === undefined) {
      config.contextManager = new FastlyStackContextManager();
    }
    if (config.contextManager) {
      config.contextManager.enable();
    }

    super.register(config);
  }
}
