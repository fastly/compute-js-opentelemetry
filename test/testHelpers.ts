import * as sinon from 'sinon';
import { diag, context, propagation, trace } from "@opentelemetry/api";
import { doInit, doShutdown, removeAllActions } from "../src/core";
import {
  registerFastlyNamespacedMocks,
  resetRegisteredFetchEventListeners,
} from "./computeHelpers";

declare global {
  function onBeforeEach(): void;
  function onAfterEach(): void;
}

registerFastlyNamespacedMocks();

globalThis.onBeforeEach = () => {
  resetRegisteredFetchEventListeners();
  removeAllActions();
  doInit();
};

globalThis.onAfterEach = () => {
  doShutdown();
  diag.disable();
  trace.disable();
  context.disable();
  propagation.disable();
  sinon.restore();
};
