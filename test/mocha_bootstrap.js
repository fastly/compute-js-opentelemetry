/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

const Module = require('module');

const origRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (_requireFunc != null) {
    const module = _requireFunc(id);
    if (module != null) {
      return module;
    }
  }
  return origRequire.call(this, id);
};

let _requireFunc = null;
globalThis.setRequireFunc = (fn) => {
  _requireFunc = fn;
};

let _replacementFetchFunc = null;
globalThis.fetch = (requestInfo, requestInit) => {
  if(_replacementFetchFunc != null) {
    return _replacementFetchFunc(requestInfo, requestInit);
  } else {
    // no fetch in raw node
    return Promise.resolve({status:500});
  }
}

globalThis.setFetchFunc = (fn) => {
  _replacementFetchFunc = fn;
}

globalThis.resetFetchFunc = () => {
  _replacementFetchFunc = null;
}

// Restores the default sandbox after every test
export const mochaHooks = {
  beforeEach() {
    resetFetchFunc();
    onBeforeEach();
  },
  afterEach() {
    onAfterEach();
  },
};
