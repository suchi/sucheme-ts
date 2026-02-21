import {
  SchemeVal,
  SchemeError,
  SchemePort,
  SchemePrimitive,
  NIL,
  TRUE,
  FALSE,
  UNDEFINED,
  cons,
  car,
  cdr,
  makeNumber,
  makeString,
  makeSymbol,
  makeChar,
  makeBoolean,
  isTruthy,
  display,
  write,
  arrayToList,
  listToArray,
  isList,
} from "./types.js";
import { Environment } from "./environment.js";
import { applyProc } from "./evaluator.js";
import { parse } from "./parser.js";
import { makeStringInputPort, makeStringOutputPort } from "./port.js";

// EOF object
const EOF_OBJECT: SchemePrimitive = {
  type: "primitive",
  name: "#<eof>",
  fn: () => EOF_OBJECT,
};

function assertNumber(val: SchemeVal, name: string): number {
  if (val.type !== "number") throw new SchemeError(`${name}: not a number: ${display(val)}`);
  return val.value;
}

function assertString(val: SchemeVal, name: string): string {
  if (val.type !== "string") throw new SchemeError(`${name}: not a string: ${display(val)}`);
  return val.value;
}

function assertSymbol(val: SchemeVal, name: string): string {
  if (val.type !== "symbol") throw new SchemeError(`${name}: not a symbol: ${display(val)}`);
  return val.name;
}

function assertChar(val: SchemeVal, name: string): string {
  if (val.type !== "char") throw new SchemeError(`${name}: not a char: ${display(val)}`);
  return val.value;
}

function assertVector(val: SchemeVal, name: string): SchemeVal[] {
  if (val.type !== "vector") throw new SchemeError(`${name}: not a vector: ${display(val)}`);
  return val.elements;
}

function assertPair(val: SchemeVal, name: string): { car: SchemeVal; cdr: SchemeVal } {
  if (val.type !== "pair") throw new SchemeError(`${name}: not a pair: ${display(val)}`);
  return val;
}

function assertInteger(val: SchemeVal, name: string): number {
  const n = assertNumber(val, name);
  if (!Number.isInteger(n)) throw new SchemeError(`${name}: not an integer: ${n}`);
  return n;
}

function numericCompare(op: string, pred: (a: number, b: number) => boolean): SchemePrimitive {
  return {
    type: "primitive",
    name: op,
    fn: (args) => {
      if (args.length < 2) throw new SchemeError(`${op}: expected at least 2 arguments`);
      for (let i = 0; i < args.length - 1; i++) {
        const a = assertNumber(args[i], op);
        const b = assertNumber(args[i + 1], op);
        if (!pred(a, b)) return FALSE;
      }
      return TRUE;
    },
  };
}

function numericFold(op: string, init: number, fn: (acc: number, x: number) => number): SchemePrimitive {
  return {
    type: "primitive",
    name: op,
    fn: (args) => {
      if (args.length === 0) return makeNumber(init);
      let acc = assertNumber(args[0], op);
      let exact = (args[0] as { exact?: boolean }).exact !== false;
      for (let i = 1; i < args.length; i++) {
        const n = args[i];
        if (n.type !== "number") throw new SchemeError(`${op}: not a number: ${display(n)}`);
        acc = fn(acc, n.value);
        if (!n.exact) exact = false;
      }
      return makeNumber(acc, exact);
    },
  };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function schemeEqual(a: SchemeVal, b: SchemeVal): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "null":
      return true;
    case "boolean":
      return a.value === (b as typeof a).value;
    case "number":
      return a.value === (b as typeof a).value;
    case "symbol":
      return a.name === (b as typeof a).name;
    case "char":
      return a.value === (b as typeof a).value;
    case "string":
      return a.value === (b as typeof a).value;
    case "pair":
      return schemeEqual(a.car, (b as typeof a).car) && schemeEqual(a.cdr, (b as typeof a).cdr);
    case "vector": {
      const bv = b as typeof a;
      if (a.elements.length !== bv.elements.length) return false;
      for (let i = 0; i < a.elements.length; i++) {
        if (!schemeEqual(a.elements[i], bv.elements[i])) return false;
      }
      return true;
    }
    default:
      return a === b;
  }
}

function schemeEqv(a: SchemeVal, b: SchemeVal): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "null":
      return true;
    case "boolean":
      return a.value === (b as typeof a).value;
    case "number":
      return a.value === (b as typeof a).value;
    case "symbol":
      return a.name === (b as typeof a).name;
    case "char":
      return a.value === (b as typeof a).value;
    default:
      return a === b;
  }
}

// Port state
let currentInputPort: SchemePort = {
  type: "port",
  direction: "input",
  isOpen: true,
  readChar: () => null,
  peekChar: () => null,
};

let currentOutputPort: SchemePort = {
  type: "port",
  direction: "output",
  isOpen: true,
  writeChar: (ch: string) => {
    process.stdout?.write(ch);
  },
};

let currentErrorPort: SchemePort = {
  type: "port",
  direction: "output",
  isOpen: true,
  writeChar: (ch: string) => {
    process.stderr?.write(ch);
  },
};

export function setCurrentOutputPort(port: SchemePort): void {
  currentOutputPort = port;
}

export function setCurrentInputPort(port: SchemePort): void {
  currentInputPort = port;
}

function writeToPort(s: string, port: SchemePort): void {
  if (!port.isOpen) throw new SchemeError("write: port is closed");
  if (!port.writeChar) throw new SchemeError("write: not an output port");
  for (const ch of s) {
    port.writeChar(ch);
  }
}

export function makePrimitives(): Map<string, SchemeVal> {
  const env = new Map<string, SchemeVal>();

  function def(name: string, fn: (args: SchemeVal[], env: Environment) => SchemeVal): void {
    env.set(name, { type: "primitive", name, fn });
  }

  // Arithmetic
  def("+", (args) => {
    let sum = 0;
    let exact = true;
    for (const a of args) {
      if (a.type !== "number") throw new SchemeError(`+: not a number: ${display(a)}`);
      sum += a.value;
      if (!a.exact) exact = false;
    }
    return makeNumber(sum, exact);
  });

  def("-", (args) => {
    if (args.length === 0) throw new SchemeError("-: expected at least 1 argument");
    if (args[0].type !== "number") throw new SchemeError(`-: not a number: ${display(args[0])}`);
    let exact = args[0].exact;
    if (args.length === 1) return makeNumber(-args[0].value, exact);
    let result = args[0].value;
    for (let i = 1; i < args.length; i++) {
      if (args[i].type !== "number") throw new SchemeError(`-: not a number: ${display(args[i])}`);
      result -= (args[i] as { value: number }).value;
      if (!(args[i] as { exact: boolean }).exact) exact = false;
    }
    return makeNumber(result, exact);
  });

  def("*", (args) => {
    let product = 1;
    let exact = true;
    for (const a of args) {
      if (a.type !== "number") throw new SchemeError(`*: not a number: ${display(a)}`);
      product *= a.value;
      if (!a.exact) exact = false;
    }
    return makeNumber(product, exact);
  });

  def("/", (args) => {
    if (args.length === 0) throw new SchemeError("/: expected at least 1 argument");
    if (args[0].type !== "number") throw new SchemeError(`/: not a number: ${display(args[0])}`);
    let exact = args[0].exact;
    if (args.length === 1) return makeNumber(1 / args[0].value, exact);
    let result = args[0].value;
    for (let i = 1; i < args.length; i++) {
      if (args[i].type !== "number") throw new SchemeError(`/: not a number: ${display(args[i])}`);
      const d = (args[i] as { value: number }).value;
      if (d === 0) throw new SchemeError("/: division by zero");
      result /= d;
      if (!(args[i] as { exact: boolean }).exact) exact = false;
    }
    return makeNumber(result, exact);
  });

  def("quotient", (args) => {
    if (args.length !== 2) throw new SchemeError("quotient: expected 2 arguments");
    const a = assertNumber(args[0], "quotient");
    const b = assertNumber(args[1], "quotient");
    if (b === 0) throw new SchemeError("quotient: division by zero");
    return makeNumber(Math.trunc(a / b), true);
  });

  def("remainder", (args) => {
    if (args.length !== 2) throw new SchemeError("remainder: expected 2 arguments");
    const a = assertNumber(args[0], "remainder");
    const b = assertNumber(args[1], "remainder");
    if (b === 0) throw new SchemeError("remainder: division by zero");
    return makeNumber(a - Math.trunc(a / b) * b, true);
  });

  def("modulo", (args) => {
    if (args.length !== 2) throw new SchemeError("modulo: expected 2 arguments");
    const a = assertNumber(args[0], "modulo");
    const b = assertNumber(args[1], "modulo");
    if (b === 0) throw new SchemeError("modulo: division by zero");
    const r = a % b;
    if (r === 0) return makeNumber(0, true);
    if ((r < 0) !== (b < 0)) return makeNumber(r + b, true);
    return makeNumber(r, true);
  });

  def("gcd", (args) => {
    if (args.length === 0) return makeNumber(0, true);
    let result = Math.abs(assertNumber(args[0], "gcd"));
    for (let i = 1; i < args.length; i++) {
      result = gcd(result, Math.abs(assertNumber(args[i], "gcd")));
    }
    return makeNumber(result, true);
  });

  def("lcm", (args) => {
    if (args.length === 0) return makeNumber(1, true);
    let result = Math.abs(assertNumber(args[0], "lcm"));
    for (let i = 1; i < args.length; i++) {
      result = lcm(result, Math.abs(assertNumber(args[i], "lcm")));
    }
    return makeNumber(result, true);
  });

  def("abs", (args) => {
    if (args.length !== 1) throw new SchemeError("abs: expected 1 argument");
    const n = assertNumber(args[0], "abs");
    return makeNumber(Math.abs(n), (args[0] as { exact: boolean }).exact);
  });

  def("floor", (args) => {
    if (args.length !== 1) throw new SchemeError("floor: expected 1 argument");
    const n = assertNumber(args[0], "floor");
    return makeNumber(Math.floor(n), (args[0] as { exact: boolean }).exact);
  });

  def("ceiling", (args) => {
    if (args.length !== 1) throw new SchemeError("ceiling: expected 1 argument");
    const n = assertNumber(args[0], "ceiling");
    return makeNumber(Math.ceil(n), (args[0] as { exact: boolean }).exact);
  });

  def("truncate", (args) => {
    if (args.length !== 1) throw new SchemeError("truncate: expected 1 argument");
    const n = assertNumber(args[0], "truncate");
    return makeNumber(Math.trunc(n), (args[0] as { exact: boolean }).exact);
  });

  def("round", (args) => {
    if (args.length !== 1) throw new SchemeError("round: expected 1 argument");
    const n = assertNumber(args[0], "round");
    // R5RS: round to even
    const fl = Math.floor(n);
    const diff = n - fl;
    let result: number;
    if (diff < 0.5) result = fl;
    else if (diff > 0.5) result = fl + 1;
    else result = fl % 2 === 0 ? fl : fl + 1;
    return makeNumber(result, (args[0] as { exact: boolean }).exact);
  });

  def("sqrt", (args) => {
    if (args.length !== 1) throw new SchemeError("sqrt: expected 1 argument");
    const n = assertNumber(args[0], "sqrt");
    const result = Math.sqrt(n);
    const exact = Number.isInteger(result) && (args[0] as { exact: boolean }).exact;
    return makeNumber(result, exact);
  });

  def("expt", (args) => {
    if (args.length !== 2) throw new SchemeError("expt: expected 2 arguments");
    const base = assertNumber(args[0], "expt");
    const exp = assertNumber(args[1], "expt");
    const result = Math.pow(base, exp);
    const exact = (args[0] as { exact: boolean }).exact && (args[1] as { exact: boolean }).exact && Number.isInteger(result);
    return makeNumber(result, exact);
  });

  def("min", (args) => {
    if (args.length === 0) throw new SchemeError("min: expected at least 1 argument");
    let result = assertNumber(args[0], "min");
    let exact = (args[0] as { exact: boolean }).exact;
    for (let i = 1; i < args.length; i++) {
      const n = assertNumber(args[i], "min");
      if (n < result) result = n;
      if (!(args[i] as { exact: boolean }).exact) exact = false;
    }
    return makeNumber(result, exact);
  });

  def("max", (args) => {
    if (args.length === 0) throw new SchemeError("max: expected at least 1 argument");
    let result = assertNumber(args[0], "max");
    let exact = (args[0] as { exact: boolean }).exact;
    for (let i = 1; i < args.length; i++) {
      const n = assertNumber(args[i], "max");
      if (n > result) result = n;
      if (!(args[i] as { exact: boolean }).exact) exact = false;
    }
    return makeNumber(result, exact);
  });

  // Trig
  def("sin", (args) => makeNumber(Math.sin(assertNumber(args[0], "sin")), false));
  def("cos", (args) => makeNumber(Math.cos(assertNumber(args[0], "cos")), false));
  def("tan", (args) => makeNumber(Math.tan(assertNumber(args[0], "tan")), false));
  def("asin", (args) => makeNumber(Math.asin(assertNumber(args[0], "asin")), false));
  def("acos", (args) => makeNumber(Math.acos(assertNumber(args[0], "acos")), false));
  def("atan", (args) => {
    if (args.length === 1) return makeNumber(Math.atan(assertNumber(args[0], "atan")), false);
    if (args.length === 2) return makeNumber(Math.atan2(assertNumber(args[0], "atan"), assertNumber(args[1], "atan")), false);
    throw new SchemeError("atan: expected 1 or 2 arguments");
  });
  def("exp", (args) => makeNumber(Math.exp(assertNumber(args[0], "exp")), false));
  def("log", (args) => {
    if (args.length === 1) return makeNumber(Math.log(assertNumber(args[0], "log")), false);
    if (args.length === 2) return makeNumber(Math.log(assertNumber(args[0], "log")) / Math.log(assertNumber(args[1], "log")), false);
    throw new SchemeError("log: expected 1 or 2 arguments");
  });

  // Numeric predicates
  def("number?", (args) => makeBoolean(args[0]?.type === "number"));
  def("complex?", (args) => makeBoolean(args[0]?.type === "number"));
  def("real?", (args) => makeBoolean(args[0]?.type === "number"));
  def("rational?", (args) => makeBoolean(args[0]?.type === "number" && isFinite((args[0] as { value: number }).value)));
  def("integer?", (args) => makeBoolean(args[0]?.type === "number" && Number.isInteger((args[0] as { value: number }).value)));
  def("exact?", (args) => {
    if (args[0]?.type !== "number") throw new SchemeError(`exact?: not a number: ${display(args[0])}`);
    return makeBoolean((args[0] as { exact: boolean }).exact);
  });
  def("inexact?", (args) => {
    if (args[0]?.type !== "number") throw new SchemeError(`inexact?: not a number: ${display(args[0])}`);
    return makeBoolean(!(args[0] as { exact: boolean }).exact);
  });
  def("zero?", (args) => makeBoolean(assertNumber(args[0], "zero?") === 0));
  def("positive?", (args) => makeBoolean(assertNumber(args[0], "positive?") > 0));
  def("negative?", (args) => makeBoolean(assertNumber(args[0], "negative?") < 0));
  def("odd?", (args) => makeBoolean(assertNumber(args[0], "odd?") % 2 !== 0));
  def("even?", (args) => makeBoolean(assertNumber(args[0], "even?") % 2 === 0));
  def("finite?", (args) => makeBoolean(isFinite(assertNumber(args[0], "finite?"))));
  def("infinite?", (args) => makeBoolean(!isFinite(assertNumber(args[0], "infinite?"))));
  def("nan?", (args) => makeBoolean(isNaN(assertNumber(args[0], "nan?"))));

  // Numeric conversion
  def("exact->inexact", (args) => makeNumber(assertNumber(args[0], "exact->inexact"), false));
  def("inexact->exact", (args) => {
    const n = assertNumber(args[0], "inexact->exact");
    // Convert to rational approximation (simple version)
    return makeNumber(Math.round(n), true);
  });
  def("exact", (args) => {
    const n = assertNumber(args[0], "exact");
    return makeNumber(Math.round(n), true);
  });
  def("inexact", (args) => makeNumber(assertNumber(args[0], "inexact"), false));

  // Number->string and string->number
  def("number->string", (args) => {
    if (args.length < 1) throw new SchemeError("number->string: expected at least 1 argument");
    const n = assertNumber(args[0], "number->string");
    const radix = args.length >= 2 ? assertNumber(args[1], "number->string") : 10;
    if (radix === 10) return makeString(n.toString());
    if (radix === 2) return makeString(Math.floor(n).toString(2));
    if (radix === 8) return makeString(Math.floor(n).toString(8));
    if (radix === 16) return makeString(Math.floor(n).toString(16));
    throw new SchemeError(`number->string: invalid radix: ${radix}`);
  });

  def("string->number", (args) => {
    if (args.length < 1) throw new SchemeError("string->number: expected at least 1 argument");
    const s = assertString(args[0], "string->number");
    const radix = args.length >= 2 ? assertNumber(args[1], "string->number") : 10;
    if (s === "") return FALSE;
    const n = parseInt(s, radix);
    if (isNaN(n) && s !== "nan") {
      // Try float
      const f = parseFloat(s);
      if (isNaN(f)) return FALSE;
      return makeNumber(f, false);
    }
    return makeNumber(n, radix === 10 && !s.includes("."));
  });

  // Comparison
  def("=", numericCompare("=", (a, b) => a === b).fn);
  def("<", numericCompare("<", (a, b) => a < b).fn);
  def(">", numericCompare(">", (a, b) => a > b).fn);
  def("<=", numericCompare("<=", (a, b) => a <= b).fn);
  def(">=", numericCompare(">=", (a, b) => a >= b).fn);

  def("eq?", (args) => {
    if (args.length !== 2) throw new SchemeError("eq?: expected 2 arguments");
    const a = args[0], b = args[1];
    if (a.type !== b.type) return FALSE;
    switch (a.type) {
      case "boolean": return makeBoolean(a.value === (b as typeof a).value);
      case "symbol": return makeBoolean(a.name === (b as typeof a).name);
      case "number": return makeBoolean(a.value === (b as typeof a).value && Number.isInteger(a.value));
      case "null": return TRUE;
      case "char": return makeBoolean(a.value === (b as typeof a).value);
      default: return makeBoolean(a === b);
    }
  });

  def("eqv?", (args) => {
    if (args.length !== 2) throw new SchemeError("eqv?: expected 2 arguments");
    return makeBoolean(schemeEqv(args[0], args[1]));
  });

  def("equal?", (args) => {
    if (args.length !== 2) throw new SchemeError("equal?: expected 2 arguments");
    return makeBoolean(schemeEqual(args[0], args[1]));
  });

  // Boolean
  def("not", (args) => {
    if (args.length !== 1) throw new SchemeError("not: expected 1 argument");
    return makeBoolean(!isTruthy(args[0]));
  });
  def("boolean?", (args) => makeBoolean(args[0]?.type === "boolean"));
  def("boolean=?", (args) => {
    if (args.length < 2) return TRUE;
    const first = args[0];
    if (first.type !== "boolean") throw new SchemeError("boolean=?: not a boolean");
    for (const a of args.slice(1)) {
      if (a.type !== "boolean" || a.value !== first.value) return FALSE;
    }
    return TRUE;
  });

  // Pairs and lists
  def("cons", (args) => {
    if (args.length !== 2) throw new SchemeError("cons: expected 2 arguments");
    return cons(args[0], args[1]);
  });
  def("car", (args) => {
    if (args.length !== 1) throw new SchemeError("car: expected 1 argument");
    return car(args[0]);
  });
  def("cdr", (args) => {
    if (args.length !== 1) throw new SchemeError("cdr: expected 1 argument");
    return cdr(args[0]);
  });
  def("set-car!", (args) => {
    if (args.length !== 2) throw new SchemeError("set-car!: expected 2 arguments");
    const p = assertPair(args[0], "set-car!");
    (p as { car: SchemeVal }).car = args[1];
    return UNDEFINED;
  });
  def("set-cdr!", (args) => {
    if (args.length !== 2) throw new SchemeError("set-cdr!: expected 2 arguments");
    const p = assertPair(args[0], "set-cdr!");
    (p as { cdr: SchemeVal }).cdr = args[1];
    return UNDEFINED;
  });

  // caar, cadr, etc.
  for (const combo of ["aa", "ad", "da", "dd", "aaa", "aad", "ada", "add", "daa", "dad", "dda", "ddd",
    "aaaa", "aaad", "aada", "aadd", "adaa", "adad", "adda", "addd",
    "daaa", "daad", "dada", "dadd", "ddaa", "ddad", "ddda", "dddd"]) {
    const name = `c${combo}r`;
    def(name, (args) => {
      if (args.length !== 1) throw new SchemeError(`${name}: expected 1 argument`);
      let val = args[0];
      for (let i = combo.length - 1; i >= 0; i--) {
        if (combo[i] === "a") val = car(val);
        else val = cdr(val);
      }
      return val;
    });
  }

  def("null?", (args) => makeBoolean(args[0]?.type === "null"));
  def("pair?", (args) => makeBoolean(args[0]?.type === "pair"));
  def("list?", (args) => {
    if (args.length !== 1) throw new SchemeError("list?: expected 1 argument");
    return makeBoolean(isList(args[0]));
  });

  def("list", (args) => arrayToList(args));

  def("length", (args) => {
    if (args.length !== 1) throw new SchemeError("length: expected 1 argument");
    let count = 0;
    let current = args[0];
    while (current.type === "pair") {
      count++;
      current = current.cdr;
    }
    if (current.type !== "null") throw new SchemeError("length: not a proper list");
    return makeNumber(count, true);
  });

  def("append", (args) => {
    if (args.length === 0) return NIL;
    if (args.length === 1) return args[0];
    let result = args[args.length - 1];
    for (let i = args.length - 2; i >= 0; i--) {
      const lst = args[i];
      if (lst.type === "null") continue;
      // Copy lst and append result
      const elements: SchemeVal[] = [];
      let cur: SchemeVal = lst;
      while (cur.type === "pair") {
        elements.push(cur.car);
        cur = cur.cdr;
      }
      if (cur.type !== "null") throw new SchemeError("append: not a proper list");
      for (let j = elements.length - 1; j >= 0; j--) {
        result = cons(elements[j], result);
      }
    }
    return result;
  });

  def("reverse", (args) => {
    if (args.length !== 1) throw new SchemeError("reverse: expected 1 argument");
    let result: SchemeVal = NIL;
    let current = args[0];
    while (current.type === "pair") {
      result = cons(current.car, result);
      current = current.cdr;
    }
    if (current.type !== "null") throw new SchemeError("reverse: not a proper list");
    return result;
  });

  def("list-tail", (args) => {
    if (args.length !== 2) throw new SchemeError("list-tail: expected 2 arguments");
    let lst = args[0];
    let k = assertInteger(args[1], "list-tail");
    while (k > 0) {
      if (lst.type !== "pair") throw new SchemeError("list-tail: index out of range");
      lst = lst.cdr;
      k--;
    }
    return lst;
  });

  def("list-ref", (args) => {
    if (args.length !== 2) throw new SchemeError("list-ref: expected 2 arguments");
    let lst = args[0];
    let k = assertInteger(args[1], "list-ref");
    while (k > 0) {
      if (lst.type !== "pair") throw new SchemeError("list-ref: index out of range");
      lst = lst.cdr;
      k--;
    }
    if (lst.type !== "pair") throw new SchemeError("list-ref: index out of range");
    return lst.car;
  });

  def("list-copy", (args) => {
    if (args.length !== 1) throw new SchemeError("list-copy: expected 1 argument");
    if (args[0].type === "null") return NIL;
    const elements: SchemeVal[] = [];
    let cur: SchemeVal = args[0];
    while (cur.type === "pair") {
      elements.push(cur.car);
      cur = cur.cdr;
    }
    let result: SchemeVal = cur; // preserve tail
    for (let i = elements.length - 1; i >= 0; i--) {
      result = cons(elements[i], result);
    }
    return result;
  });

  def("member", (args) => {
    if (args.length !== 2) throw new SchemeError("member: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      if (schemeEqual(args[0], lst.car)) return lst;
      lst = lst.cdr;
    }
    return FALSE;
  });

  def("memq", (args) => {
    if (args.length !== 2) throw new SchemeError("memq: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      if (args[0] === lst.car || schemeEqv(args[0], lst.car)) return lst;
      lst = lst.cdr;
    }
    return FALSE;
  });

  def("memv", (args) => {
    if (args.length !== 2) throw new SchemeError("memv: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      if (schemeEqv(args[0], lst.car)) return lst;
      lst = lst.cdr;
    }
    return FALSE;
  });

  def("assoc", (args) => {
    if (args.length !== 2) throw new SchemeError("assoc: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      const pair = lst.car;
      if (pair.type === "pair" && schemeEqual(args[0], pair.car)) return pair;
      lst = lst.cdr;
    }
    return FALSE;
  });

  def("assq", (args) => {
    if (args.length !== 2) throw new SchemeError("assq: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      const pair = lst.car;
      if (pair.type === "pair" && schemeEqv(args[0], pair.car)) return pair;
      lst = lst.cdr;
    }
    return FALSE;
  });

  def("assv", (args) => {
    if (args.length !== 2) throw new SchemeError("assv: expected 2 arguments");
    let lst = args[1];
    while (lst.type === "pair") {
      const pair = lst.car;
      if (pair.type === "pair" && schemeEqv(args[0], pair.car)) return pair;
      lst = lst.cdr;
    }
    return FALSE;
  });

  // Symbols
  def("symbol?", (args) => makeBoolean(args[0]?.type === "symbol"));
  def("symbol->string", (args) => {
    if (args.length !== 1) throw new SchemeError("symbol->string: expected 1 argument");
    return makeString(assertSymbol(args[0], "symbol->string"));
  });
  def("string->symbol", (args) => {
    if (args.length !== 1) throw new SchemeError("string->symbol: expected 1 argument");
    return makeSymbol(assertString(args[0], "string->symbol"));
  });
  def("symbol=?", (args) => {
    if (args.length < 2) return TRUE;
    const first = assertSymbol(args[0], "symbol=?");
    for (const a of args.slice(1)) {
      if (assertSymbol(a, "symbol=?") !== first) return FALSE;
    }
    return TRUE;
  });

  // Strings
  def("string?", (args) => makeBoolean(args[0]?.type === "string"));
  def("make-string", (args) => {
    if (args.length < 1) throw new SchemeError("make-string: expected at least 1 argument");
    const n = assertInteger(args[0], "make-string");
    const ch = args.length >= 2 ? assertChar(args[1], "make-string") : "\0";
    return makeString(ch.repeat(n));
  });
  def("string", (args) => {
    return makeString(args.map((a) => assertChar(a, "string")).join(""));
  });
  def("string-length", (args) => {
    if (args.length !== 1) throw new SchemeError("string-length: expected 1 argument");
    return makeNumber(assertString(args[0], "string-length").length, true);
  });
  def("string-ref", (args) => {
    if (args.length !== 2) throw new SchemeError("string-ref: expected 2 arguments");
    const s = assertString(args[0], "string-ref");
    const i = assertInteger(args[1], "string-ref");
    if (i < 0 || i >= s.length) throw new SchemeError(`string-ref: index ${i} out of range`);
    return makeChar(s[i]);
  });
  def("string-set!", (args) => {
    if (args.length !== 3) throw new SchemeError("string-set!: expected 3 arguments");
    // Strings are immutable in most Scheme - we'll make it work via mutation
    const s = assertString(args[0], "string-set!");
    const i = assertInteger(args[1], "string-set!");
    const ch = assertChar(args[2], "string-set!");
    if (i < 0 || i >= s.length) throw new SchemeError(`string-set!: index ${i} out of range`);
    const newStr = s.slice(0, i) + ch + s.slice(i + 1);
    (args[0] as { value: string }).value = newStr;
    return UNDEFINED;
  });
  def("substring", (args) => {
    if (args.length < 2) throw new SchemeError("substring: expected at least 2 arguments");
    const s = assertString(args[0], "substring");
    const start = assertInteger(args[1], "substring");
    const end = args.length >= 3 ? assertInteger(args[2], "substring") : s.length;
    if (start < 0 || start > s.length) throw new SchemeError(`substring: start ${start} out of range`);
    if (end < start || end > s.length) throw new SchemeError(`substring: end ${end} out of range`);
    return makeString(s.slice(start, end));
  });
  def("string-append", (args) => makeString(args.map((a) => assertString(a, "string-append")).join("")));
  def("string->list", (args) => {
    if (args.length < 1) throw new SchemeError("string->list: expected at least 1 argument");
    const s = assertString(args[0], "string->list");
    const start = args.length >= 2 ? assertInteger(args[1], "string->list") : 0;
    const end = args.length >= 3 ? assertInteger(args[2], "string->list") : s.length;
    return arrayToList(Array.from(s.slice(start, end)).map(makeChar));
  });
  def("list->string", (args) => {
    if (args.length !== 1) throw new SchemeError("list->string: expected 1 argument");
    return makeString(listToArray(args[0]).map((c) => assertChar(c, "list->string")).join(""));
  });
  def("string-copy", (args) => {
    if (args.length < 1) throw new SchemeError("string-copy: expected at least 1 argument");
    const s = assertString(args[0], "string-copy");
    const start = args.length >= 2 ? assertInteger(args[1], "string-copy") : 0;
    const end = args.length >= 3 ? assertInteger(args[2], "string-copy") : s.length;
    return makeString(s.slice(start, end));
  });
  def("string-fill!", (args) => {
    if (args.length < 2) throw new SchemeError("string-fill!: expected at least 2 arguments");
    const ch = assertChar(args[1], "string-fill!");
    const s = assertString(args[0], "string-fill!");
    (args[0] as { value: string }).value = ch.repeat(s.length);
    return UNDEFINED;
  });
  def("string-upcase", (args) => makeString(assertString(args[0], "string-upcase").toUpperCase()));
  def("string-downcase", (args) => makeString(assertString(args[0], "string-downcase").toLowerCase()));

  // String comparisons
  for (const [name, pred] of [
    ["string=?", (a: string, b: string) => a === b],
    ["string<?", (a: string, b: string) => a < b],
    ["string>?", (a: string, b: string) => a > b],
    ["string<=?", (a: string, b: string) => a <= b],
    ["string>=?", (a: string, b: string) => a >= b],
  ] as Array<[string, (a: string, b: string) => boolean]>) {
    def(name, (args) => {
      if (args.length < 2) throw new SchemeError(`${name}: expected at least 2 arguments`);
      for (let i = 0; i < args.length - 1; i++) {
        if (!pred(assertString(args[i], name), assertString(args[i + 1], name))) return FALSE;
      }
      return TRUE;
    });
  }

  for (const [name, pred] of [
    ["string-ci=?", (a: string, b: string) => a.toLowerCase() === b.toLowerCase()],
    ["string-ci<?", (a: string, b: string) => a.toLowerCase() < b.toLowerCase()],
    ["string-ci>?", (a: string, b: string) => a.toLowerCase() > b.toLowerCase()],
    ["string-ci<=?", (a: string, b: string) => a.toLowerCase() <= b.toLowerCase()],
    ["string-ci>=?", (a: string, b: string) => a.toLowerCase() >= b.toLowerCase()],
  ] as Array<[string, (a: string, b: string) => boolean]>) {
    def(name, (args) => {
      if (args.length < 2) throw new SchemeError(`${name}: expected at least 2 arguments`);
      for (let i = 0; i < args.length - 1; i++) {
        if (!pred(assertString(args[i], name), assertString(args[i + 1], name))) return FALSE;
      }
      return TRUE;
    });
  }

  // Characters
  def("char?", (args) => makeBoolean(args[0]?.type === "char"));
  def("char->integer", (args) => {
    if (args.length !== 1) throw new SchemeError("char->integer: expected 1 argument");
    return makeNumber(assertChar(args[0], "char->integer").charCodeAt(0), true);
  });
  def("integer->char", (args) => {
    if (args.length !== 1) throw new SchemeError("integer->char: expected 1 argument");
    return makeChar(String.fromCharCode(assertInteger(args[0], "integer->char")));
  });
  def("char-alphabetic?", (args) => makeBoolean(/[a-zA-Z]/.test(assertChar(args[0], "char-alphabetic?"))));
  def("char-numeric?", (args) => makeBoolean(/[0-9]/.test(assertChar(args[0], "char-numeric?"))));
  def("char-whitespace?", (args) => makeBoolean(/\s/.test(assertChar(args[0], "char-whitespace?"))));
  def("char-upper-case?", (args) => {
    const c = assertChar(args[0], "char-upper-case?");
    return makeBoolean(c === c.toUpperCase() && c !== c.toLowerCase());
  });
  def("char-lower-case?", (args) => {
    const c = assertChar(args[0], "char-lower-case?");
    return makeBoolean(c === c.toLowerCase() && c !== c.toUpperCase());
  });
  def("char-upcase", (args) => makeChar(assertChar(args[0], "char-upcase").toUpperCase()));
  def("char-downcase", (args) => makeChar(assertChar(args[0], "char-downcase").toLowerCase()));

  for (const [name, pred] of [
    ["char=?", (a: string, b: string) => a === b],
    ["char<?", (a: string, b: string) => a < b],
    ["char>?", (a: string, b: string) => a > b],
    ["char<=?", (a: string, b: string) => a <= b],
    ["char>=?", (a: string, b: string) => a >= b],
  ] as Array<[string, (a: string, b: string) => boolean]>) {
    def(name, (args) => {
      if (args.length < 2) throw new SchemeError(`${name}: expected at least 2 arguments`);
      for (let i = 0; i < args.length - 1; i++) {
        if (!pred(assertChar(args[i], name), assertChar(args[i + 1], name))) return FALSE;
      }
      return TRUE;
    });
  }

  for (const [name, pred] of [
    ["char-ci=?", (a: string, b: string) => a.toLowerCase() === b.toLowerCase()],
    ["char-ci<?", (a: string, b: string) => a.toLowerCase() < b.toLowerCase()],
    ["char-ci>?", (a: string, b: string) => a.toLowerCase() > b.toLowerCase()],
    ["char-ci<=?", (a: string, b: string) => a.toLowerCase() <= b.toLowerCase()],
    ["char-ci>=?", (a: string, b: string) => a.toLowerCase() >= b.toLowerCase()],
  ] as Array<[string, (a: string, b: string) => boolean]>) {
    def(name, (args) => {
      if (args.length < 2) throw new SchemeError(`${name}: expected at least 2 arguments`);
      for (let i = 0; i < args.length - 1; i++) {
        if (!pred(assertChar(args[i], name), assertChar(args[i + 1], name))) return FALSE;
      }
      return TRUE;
    });
  }

  // Vectors
  def("vector?", (args) => makeBoolean(args[0]?.type === "vector"));
  def("make-vector", (args) => {
    if (args.length < 1) throw new SchemeError("make-vector: expected at least 1 argument");
    const n = assertInteger(args[0], "make-vector");
    const fill = args.length >= 2 ? args[1] : makeNumber(0, true);
    return { type: "vector", elements: new Array(n).fill(fill) };
  });
  def("vector", (args) => ({ type: "vector", elements: [...args] }));
  def("vector-length", (args) => makeNumber(assertVector(args[0], "vector-length").length, true));
  def("vector-ref", (args) => {
    if (args.length !== 2) throw new SchemeError("vector-ref: expected 2 arguments");
    const v = assertVector(args[0], "vector-ref");
    const i = assertInteger(args[1], "vector-ref");
    if (i < 0 || i >= v.length) throw new SchemeError(`vector-ref: index ${i} out of range`);
    return v[i];
  });
  def("vector-set!", (args) => {
    if (args.length !== 3) throw new SchemeError("vector-set!: expected 3 arguments");
    const v = assertVector(args[0], "vector-set!");
    const i = assertInteger(args[1], "vector-set!");
    if (i < 0 || i >= v.length) throw new SchemeError(`vector-set!: index ${i} out of range`);
    v[i] = args[2];
    return UNDEFINED;
  });
  def("vector->list", (args) => {
    if (args.length < 1) throw new SchemeError("vector->list: expected at least 1 argument");
    const v = assertVector(args[0], "vector->list");
    const start = args.length >= 2 ? assertInteger(args[1], "vector->list") : 0;
    const end = args.length >= 3 ? assertInteger(args[2], "vector->list") : v.length;
    return arrayToList(v.slice(start, end));
  });
  def("list->vector", (args) => {
    if (args.length !== 1) throw new SchemeError("list->vector: expected 1 argument");
    return { type: "vector", elements: listToArray(args[0]) };
  });
  def("vector-fill!", (args) => {
    if (args.length < 2) throw new SchemeError("vector-fill!: expected at least 2 arguments");
    const v = assertVector(args[0], "vector-fill!");
    const fill = args[1];
    const start = args.length >= 3 ? assertInteger(args[2], "vector-fill!") : 0;
    const end = args.length >= 4 ? assertInteger(args[3], "vector-fill!") : v.length;
    for (let i = start; i < end; i++) v[i] = fill;
    return UNDEFINED;
  });
  def("vector-copy", (args) => {
    if (args.length < 1) throw new SchemeError("vector-copy: expected at least 1 argument");
    const v = assertVector(args[0], "vector-copy");
    const start = args.length >= 2 ? assertInteger(args[1], "vector-copy") : 0;
    const end = args.length >= 3 ? assertInteger(args[2], "vector-copy") : v.length;
    return { type: "vector", elements: v.slice(start, end) };
  });
  def("vector-append", (args) => {
    const elements: SchemeVal[] = [];
    for (const a of args) {
      elements.push(...assertVector(a, "vector-append"));
    }
    return { type: "vector", elements };
  });
  def("vector-map", (args, env) => {
    if (args.length < 2) throw new SchemeError("vector-map: expected at least 2 arguments");
    const proc = args[0];
    const vecs = args.slice(1).map((a) => assertVector(a, "vector-map"));
    const len = vecs[0].length;
    const result: SchemeVal[] = [];
    for (let i = 0; i < len; i++) {
      result.push(applyProc(proc, vecs.map((v) => v[i]), env));
    }
    return { type: "vector", elements: result };
  });
  def("vector-for-each", (args, env) => {
    if (args.length < 2) throw new SchemeError("vector-for-each: expected at least 2 arguments");
    const proc = args[0];
    const vecs = args.slice(1).map((a) => assertVector(a, "vector-for-each"));
    const len = vecs[0].length;
    for (let i = 0; i < len; i++) {
      applyProc(proc, vecs.map((v) => v[i]), env);
    }
    return UNDEFINED;
  });

  // Procedures
  def("procedure?", (args) => makeBoolean(args[0]?.type === "procedure" || args[0]?.type === "primitive"));

  def("apply", (args, env) => {
    if (args.length < 2) throw new SchemeError("apply: expected at least 2 arguments");
    const proc = args[0];
    const extraArgs = args.slice(1, -1);
    const lastArg = args[args.length - 1];
    const lastArgList = listToArray(lastArg);
    return applyProc(proc, [...extraArgs, ...lastArgList], env);
  });

  def("map", (args, env) => {
    if (args.length < 2) throw new SchemeError("map: expected at least 2 arguments");
    const proc = args[0];
    const lists = args.slice(1);
    const result: SchemeVal[] = [];

    const cursors: SchemeVal[] = lists.map((l) => l);
    while (true) {
      // Check all lists have elements
      const done = cursors.some((c) => c.type === "null");
      const hasElement = cursors.every((c) => c.type === "pair");
      if (done || !hasElement) break;

      const callArgs = cursors.map((c) => (c as { car: SchemeVal }).car);
      result.push(applyProc(proc, callArgs, env));

      for (let i = 0; i < cursors.length; i++) {
        cursors[i] = (cursors[i] as { cdr: SchemeVal }).cdr;
      }
    }
    return arrayToList(result);
  });

  def("for-each", (args, env) => {
    if (args.length < 2) throw new SchemeError("for-each: expected at least 2 arguments");
    const proc = args[0];
    const lists = args.slice(1);

    const cursors: SchemeVal[] = lists.map((l) => l);
    while (true) {
      const done = cursors.some((c) => c.type === "null");
      const hasElement = cursors.every((c) => c.type === "pair");
      if (done || !hasElement) break;

      const callArgs = cursors.map((c) => (c as { car: SchemeVal }).car);
      applyProc(proc, callArgs, env);

      for (let i = 0; i < cursors.length; i++) {
        cursors[i] = (cursors[i] as { cdr: SchemeVal }).cdr;
      }
    }
    return UNDEFINED;
  });

  def("string-map", (args, env) => {
    if (args.length < 2) throw new SchemeError("string-map: expected at least 2 arguments");
    const proc = args[0];
    const strs = args.slice(1).map((a) => assertString(a, "string-map"));
    const len = Math.min(...strs.map((s) => s.length));
    let result = "";
    for (let i = 0; i < len; i++) {
      const r = applyProc(proc, strs.map((s) => makeChar(s[i])), env);
      result += assertChar(r, "string-map result");
    }
    return makeString(result);
  });

  def("string-for-each", (args, env) => {
    if (args.length < 2) throw new SchemeError("string-for-each: expected at least 2 arguments");
    const proc = args[0];
    const strs = args.slice(1).map((a) => assertString(a, "string-for-each"));
    const len = Math.min(...strs.map((s) => s.length));
    for (let i = 0; i < len; i++) {
      applyProc(proc, strs.map((s) => makeChar(s[i])), env);
    }
    return UNDEFINED;
  });

  // call/cc is handled in evaluator, but expose as primitive too
  def("call-with-current-continuation", (args, env) => {
    // This primitive version works for simple cases
    if (args.length !== 1) throw new SchemeError("call/cc: expected 1 argument");
    // Delegate to evaluator's callCC logic
    throw new SchemeError("call/cc: use as special form");
  });
  def("call/cc", (args, env) => {
    if (args.length !== 1) throw new SchemeError("call/cc: expected 1 argument");
    throw new SchemeError("call/cc: use as special form");
  });

  // Values
  def("values", (args) => {
    if (args.length === 1) return args[0];
    return { type: "values", values: args };
  });

  def("call-with-values", (args, env) => {
    if (args.length !== 2) throw new SchemeError("call-with-values: expected 2 arguments");
    const produced = applyProc(args[0], [], env);
    const callArgs = produced.type === "values" ? produced.values : [produced];
    return applyProc(args[1], callArgs, env);
  });

  def("dynamic-wind", (args, env) => {
    if (args.length !== 3) throw new SchemeError("dynamic-wind: expected 3 arguments");
    applyProc(args[0], [], env);
    let result: SchemeVal;
    try {
      result = applyProc(args[1], [], env);
    } finally {
      applyProc(args[2], [], env);
    }
    return result!;
  });

  // I/O
  def("display", (args) => {
    if (args.length < 1) throw new SchemeError("display: expected at least 1 argument");
    const port = args.length >= 2 && args[1].type === "port" ? args[1] : currentOutputPort;
    writeToPort(display(args[0]), port);
    return UNDEFINED;
  });

  def("write", (args) => {
    if (args.length < 1) throw new SchemeError("write: expected at least 1 argument");
    const port = args.length >= 2 && args[1].type === "port" ? args[1] : currentOutputPort;
    writeToPort(write(args[0]), port);
    return UNDEFINED;
  });

  def("newline", (args) => {
    const port = args.length >= 1 && args[0].type === "port" ? args[0] : currentOutputPort;
    writeToPort("\n", port);
    return UNDEFINED;
  });

  def("write-char", (args) => {
    if (args.length < 1) throw new SchemeError("write-char: expected at least 1 argument");
    const ch = assertChar(args[0], "write-char");
    const port = args.length >= 2 && args[1].type === "port" ? args[1] : currentOutputPort;
    writeToPort(ch, port);
    return UNDEFINED;
  });

  def("write-string", (args) => {
    if (args.length < 1) throw new SchemeError("write-string: expected at least 1 argument");
    const s = assertString(args[0], "write-string");
    const port = args.length >= 2 && args[1].type === "port" ? args[1] : currentOutputPort;
    writeToPort(s, port);
    return UNDEFINED;
  });

  def("read-char", (args) => {
    const port = args.length >= 1 && args[0].type === "port" ? args[0] : currentInputPort;
    if (!port.readChar) throw new SchemeError("read-char: not an input port");
    const ch = port.readChar();
    if (ch === null) return EOF_OBJECT;
    return makeChar(ch);
  });

  def("peek-char", (args) => {
    const port = args.length >= 1 && args[0].type === "port" ? args[0] : currentInputPort;
    if (!port.peekChar) throw new SchemeError("peek-char: not an input port");
    const ch = port.peekChar();
    if (ch === null) return EOF_OBJECT;
    return makeChar(ch);
  });

  def("read-line", (args) => {
    const port = args.length >= 1 && args[0].type === "port" ? args[0] : currentInputPort;
    if (!port.readChar) throw new SchemeError("read-line: not an input port");
    let line = "";
    while (true) {
      const ch = port.readChar();
      if (ch === null) {
        if (line === "") return EOF_OBJECT;
        return makeString(line);
      }
      if (ch === "\n") return makeString(line);
      line += ch;
    }
  });

  def("char-ready?", (args) => TRUE);

  def("eof-object?", (args) => makeBoolean(args[0] === EOF_OBJECT || (args[0]?.type === "primitive" && args[0].name === "#<eof>")));
  def("eof-object", () => EOF_OBJECT);

  // String ports
  def("open-input-string", (args) => {
    if (args.length !== 1) throw new SchemeError("open-input-string: expected 1 argument");
    return makeStringInputPort(assertString(args[0], "open-input-string"));
  });

  def("open-output-string", (args) => makeStringOutputPort());

  def("get-output-string", (args) => {
    if (args.length !== 1) throw new SchemeError("get-output-string: expected 1 argument");
    const port = args[0];
    if (port.type !== "port") throw new SchemeError("get-output-string: not a port");
    const p = port as SchemePort & { getOutput?: () => string };
    if (!p.getOutput) throw new SchemeError("get-output-string: not a string output port");
    return makeString(p.getOutput());
  });

  def("with-input-from-string", (args, env) => {
    if (args.length !== 2) throw new SchemeError("with-input-from-string: expected 2 arguments");
    const s = assertString(args[0], "with-input-from-string");
    const thunk = args[1];
    const port = makeStringInputPort(s);
    const oldPort = currentInputPort;
    currentInputPort = port;
    try {
      return applyProc(thunk, [], env);
    } finally {
      currentInputPort = oldPort;
    }
  });

  def("with-output-to-string", (args, env) => {
    if (args.length !== 1) throw new SchemeError("with-output-to-string: expected 1 argument");
    const thunk = args[0];
    const port = makeStringOutputPort();
    const oldPort = currentOutputPort;
    currentOutputPort = port;
    try {
      applyProc(thunk, [], env);
      return makeString(port.getOutput());
    } finally {
      currentOutputPort = oldPort;
    }
  });

  def("current-input-port", () => currentInputPort);
  def("current-output-port", () => currentOutputPort);
  def("current-error-port", () => currentErrorPort);

  def("port?", (args) => makeBoolean(args[0]?.type === "port"));
  def("input-port?", (args) => makeBoolean(args[0]?.type === "port" && (args[0] as SchemePort).direction === "input"));
  def("output-port?", (args) => makeBoolean(args[0]?.type === "port" && (args[0] as SchemePort).direction === "output"));
  def("port-open?", (args) => makeBoolean(args[0]?.type === "port" && (args[0] as SchemePort).isOpen));

  def("close-input-port", (args) => {
    if (args.length !== 1) throw new SchemeError("close-input-port: expected 1 argument");
    const port = args[0] as SchemePort;
    if (port.close) port.close();
    port.isOpen = false;
    return UNDEFINED;
  });

  def("close-output-port", (args) => {
    if (args.length !== 1) throw new SchemeError("close-output-port: expected 1 argument");
    const port = args[0] as SchemePort;
    if (port.close) port.close();
    port.isOpen = false;
    return UNDEFINED;
  });

  def("close-port", (args) => {
    if (args.length !== 1) throw new SchemeError("close-port: expected 1 argument");
    const port = args[0] as SchemePort;
    if (port.close) port.close();
    port.isOpen = false;
    return UNDEFINED;
  });

  // Read procedure
  def("read", (args) => {
    const port = args.length >= 1 && args[0].type === "port" ? args[0] : currentInputPort;
    if (!port.readChar) throw new SchemeError("read: not an input port");
    // Read a complete datum from the port
    let src = "";
    while (true) {
      const ch = port.peekChar ? port.peekChar() : null;
      if (ch === null) {
        if (src.trim() === "") return EOF_OBJECT;
        break;
      }
      src += port.readChar!();
      // Try to parse
      try {
        const vals = parse(src);
        if (vals.length > 0) return vals[0];
      } catch {
        // Need more input
      }
    }
    if (src.trim() === "") return EOF_OBJECT;
    try {
      const vals = parse(src);
      return vals[0] ?? EOF_OBJECT;
    } catch {
      return EOF_OBJECT;
    }
  });

  // Error handling
  def("error", (args) => {
    if (args.length < 1) throw new SchemeError("error: expected at least 1 argument");
    const msg = args[0];
    let message: string;
    if (msg.type === "string") {
      message = msg.value;
    } else {
      message = display(msg);
    }
    if (args.length > 1) {
      message += " " + args.slice(1).map(display).join(" ");
    }
    throw new SchemeError(message, args.slice(1));
  });

  def("with-exception-handler", (args, env) => {
    if (args.length !== 2) throw new SchemeError("with-exception-handler: expected 2 arguments");
    const handler = args[0];
    const thunk = args[1];
    try {
      return applyProc(thunk, [], env);
    } catch (e) {
      if (e instanceof SchemeError) {
        return applyProc(handler, [makeString(e.message)], env);
      }
      throw e;
    }
  });

  def("raise", (args) => {
    if (args.length !== 1) throw new SchemeError("raise: expected 1 argument");
    throw new SchemeError(display(args[0]), [args[0]]);
  });

  def("raise-continuable", (args) => {
    if (args.length !== 1) throw new SchemeError("raise-continuable: expected 1 argument");
    throw new SchemeError(display(args[0]), [args[0]]);
  });

  def("error-message", (args) => {
    if (args.length !== 1) throw new SchemeError("error-message: expected 1 argument");
    if (args[0].type === "string") return args[0];
    return makeString(display(args[0]));
  });

  // Type conversion (kept here, primary definitions are at lines 451 and 462)

  // Misc
  def("void", () => UNDEFINED);
  def("undefined", () => UNDEFINED);

  def("gensym", (() => {
    let counter = 0;
    return () => makeSymbol(`g${counter++}`);
  })());

  def("exit", (args) => {
    const code = args.length >= 1 ? assertNumber(args[0], "exit") : 0;
    if (typeof process !== "undefined") process.exit(code);
    return UNDEFINED;
  });

  def("flush-output-port", (args) => UNDEFINED);
  def("flush-output", (args) => UNDEFINED);

  def("make-parameter", (args, env) => {
    if (args.length < 1) throw new SchemeError("make-parameter: expected at least 1 argument");
    let value = args[0];
    return {
      type: "primitive",
      name: "parameter",
      fn: (pArgs) => {
        if (pArgs.length === 0) return value;
        value = pArgs[0];
        return UNDEFINED;
      },
    };
  });

  def("string-contains", (args) => {
    if (args.length < 2) throw new SchemeError("string-contains: expected at least 2 arguments");
    const haystack = assertString(args[0], "string-contains");
    const needle = assertString(args[1], "string-contains");
    const idx = haystack.indexOf(needle);
    return idx >= 0 ? makeNumber(idx, true) : FALSE;
  });

  def("string-split", (args, env) => {
    if (args.length < 2) throw new SchemeError("string-split: expected at least 2 arguments");
    const s = assertString(args[0], "string-split");
    const sep = assertString(args[1], "string-split");
    return arrayToList(s.split(sep).map(makeString));
  });

  def("string-join", (args, env) => {
    if (args.length < 1) throw new SchemeError("string-join: expected at least 1 argument");
    const lst = listToArray(args[0]).map((a) => assertString(a, "string-join"));
    const sep = args.length >= 2 ? assertString(args[1], "string-join") : "";
    return makeString(lst.join(sep));
  });

  def("boolean->string", (args) => {
    if (args.length !== 1) throw new SchemeError("boolean->string: expected 1 argument");
    if (args[0].type !== "boolean") throw new SchemeError("boolean->string: not a boolean");
    return makeString(args[0].value ? "#t" : "#f");
  });

  return env;
}
