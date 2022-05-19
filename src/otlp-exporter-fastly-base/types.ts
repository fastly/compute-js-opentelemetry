/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base/build/src/platform/node';
export { CompressionAlgorithm };

/**
 * Collector Exporter Fastly Compute@Edge backend base config
 */
export interface OTLPExporterFastlyBackendConfigBase extends OTLPExporterConfigBase {
    backend: string;
    compression?: CompressionAlgorithm;
}

/**
 * Collector Exporter Fastly Compute@Edge named log providers base config
 */
export interface OTLPExporterFastlyLoggerConfigBase extends OTLPExporterConfigBase {
    endpoint: string;
}
