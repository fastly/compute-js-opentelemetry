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
  StackContextManager
} from './StackContextManager';

/**
 * FastlyTracerConfig provides an interface for configuring a Fastly Tracer.
 */
export type FastlyTracerConfig = TracerConfig;

/**
 * This class represents a tracer with {@link StackContextManager}
 */
export class FastlyTracerProvider extends BasicTracerProvider {
  /**
   * Constructs a new Tracer instance.
   * @param config Web Tracer config
   */
  constructor(config: FastlyTracerConfig = {}) {
    super(config);

    if ((config as SDKRegistrationConfig).contextManager) {
      throw (
        'contextManager should be defined in register method not in' +
        ' constructor'
      );
    }
    if ((config as SDKRegistrationConfig).propagator) {
      throw 'propagator should be defined in register method not in constructor';
    }
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
      config.contextManager = new StackContextManager();
    }
    if (config.contextManager) {
      config.contextManager.enable();
    }

    super.register(config);
  }
}
