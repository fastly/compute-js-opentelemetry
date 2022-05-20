const origConsole = globalThis.console;

let _replacementConsoleFunc = null;

const logMethods = [ 'log', 'trace', 'info', 'warn', 'error' ];
const replacementConsole = {};
for(const key of logMethods) {
  replacementConsole[key] = (...args) => {
    if(_replacementConsoleFunc != null) {
      _replacementConsoleFunc(key, ...args);
    } else {
      origConsole[key](...args);
    }
  }
}
globalThis.console = replacementConsole;

globalThis.setConsoleFunc = (fn) => {
  _replacementConsoleFunc = fn;
}

globalThis.resetConsoleFunc = () => {
  _replacementConsoleFunc = null;
}
