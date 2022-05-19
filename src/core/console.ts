/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import inspect from 'object-inspect';

// Patch console so it's a little bit more useful
const origConsole = globalThis.console;

const logMethods = [ 'log', 'trace', 'info', 'warn', 'error' ];
const betterConsole: {[key: typeof logMethods[number]]: (...args: any[]) => void} = {};
for(const key of logMethods) {
  betterConsole[key] = (...args: any[]) => {
    const str = toLoggerString(...args);
    (origConsole as any)[key](str);
  };
}

globalThis.console = betterConsole as any;

export function toLoggerString(...args: any[]): string {

  if(args.length > 1) {
    const formatString = parseFormatString(args[0]);
    if(formatString != null) {
      return formatString.applySubstitutions(args.slice(1));
    }
  }

  return args.map(arg => {
    if(arg == null) {
      return 'null';
    }
    if(typeof arg === 'string' ||
      typeof arg === 'number' ||
      typeof arg === 'boolean' ||
      typeof arg === 'bigint'
    ) {
      return String(arg);
    }
    return inspect(arg);
    // if(Array.isArray(arg)) {
    //   return 'array';
    // }
    // try {
    //   return JSON.stringify(arg);
    // } catch(ex) {
    // }
    // return String(arg);
  }).join(' ');

}

interface FormatStringToken {
  type: 'object' | 'integer' | 'float' | 'string'
}

type FormatStringEntry = string | FormatStringToken;

class FormatString {
  tokens: FormatStringEntry[];
  constructor(tokens: FormatStringEntry[]) {
    this.tokens = tokens;
  }

  applySubstitutions(...args: any[]): string {
    const segs: string[] = [];

    for (const token of this.tokens) {
      let seg: string;
      if(typeof token === 'string') {
        seg = token;
      } else {
        const val = args.shift();
        if(val == null) {
          seg = '';
        } else {
          switch(token.type) {
            case 'object':
              seg = JSON.stringify(Object(val))
              break;
            case 'string':
              seg = String(val);
              break;
            case 'float':
              seg = String(Number(val));
              break;
            case 'integer':
              seg = String(Math.floor(Number(val)));
              break;
          }
        }
      }
      segs.push(seg);
    }

    return segs.join('');
  }

}

function parseFormatString(arg: any): FormatString | null {

  if(typeof arg !== 'string') {
    return null;
  }

  const tokens: FormatStringEntry[] = [];

  let prevPos = 0;
  while(true) {
    const pos = arg.indexOf('%', prevPos);
    if(pos === -1) {
      tokens.push(arg.slice(prevPos));
      break;
    }

    tokens.push(arg.slice(prevPos, pos));

    // Check character after the %
    const ch = arg.charAt(pos + 1);
    switch(ch) {
      case '%':
        // A double %% we intend on a %, so we add one
        tokens.push('%');
        break;
      case 's':
        tokens.push({type: 'string'});
        break;
      case 'i':
      case 'd':
        tokens.push({type: 'integer'});
        break;
      case 'f':
        tokens.push({type: 'float'});
        break;
      case 'o':
      case 'O':
        tokens.push({type: 'object'});
        break;
      default:
        tokens.push('%' + ch);
    }

    // Skip the % and that next char
    prevPos = pos + 2;
  }

  if (tokens.every(token => typeof token === 'string')) {
    // if no substitution tokens then this is not a format string
    return null;
  }

  return new FormatString(tokens);

}
