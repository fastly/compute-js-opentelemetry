/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';

/**
 * Collector Exporter Fastly Compute@Edge backend base config
 */
export interface OTLPExporterFastlyBackendConfigBase extends OTLPExporterConfigBase {
    backend: string;
    cacheOverride?: CacheOverride;
    compression?: CompressionAlgorithm;
}

export enum CompressionAlgorithm {
    NONE = "none",
    GZIP = "gzip"
}

/**
 * Collector Exporter Fastly Compute@Edge named log providers base config
 */
export interface OTLPExporterFastlyLoggerConfigBase extends OTLPExporterConfigBase {
    endpoint: string;
}
