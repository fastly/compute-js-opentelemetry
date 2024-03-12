/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import * as sinon from 'sinon';
import { DiagLogger } from '@opentelemetry/api';

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

export function checkLog(logStub: sinon.SinonStub<any[], void>, message: string | RegExp, count: number = 1): boolean {
  return logStub.args.filter(args => message instanceof RegExp ? message.test(args[0]) : args[0] === message).length === count;
}
