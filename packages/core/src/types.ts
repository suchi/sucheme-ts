import type { Environment } from "./environment.js";

export type SchemeVal =
  | SchemePair
  | SchemeNull
  | SchemeBoolean
  | SchemeNumber
  | SchemeString
  | SchemeSymbol
  | SchemeChar
  | SchemeVector
  | SchemeProcedure
  | SchemePrimitive
  | SchemeMacro
  | SchemePort
  | SchemeValues
  | SchemeUndefined
  | SchemeTailCall;

export interface SchemePair {
  type: "pair";
  car: SchemeVal;
  cdr: SchemeVal;
}

export interface SchemeNull {
  type: "null";
}

export interface SchemeBoolean {
  type: "boolean";
  value: boolean;
}

export interface SchemeNumber {
  type: "number";
  value: number;
  exact: boolean;
}

export interface SchemeString {
  type: "string";
  value: string;
}

export interface SchemeSymbol {
  type: "symbol";
  name: string;
}

export interface SchemeChar {
  type: "char";
  value: string;
}

export interface SchemeVector {
  type: "vector";
  elements: SchemeVal[];
}

export interface SchemeProcedure {
  type: "procedure";
  params: string[] | { required: string[]; rest: string | null };
  body: SchemeVal[];
  env: Environment;
  name?: string;
}

export interface SchemePrimitive {
  type: "primitive";
  name: string;
  fn: (args: SchemeVal[], env: Environment) => SchemeVal;
}

export interface SchemeMacro {
  type: "macro";
  transformer: SyntaxRulesTransformer;
  name?: string;
}

export interface SchemePort {
  type: "port";
  direction: "input" | "output";
  isOpen: boolean;
  readChar?: () => string | null;
  peekChar?: () => string | null;
  writeChar?: (ch: string) => void;
  close?: () => void;
}

export interface SchemeValues {
  type: "values";
  values: SchemeVal[];
}

export interface SchemeUndefined {
  type: "undefined";
}

export interface SchemeTailCall {
  type: "tail-call";
  expr: SchemeVal;
  env: Environment;
}

export interface SyntaxRulesTransformer {
  literals: string[];
  rules: Array<{ pattern: SchemeVal; template: SchemeVal }>;
  definitionEnv: Environment;
}

export const NIL: SchemeNull = { type: "null" };
export const TRUE: SchemeBoolean = { type: "boolean", value: true };
export const FALSE: SchemeBoolean = { type: "boolean", value: false };
export const UNDEFINED: SchemeUndefined = { type: "undefined" };

export function cons(car: SchemeVal, cdr: SchemeVal): SchemePair {
  return { type: "pair", car, cdr };
}

export function car(pair: SchemeVal): SchemeVal {
  if (pair.type !== "pair")
    throw new SchemeError(`car: not a pair: ${display(pair)}`);
  return pair.car;
}

export function cdr(pair: SchemeVal): SchemeVal {
  if (pair.type !== "pair")
    throw new SchemeError(`cdr: not a pair: ${display(pair)}`);
  return pair.cdr;
}

export function isList(val: SchemeVal): boolean {
  let current: SchemeVal = val;
  const visited = new Set<SchemePair>();
  while (current.type === "pair") {
    if (visited.has(current)) return false;
    visited.add(current);
    current = current.cdr;
  }
  return current.type === "null";
}

export function listToArray(val: SchemeVal): SchemeVal[] {
  const result: SchemeVal[] = [];
  let current: SchemeVal = val;
  while (current.type === "pair") {
    result.push(current.car);
    current = current.cdr;
  }
  if (current.type !== "null") {
    throw new SchemeError("not a proper list");
  }
  return result;
}

export function listToArrayAllowImproper(val: SchemeVal): {
  elements: SchemeVal[];
  tail: SchemeVal;
} {
  const elements: SchemeVal[] = [];
  let current: SchemeVal = val;
  while (current.type === "pair") {
    elements.push(current.car);
    current = current.cdr;
  }
  return { elements, tail: current };
}

export function arrayToList(arr: SchemeVal[]): SchemeVal {
  let result: SchemeVal = NIL;
  for (let i = arr.length - 1; i >= 0; i--) {
    result = cons(arr[i], result);
  }
  return result;
}

export function makeNumber(value: number, exact = true): SchemeNumber {
  return { type: "number", value, exact };
}

export function makeString(value: string): SchemeString {
  return { type: "string", value };
}

export function makeSymbol(name: string): SchemeSymbol {
  return { type: "symbol", name };
}

export function makeChar(value: string): SchemeChar {
  return { type: "char", value };
}

export function makeBoolean(value: boolean): SchemeBoolean {
  return value ? TRUE : FALSE;
}

export function isTruthy(val: SchemeVal): boolean {
  return !(val.type === "boolean" && val.value === false);
}

export function display(val: SchemeVal): string {
  return schemeWrite(val, false);
}

export function write(val: SchemeVal): string {
  return schemeWrite(val, true);
}

function schemeWrite(val: SchemeVal, isWrite: boolean): string {
  switch (val.type) {
    case "null":
      return "()";
    case "boolean":
      return val.value ? "#t" : "#f";
    case "number":
      if (Number.isNaN(val.value)) return "+nan.0";
      if (!Number.isFinite(val.value))
        return val.value > 0 ? "+inf.0" : "-inf.0";
      return val.value.toString();
    case "string":
      return isWrite
        ? `"${val.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`
        : val.value;
    case "symbol":
      return val.name;
    case "char":
      if (isWrite) {
        if (val.value === " ") return "#\\space";
        if (val.value === "\n") return "#\\newline";
        if (val.value === "\t") return "#\\tab";
        if (val.value === "\r") return "#\\return";
        if (val.value === "\0") return "#\\null";
        if (val.value === "\x08") return "#\\backspace";
        if (val.value === "\x0C") return "#\\page";
        if (val.value === "\x1B") return "#\\escape";
        if (val.value === "\x7F") return "#\\delete";
        if (val.value === "\x0B") return "#\\altmode";
        return `#\\${val.value}`;
      }
      return val.value;
    case "pair": {
      const parts: string[] = [];
      let current: SchemeVal = val;
      while (current.type === "pair") {
        parts.push(schemeWrite(current.car, isWrite));
        current = current.cdr;
      }
      if (current.type === "null") {
        return `(${parts.join(" ")})`;
      }
      return `(${parts.join(" ")} . ${schemeWrite(current, isWrite)})`;
    }
    case "vector":
      return `#(${val.elements.map((e) => schemeWrite(e, isWrite)).join(" ")})`;
    case "procedure":
      return val.name ? `#<procedure ${val.name}>` : "#<procedure>";
    case "primitive":
      return `#<primitive ${val.name}>`;
    case "macro":
      return `#<macro${val.name ? ` ${val.name}` : ""}>`;
    case "port":
      return `#<${val.direction}-port>`;
    case "values":
      return val.values.map((v) => schemeWrite(v, isWrite)).join("\n");
    case "undefined":
      return "";
    case "tail-call":
      return "#<tail-call>";
    default: {
      const _exhaustive: never = val;
      return "#<unknown>";
    }
  }
}

export class SchemeError extends Error {
  constructor(
    message: string,
    public readonly irritants?: SchemeVal[],
  ) {
    super(message);
    this.name = "SchemeError";
  }
}

export class ContinuationError extends Error {
  constructor(
    public readonly id: symbol,
    public readonly value: SchemeVal,
  ) {
    super("continuation");
    this.name = "ContinuationError";
  }
}

export class TailCallError extends Error {
  constructor(public readonly thunk: () => SchemeVal) {
    super("tail-call");
    this.name = "TailCallError";
  }
}
