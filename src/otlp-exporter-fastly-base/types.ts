/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { CompressionAlgorithm, OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';

/**
 * Collector Exporter Fastly Compute backend base config
 */
export interface OTLPExporterFastlyBackendConfigBase extends OTLPExporterConfigBase {
    backend: string;
    compression?: CompressionAlgorithm;
}

/**
 * Collector Exporter Fastly Compute named log providers base config
 */
export interface OTLPExporterFastlyLoggerConfigBase extends OTLPExporterConfigBase {
    endpoint: string;
}
