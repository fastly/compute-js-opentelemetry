/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Span } from '@opentelemetry/api';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';

export type FastlyBackendFetchCustomAttributeFunction = (span: Span, resource: RequestInfo | URL, init: RequestInit | undefined, response: Response) => void;

export interface FastlyBackendFetchInstrumentationConfig extends InstrumentationConfig {
  /** Function for adding custom attributes after response is handled */
  applyCustomAttributesOnSpan?: FastlyBackendFetchCustomAttributeFunction;
}
