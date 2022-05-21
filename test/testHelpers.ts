import * as sinon from 'sinon';
import { diag, context, propagation, trace } from "@opentelemetry/api";
import { doInit, removeAllActions } from "../src/core";
import { resetRegisteredFetchEventListeners } from "./computeHelpers";

declare global {
  function onBeforeEach(): void;
  function onAfterEach(): void;
}

globalThis.onBeforeEach = () => {
  resetRegisteredFetchEventListeners();
  removeAllActions();
  doInit();
};

globalThis.onAfterEach = () => {
  diag.disable();
  trace.disable();
  context.disable();
  propagation.disable();
  sinon.restore();
};
