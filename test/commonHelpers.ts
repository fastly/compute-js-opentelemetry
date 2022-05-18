/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { DiagLogger } from "@opentelemetry/api";

export function newNopDiagLogger() {
  const nop = () => {
  };
  const diagLogger: DiagLogger = {
    verbose: nop,
    debug: nop,
    info: nop,
    warn: nop,
    error: nop,
  };
  return diagLogger;
}
