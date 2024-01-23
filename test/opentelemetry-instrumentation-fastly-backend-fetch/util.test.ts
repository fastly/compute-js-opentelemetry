/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import assert from "assert";
import { headersToObject } from "../../src/opentelemetry-instrumentation-fastly-backend-fetch/util";

describe('utils', () => {
  describe('headersToObject', () => {

    it('returns object directly', () => {
      const obj = {};
      const ret = headersToObject(obj);
      assert.strictEqual(ret, obj);
    });

    it('returns new object with the same keys and values as passed-in Header', () => {
      const headers = new Headers({
        'foo': 'bar',
        'hoge': 'piyo',
      });

      const ret = headersToObject(headers);
      assert.deepStrictEqual(ret, {
        'foo': 'bar',
        'hoge': 'piyo',
      });
    });

    it('returns new object with the same keys and values as passed-in array', () => {
      const arr = [
        [ 'foo', 'bar' ],
        [ 'hoge', 'piyo' ],
      ];

      const ret = headersToObject(arr);
      assert.deepStrictEqual(ret, {
        'foo': 'bar',
        'hoge': 'piyo',
      });
    });

  });
});
