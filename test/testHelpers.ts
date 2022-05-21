import * as sinon from 'sinon';
import { diag, context, propagation, trace } from "@opentelemetry/api";

declare global {
  function onAfterEach(): void;
}

globalThis.onAfterEach = () => {
  diag.disable();
  trace.disable();
  context.disable();
  propagation.disable();
  sinon.restore();
};
