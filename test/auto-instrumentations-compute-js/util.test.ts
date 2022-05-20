/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import assert from "assert";

import * as sinon from "sinon";

import { diag } from "@opentelemetry/api";

import '../computeHelpers';
import { getComputeJsAutoInstrumentations } from "../../src/auto-instrumentations-compute-js";
import { FastlyBackendFetchInstrumentationConfig } from "../../src/opentelemetry-instrumentation-fastly-backend-fetch";
import { newNopDiagLogger } from "../commonHelpers";

describe('utils', () => {
  describe('getComputeJsAutoInstrumentations', () => {

    beforeEach(function() {
      sinon.restore();
      diag.disable();
    });

    it('should load default instrumentations', () => {
      const instrumentations = getComputeJsAutoInstrumentations();
      const expectedInstrumentations = [
        '@fastly/compute-js-opentelemetry/instrumentation-fastly-compute-js',
        '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch',
      ];
      assert.strictEqual(instrumentations.length, expectedInstrumentations.length);
      for (let i = 0, j = instrumentations.length; i < j; i++) {
        assert.strictEqual(
          instrumentations[i].instrumentationName,
          expectedInstrumentations[i],
          `Instrumentation ${expectedInstrumentations[i]}, not loaded`
        );
      }
    });

    it('should use user config', () => {
      function applyCustomAttributesOnSpan() {}

      const instrumentations = getComputeJsAutoInstrumentations({
        '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch': {
          applyCustomAttributesOnSpan,
        },
      });
      const instrumentation = instrumentations.find(
        instr =>
          instr.instrumentationName === '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch'
      ) as any;
      const configHttp = instrumentation._config as FastlyBackendFetchInstrumentationConfig;

      assert.strictEqual(
        configHttp.applyCustomAttributesOnSpan,
        applyCustomAttributesOnSpan
      );
    });

    it('should not return disabled instrumentation', () => {
      const instrumentations = getComputeJsAutoInstrumentations({
        '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch': {
          enabled: false,
        },
      });
      const instrumentation = instrumentations.find(
        instr =>
          instr.instrumentationName === '@fastly/compute-js-opentelemetry/instrumentation-fastly-backend-fetch'
      );
      assert.strictEqual(instrumentation, undefined);
    });

    it('should show error for non-existent instrumentation', () => {
      const diagLogger = newNopDiagLogger();
      const stubLoggerError = sinon.stub();
      diagLogger.error = stubLoggerError;
      diag.setLogger(diagLogger);

      const name = '@fastly/compute-js-opentelemetry/non-existent';
      const instrumentations = getComputeJsAutoInstrumentations({
        // @ts-expect-error verify that wrong name works
        [name]: {
          enabled: false,
        },
      });
      const instrumentation = instrumentations.find(
        instr => instr.instrumentationName === name
      );
      assert.strictEqual(instrumentation, undefined);

      assert.strictEqual(
        stubLoggerError.args[0][0],
        `Provided instrumentation name "${name}" not found`
      );
    });
  });
});
