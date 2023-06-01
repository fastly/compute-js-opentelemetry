/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Logger } from "fastly:logger";
import { DiagLogFunction, DiagLogger } from "@opentelemetry/api";

import { toLoggerString } from "../core";

const consoleMap: { n: keyof DiagLogger; l: string }[] = [
  { n: 'error', l: 'ERROR', },
  { n: 'warn', l: 'WARN', },
  { n: 'info', l: 'INFO', },
  { n: 'debug', l: 'DEBUG', },
  { n: 'verbose', l: 'VERBOSE', },
];

/**
 * A simple diagnostic logger which will output any messages through a Fastly Compute@Edge
 * named log provider.
 */
export class DiagFastlyLogger implements DiagLogger {
  constructor(endpoint: string) {
    let logger: Logger | null = null;

    function _consoleFunc(label: string): DiagLogFunction {
      return function (...args) {
        if (logger == null) {
          try {
            logger = new Logger(endpoint);
          } catch(ex) {
            // This can fail for example if you try to do this outside of
            // processing of requests. In that case we will log an error
            // to console, and give up on the attempted log.
            console.error(String(ex));
            return;
          }
        }
        const messageString = label + ': ' + toLoggerString(...args);
        logger.log(messageString)
      };
    }

    for (let i = 0; i < consoleMap.length; i++) {
      this[consoleMap[i].n] = _consoleFunc(consoleMap[i].l);
    }
  }

  public error!: DiagLogFunction;
  public warn!: DiagLogFunction;
  public info!: DiagLogFunction;
  public debug!: DiagLogFunction;
  public verbose!: DiagLogFunction;
}
