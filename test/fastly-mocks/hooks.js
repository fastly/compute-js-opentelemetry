/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import url from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('fastly:')) {
    specifier = url.resolve(import.meta.url, specifier.slice('fastly:'.length) + '.ts');
  }
  return nextResolve(specifier);
}
