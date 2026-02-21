import { Environment } from "./environment.js";
import { applyMacro, parseSyntaxRules } from "./macros.js";
import {
  ContinuationError,
  FALSE,
  NIL,
  SchemeError,
  type SchemeMacro,
  type SchemePrimitive,
  type SchemeProcedure,
  type SchemeVal,
  TRUE,
  UNDEFINED,
  arrayToList,
  car,
  cdr,
  cons,
  display,
  isTruthy,
  listToArray,
  makeBoolean,
  makeNumber,
  makeString,
  makeSymbol,
  write,
} from "./types.js";

// Evaluate an expression with TCO trampoline
export function evaluate(expr: SchemeVal, env: Environment): SchemeVal {
  let currentExpr = expr;
  let currentEnv = env;

  while (true) {
    const result = evalStep(currentExpr, currentEnv);
    if (
      result !== null &&
      typeof result === "object" &&
      "type" in result &&
      result.type === "tail-call"
    ) {
      currentExpr = result.expr;
      currentEnv = result.env;
    } else {
      return result;
    }
  }
}

function makeTailCall(expr: SchemeVal, env: Environment): SchemeVal {
  return { type: "tail-call", expr, env };
}

function evalStep(expr: SchemeVal, env: Environment): SchemeVal {
  switch (expr.type) {
    case "symbol":
      return env.lookup(expr.name);

    case "boolean":
    case "number":
    case "string":
    case "char":
    case "vector":
    case "null":
      return expr;

    case "pair":
      return evalPair(expr.car, expr.cdr, env);

    default:
      return expr;
  }
}

function evalPair(
  head: SchemeVal,
  tail: SchemeVal,
  env: Environment,
): SchemeVal {
  // Check for special forms
  if (head.type === "symbol") {
    const name = head.name;

    switch (name) {
      case "quote": {
        const args = listToArray(tail);
        if (args.length !== 1)
          throw new SchemeError("quote: expected 1 argument");
        return args[0];
      }

      case "if": {
        const args = listToArray(tail);
        if (args.length < 2 || args.length > 3) {
          throw new SchemeError("if: expected 2 or 3 arguments");
        }
        const cond = evaluate(args[0], env);
        if (isTruthy(cond)) {
          return makeTailCall(args[1], env);
        }
        if (args.length === 3) {
          return makeTailCall(args[2], env);
        }
        return UNDEFINED;
      }

      case "cond": {
        return evalCond(tail, env);
      }

      case "case": {
        return evalCase(tail, env);
      }

      case "and": {
        if (tail.type === "null") return TRUE;
        const args = listToArray(tail);
        for (let i = 0; i < args.length - 1; i++) {
          const val = evaluate(args[i], env);
          if (!isTruthy(val)) return FALSE;
        }
        return makeTailCall(args[args.length - 1], env);
      }

      case "or": {
        if (tail.type === "null") return FALSE;
        const args = listToArray(tail);
        for (let i = 0; i < args.length - 1; i++) {
          const val = evaluate(args[i], env);
          if (isTruthy(val)) return val;
        }
        return makeTailCall(args[args.length - 1], env);
      }

      case "when": {
        const args = listToArray(tail);
        if (args.length < 2)
          throw new SchemeError("when: expected condition and body");
        const cond = evaluate(args[0], env);
        if (isTruthy(cond)) {
          for (let i = 1; i < args.length - 1; i++) {
            evaluate(args[i], env);
          }
          return makeTailCall(args[args.length - 1], env);
        }
        return UNDEFINED;
      }

      case "unless": {
        const args = listToArray(tail);
        if (args.length < 2)
          throw new SchemeError("unless: expected condition and body");
        const cond = evaluate(args[0], env);
        if (!isTruthy(cond)) {
          for (let i = 1; i < args.length - 1; i++) {
            evaluate(args[i], env);
          }
          return makeTailCall(args[args.length - 1], env);
        }
        return UNDEFINED;
      }

      case "lambda": {
        return evalLambda(tail, env);
      }

      case "define": {
        return evalDefine(tail, env);
      }

      case "define-syntax": {
        const args = listToArray(tail);
        if (args.length !== 2)
          throw new SchemeError("define-syntax: expected name and transformer");
        const nameExpr = args[0];
        if (nameExpr.type !== "symbol")
          throw new SchemeError("define-syntax: name must be symbol");
        const transformer = evaluate(args[1], env);
        if (transformer.type !== "macro")
          throw new SchemeError("define-syntax: expected macro transformer");
        const macro: SchemeMacro = { ...transformer, name: nameExpr.name };
        env.define(nameExpr.name, macro);
        return UNDEFINED;
      }

      case "let-syntax":
      case "letrec-syntax": {
        return evalLetSyntax(name, tail, env);
      }

      case "syntax-rules": {
        const transformer = parseSyntaxRules(tail, env);
        return { type: "macro", transformer };
      }

      case "set!": {
        const args = listToArray(tail);
        if (args.length !== 2)
          throw new SchemeError("set!: expected 2 arguments");
        if (args[0].type !== "symbol")
          throw new SchemeError("set!: first argument must be symbol");
        const val = evaluate(args[1], env);
        env.set(args[0].name, val);
        return UNDEFINED;
      }

      case "begin": {
        if (tail.type === "null") return UNDEFINED;
        const args = listToArray(tail);
        for (let i = 0; i < args.length - 1; i++) {
          evaluate(args[i], env);
        }
        return makeTailCall(args[args.length - 1], env);
      }

      case "let": {
        return evalLet(tail, env);
      }

      case "let*": {
        return evalLetStar(tail, env);
      }

      case "letrec": {
        return evalLetrec(tail, env, false);
      }

      case "letrec*": {
        return evalLetrec(tail, env, true);
      }

      case "do": {
        return evalDo(tail, env);
      }

      case "delay": {
        const args = listToArray(tail);
        if (args.length !== 1)
          throw new SchemeError("delay: expected 1 argument");
        // Create a promise (thunk)
        const promiseExpr = args[0];
        const capturedEnv = env;
        let forced = false;
        let cachedValue: SchemeVal = UNDEFINED;
        return {
          type: "primitive",
          name: "promise",
          fn: () => {
            if (!forced) {
              cachedValue = evaluate(promiseExpr, capturedEnv);
              forced = true;
            }
            return cachedValue;
          },
        };
      }

      case "force": {
        const args = listToArray(tail);
        if (args.length !== 1)
          throw new SchemeError("force: expected 1 argument");
        const promise = evaluate(args[0], env);
        if (promise.type === "primitive" && promise.name === "promise") {
          return promise.fn([], env);
        }
        return promise; // Already forced
      }

      case "quasiquote": {
        const args = listToArray(tail);
        if (args.length !== 1)
          throw new SchemeError("quasiquote: expected 1 argument");
        return evalQuasiquote(args[0], env, 1);
      }

      case "values": {
        const args = listToArray(tail);
        const vals = args.map((a) => evaluate(a, env));
        if (vals.length === 1) return vals[0];
        return { type: "values", values: vals };
      }

      case "call-with-values": {
        const args = listToArray(tail);
        if (args.length !== 2)
          throw new SchemeError("call-with-values: expected 2 arguments");
        const producer = evaluate(args[0], env);
        const consumer = evaluate(args[1], env);
        const produced = applyProc(producer, [], env);
        const producedArgs =
          produced.type === "values" ? produced.values : [produced];
        return applyProcTCO(consumer, producedArgs, env);
      }

      case "call-with-current-continuation":
      case "call/cc": {
        const args = listToArray(tail);
        if (args.length !== 1)
          throw new SchemeError("call/cc: expected 1 argument");
        const proc = evaluate(args[0], env);
        return callCC(proc, env);
      }

      case "dynamic-wind": {
        const args = listToArray(tail);
        if (args.length !== 3)
          throw new SchemeError("dynamic-wind: expected 3 arguments");
        const before = evaluate(args[0], env);
        const thunk = evaluate(args[1], env);
        const after = evaluate(args[2], env);
        applyProc(before, [], env);
        let result: SchemeVal;
        try {
          result = applyProc(thunk, [], env);
        } finally {
          applyProc(after, [], env);
        }
        return result;
      }

      case "define-record-type": {
        return evalDefineRecordType(tail, env);
      }

      case "with-exception-handler": {
        const args = listToArray(tail);
        if (args.length !== 2)
          throw new SchemeError("with-exception-handler: expected 2 arguments");
        const handler = evaluate(args[0], env);
        const thunk = evaluate(args[1], env);
        try {
          return applyProc(thunk, [], env);
        } catch (e) {
          if (e instanceof SchemeError) {
            return applyProc(handler, [makeString(e.message)], env);
          }
          throw e;
        }
      }

      case "guard": {
        return evalGuard(tail, env);
      }

      case "parameterize": {
        // Simple implementation - doesn't support dynamic binding properly
        const args = listToArray(tail);
        if (args.length < 2)
          throw new SchemeError("parameterize: expected bindings and body");
        const bindings = listToArray(args[0]);
        for (let i = 1; i < args.length - 1; i++) {
          evaluate(args[i], env);
        }
        return makeTailCall(args[args.length - 1], env);
      }

      default: {
        // Check if it's a macro
        let maybeVal: SchemeVal | null = null;
        try {
          maybeVal = env.lookup(name);
        } catch {
          // Not bound
        }
        if (maybeVal && maybeVal.type === "macro") {
          const expanded = applyMacro(maybeVal.transformer, cons(head, tail));
          return makeTailCall(expanded, env);
        }
        break;
      }
    }
  }

  // Function call
  const proc = evaluate(head, env);

  // Check if it's a macro
  if (proc.type === "macro") {
    const expanded = applyMacro(proc.transformer, cons(head, tail));
    return makeTailCall(expanded, env);
  }

  const argList = listToArray(tail);
  const args = argList.map((a) => evaluate(a, env));

  return applyProcTCO(proc, args, env);
}

function evalLambda(tail: SchemeVal, env: Environment): SchemeVal {
  if (tail.type !== "pair") throw new SchemeError("lambda: invalid form");

  const paramSpec = tail.type === "pair" ? tail.car : NIL;
  const body = listToArray(tail.type === "pair" ? tail.cdr : NIL);

  if (body.length === 0) throw new SchemeError("lambda: empty body");

  // Parse params
  let params: SchemeProcedure["params"];

  if (paramSpec.type === "symbol") {
    // (lambda args body) - rest args
    params = { required: [], rest: paramSpec.name };
  } else if (paramSpec.type === "null") {
    params = [];
  } else if (paramSpec.type === "pair") {
    // Check for improper list (rest args)
    const required: string[] = [];
    let current: SchemeVal = paramSpec;
    while (current.type === "pair") {
      if (current.car.type !== "symbol")
        throw new SchemeError("lambda: parameter must be symbol");
      required.push(current.car.name);
      current = current.cdr;
    }
    if (current.type === "symbol") {
      params = { required, rest: current.name };
    } else {
      params = required;
    }
  } else {
    throw new SchemeError("lambda: invalid parameter list");
  }

  return { type: "procedure", params, body, env };
}

function evalDefine(tail: SchemeVal, env: Environment): SchemeVal {
  if (tail.type !== "pair") throw new SchemeError("define: invalid form");

  const first = tail.car;
  const rest = tail.cdr;

  if (first.type === "symbol") {
    // (define name value)
    const name = first.name;
    let value: SchemeVal = UNDEFINED;
    if (rest.type === "pair") {
      value = evaluate(rest.car, env);
    }
    // Name procedures
    if (value.type === "procedure" && !value.name) {
      value = { ...value, name };
    }
    env.define(name, value);
    return UNDEFINED;
  }

  if (first.type === "pair") {
    // (define (name params...) body...)
    const nameSym = first.car;
    if (nameSym.type !== "symbol")
      throw new SchemeError("define: procedure name must be symbol");
    const name = nameSym.name;
    const paramList = first.cdr;
    const body = listToArray(rest);
    if (body.length === 0) throw new SchemeError("define: empty body");

    // Parse params like lambda
    let params: SchemeProcedure["params"];
    if (paramList.type === "symbol") {
      params = { required: [], rest: paramList.name };
    } else if (paramList.type === "null") {
      params = [];
    } else if (paramList.type === "pair") {
      const required: string[] = [];
      let current: SchemeVal = paramList;
      while (current.type === "pair") {
        if (current.car.type !== "symbol")
          throw new SchemeError("define: parameter must be symbol");
        required.push(current.car.name);
        current = current.cdr;
      }
      if (current.type === "symbol") {
        params = { required, rest: current.name };
      } else {
        params = required;
      }
    } else {
      throw new SchemeError("define: invalid parameter list");
    }

    const proc: SchemeProcedure = {
      type: "procedure",
      params,
      body,
      env,
      name,
    };
    env.define(name, proc);
    return UNDEFINED;
  }

  throw new SchemeError("define: invalid form");
}

function evalLet(tail: SchemeVal, env: Environment): SchemeVal {
  if (tail.type !== "pair") throw new SchemeError("let: invalid form");

  // Named let?
  if (tail.car.type === "symbol") {
    return evalNamedLet(tail.car.name, tail.cdr, env);
  }

  const bindings = listToArray(tail.car);
  const body = listToArray(tail.cdr);
  if (body.length === 0) throw new SchemeError("let: empty body");

  const newEnv = new Environment(env);
  for (const binding of bindings) {
    const pair = listToArray(binding);
    if (pair.length !== 2 || pair[0].type !== "symbol")
      throw new SchemeError("let: invalid binding");
    const val = evaluate(pair[1], env);
    newEnv.define(pair[0].name, val);
  }

  for (let i = 0; i < body.length - 1; i++) {
    evaluate(body[i], newEnv);
  }
  return makeTailCall(body[body.length - 1], newEnv);
}

function evalNamedLet(
  name: string,
  tail: SchemeVal,
  env: Environment,
): SchemeVal {
  const bindingsList = listToArray(car(tail));
  const body = listToArray(cdr(tail));
  if (body.length === 0) throw new SchemeError("named let: empty body");

  const params: string[] = [];
  const initVals: SchemeVal[] = [];

  for (const binding of bindingsList) {
    const pair = listToArray(binding);
    if (pair.length !== 2 || pair[0].type !== "symbol")
      throw new SchemeError("named let: invalid binding");
    params.push(pair[0].name);
    initVals.push(evaluate(pair[1], env));
  }

  const loopEnv = new Environment(env);
  const proc: SchemeProcedure = {
    type: "procedure",
    params,
    body,
    env: loopEnv,
    name,
  };
  loopEnv.define(name, proc);

  return applyProcTCO(proc, initVals, loopEnv);
}

function evalLetStar(tail: SchemeVal, env: Environment): SchemeVal {
  if (tail.type !== "pair") throw new SchemeError("let*: invalid form");

  const bindings = listToArray(tail.car);
  const body = listToArray(tail.cdr);
  if (body.length === 0) throw new SchemeError("let*: empty body");

  let newEnv = new Environment(env);
  for (const binding of bindings) {
    const pair = listToArray(binding);
    if (pair.length !== 2 || pair[0].type !== "symbol")
      throw new SchemeError("let*: invalid binding");
    const val = evaluate(pair[1], newEnv);
    const nextEnv = new Environment(newEnv);
    nextEnv.define(pair[0].name, val);
    newEnv = nextEnv;
  }

  for (let i = 0; i < body.length - 1; i++) {
    evaluate(body[i], newEnv);
  }
  return makeTailCall(body[body.length - 1], newEnv);
}

function evalLetrec(
  tail: SchemeVal,
  env: Environment,
  sequential: boolean,
): SchemeVal {
  if (tail.type !== "pair") throw new SchemeError("letrec: invalid form");

  const bindings = listToArray(tail.car);
  const body = listToArray(tail.cdr);
  if (body.length === 0) throw new SchemeError("letrec: empty body");

  const newEnv = new Environment(env);

  // Define all variables as undefined first
  for (const binding of bindings) {
    const pair = listToArray(binding);
    if (pair.length !== 2 || pair[0].type !== "symbol")
      throw new SchemeError("letrec: invalid binding");
    newEnv.define(pair[0].name, UNDEFINED);
  }

  // Now evaluate and set
  for (const binding of bindings) {
    const pair = listToArray(binding);
    const val = evaluate(pair[1], newEnv);
    const sym = pair[0];
    if (sym.type !== "symbol")
      throw new SchemeError("letrec*: binding name must be a symbol");
    newEnv.set(sym.name, val);
  }

  for (let i = 0; i < body.length - 1; i++) {
    evaluate(body[i], newEnv);
  }
  return makeTailCall(body[body.length - 1], newEnv);
}

function evalCond(tail: SchemeVal, env: Environment): SchemeVal {
  const clauses = listToArray(tail);
  for (const clause of clauses) {
    const parts = listToArray(clause);
    if (parts.length === 0) throw new SchemeError("cond: empty clause");

    const test = parts[0];

    if (test.type === "symbol" && test.name === "else") {
      // else clause
      if (parts.length === 1) return UNDEFINED;
      for (let i = 1; i < parts.length - 1; i++) {
        evaluate(parts[i], env);
      }
      return makeTailCall(parts[parts.length - 1], env);
    }

    const val = evaluate(test, env);
    if (isTruthy(val)) {
      if (parts.length === 1) return val;
      // Check for => syntax
      if (
        parts.length === 3 &&
        parts[1].type === "symbol" &&
        parts[1].name === "=>"
      ) {
        const proc = evaluate(parts[2], env);
        return applyProcTCO(proc, [val], env);
      }
      for (let i = 1; i < parts.length - 1; i++) {
        evaluate(parts[i], env);
      }
      return makeTailCall(parts[parts.length - 1], env);
    }
  }
  return UNDEFINED;
}

function evalCase(tail: SchemeVal, env: Environment): SchemeVal {
  const args = listToArray(tail);
  if (args.length < 2) throw new SchemeError("case: invalid form");

  const key = evaluate(args[0], env);
  const clauses = args.slice(1);

  for (const clause of clauses) {
    const parts = listToArray(clause);
    if (parts.length < 2) throw new SchemeError("case: invalid clause");

    const datums = parts[0];

    if (datums.type === "symbol" && datums.name === "else") {
      for (let i = 1; i < parts.length - 1; i++) {
        evaluate(parts[i], env);
      }
      return makeTailCall(parts[parts.length - 1], env);
    }

    // datums is a list
    const datumList = listToArray(datums);
    for (const datum of datumList) {
      if (eqv(key, datum)) {
        for (let i = 1; i < parts.length - 1; i++) {
          evaluate(parts[i], env);
        }
        return makeTailCall(parts[parts.length - 1], env);
      }
    }
  }
  return UNDEFINED;
}

function evalDo(tail: SchemeVal, env: Environment): SchemeVal {
  // (do ((var init step) ...) (test expr...) body...)
  const args = listToArray(tail);
  if (args.length < 2) throw new SchemeError("do: invalid form");

  const varSpecs = listToArray(args[0]);
  const testClause = listToArray(args[1]);
  const body = args.slice(2);

  if (testClause.length === 0) throw new SchemeError("do: empty test clause");

  // Initialize
  const doEnv = new Environment(env);
  const vars: Array<{ name: string; step: SchemeVal | null }> = [];

  for (const spec of varSpecs) {
    const parts = listToArray(spec);
    if (parts.length < 2 || parts[0].type !== "symbol")
      throw new SchemeError("do: invalid variable spec");
    const name = parts[0].name;
    const init = evaluate(parts[1], env);
    const step = parts.length >= 3 ? parts[2] : null;
    doEnv.define(name, init);
    vars.push({ name, step });
  }

  while (true) {
    const testResult = evaluate(testClause[0], doEnv);
    if (isTruthy(testResult)) {
      // Test passed - evaluate result exprs
      if (testClause.length === 1) return UNDEFINED;
      for (let i = 1; i < testClause.length - 1; i++) {
        evaluate(testClause[i], doEnv);
      }
      return evaluate(testClause[testClause.length - 1], doEnv);
    }

    // Execute body
    for (const b of body) {
      evaluate(b, doEnv);
    }

    // Update vars
    const newVals = vars.map((v) =>
      v.step ? evaluate(v.step, doEnv) : doEnv.lookup(v.name),
    );
    for (let i = 0; i < vars.length; i++) {
      doEnv.define(vars[i].name, newVals[i]);
    }
  }
}

function evalLetSyntax(
  kind: string,
  tail: SchemeVal,
  env: Environment,
): SchemeVal {
  const args = listToArray(tail);
  if (args.length < 2) throw new SchemeError(`${kind}: invalid form`);

  const bindings = listToArray(args[0]);
  const body = args.slice(1);

  const newEnv = new Environment(env);

  for (const binding of bindings) {
    const pair = listToArray(binding);
    if (pair.length !== 2 || pair[0].type !== "symbol")
      throw new SchemeError(`${kind}: invalid binding`);
    const transformer = evaluate(
      pair[1],
      kind === "letrec-syntax" ? newEnv : env,
    );
    if (transformer.type !== "macro")
      throw new SchemeError(`${kind}: expected macro transformer`);
    newEnv.define(pair[0].name, { ...transformer, name: pair[0].name });
  }

  for (let i = 0; i < body.length - 1; i++) {
    evaluate(body[i], newEnv);
  }
  return makeTailCall(body[body.length - 1], newEnv);
}

function evalGuard(tail: SchemeVal, env: Environment): SchemeVal {
  // (guard (var clause...) body...)
  const args = listToArray(tail);
  if (args.length < 2) throw new SchemeError("guard: invalid form");

  const guardClause = listToArray(args[0]);
  if (guardClause.length < 1 || guardClause[0].type !== "symbol") {
    throw new SchemeError("guard: invalid guard clause");
  }

  const varName = guardClause[0].name;
  const clauses = guardClause.slice(1);
  const body = args.slice(1);

  try {
    let result: SchemeVal = UNDEFINED;
    for (let i = 0; i < body.length - 1; i++) {
      evaluate(body[i], env);
    }
    result = evaluate(body[body.length - 1], env);
    return result;
  } catch (e) {
    let exceptionVal: SchemeVal;
    if (e instanceof SchemeError) {
      exceptionVal = makeString(e.message);
    } else if (e instanceof Error) {
      exceptionVal = makeString(e.message);
    } else {
      exceptionVal = makeString(String(e));
    }

    const guardEnv = new Environment(env);
    guardEnv.define(varName, exceptionVal);

    for (const clause of clauses) {
      const parts = listToArray(clause);
      if (parts.length === 0) continue;

      if (parts[0].type === "symbol" && parts[0].name === "else") {
        for (let i = 1; i < parts.length - 1; i++) {
          evaluate(parts[i], guardEnv);
        }
        return evaluate(parts[parts.length - 1], guardEnv);
      }

      const testVal = evaluate(parts[0], guardEnv);
      if (isTruthy(testVal)) {
        if (parts.length === 1) return testVal;
        if (
          parts.length === 3 &&
          parts[1].type === "symbol" &&
          parts[1].name === "=>"
        ) {
          const proc = evaluate(parts[2], guardEnv);
          return applyProc(proc, [testVal], guardEnv);
        }
        for (let i = 1; i < parts.length - 1; i++) {
          evaluate(parts[i], guardEnv);
        }
        return evaluate(parts[parts.length - 1], guardEnv);
      }
    }

    // Re-raise
    throw e;
  }
}

function evalDefineRecordType(tail: SchemeVal, env: Environment): SchemeVal {
  // (define-record-type <name> (<constructor> <field>...) <predicate> (<field> <accessor> [<modifier>])...)
  const args = listToArray(tail);
  if (args.length < 3)
    throw new SchemeError("define-record-type: invalid form");

  const typeName = args[0];
  if (typeName.type !== "symbol")
    throw new SchemeError("define-record-type: type name must be symbol");

  const constructorSpec = listToArray(args[1]);
  if (constructorSpec.length < 1 || constructorSpec[0].type !== "symbol") {
    throw new SchemeError("define-record-type: invalid constructor spec");
  }

  const constructorName = constructorSpec[0].name;
  const constructorFields = constructorSpec.slice(1).map((f) => {
    if (f.type !== "symbol")
      throw new SchemeError("define-record-type: field must be symbol");
    return f.name;
  });

  const predicateSym = args[2];
  if (predicateSym.type !== "symbol")
    throw new SchemeError("define-record-type: predicate must be symbol");
  const predicateName = predicateSym.name;

  const fieldSpecs = args.slice(3);
  const fields: Array<{ name: string; accessor: string; modifier?: string }> =
    [];

  for (const spec of fieldSpecs) {
    const parts = listToArray(spec);
    if (parts.length < 2)
      throw new SchemeError("define-record-type: invalid field spec");
    if (parts[0].type !== "symbol" || parts[1].type !== "symbol") {
      throw new SchemeError("define-record-type: field spec must have symbols");
    }
    fields.push({
      name: parts[0].name,
      accessor: parts[1].name,
      modifier:
        parts.length >= 3 && parts[2].type === "symbol"
          ? parts[2].name
          : undefined,
    });
  }

  const typeTag = Symbol(typeName.name);

  // Constructor
  env.define(constructorName, {
    type: "primitive",
    name: constructorName,
    fn: (args) => {
      if (args.length !== constructorFields.length) {
        throw new SchemeError(
          `${constructorName}: expected ${constructorFields.length} arguments`,
        );
      }
      const record: Record<string, SchemeVal> = {};
      for (let i = 0; i < constructorFields.length; i++) {
        record[constructorFields[i]] = args[i];
      }
      return {
        type: "primitive",
        name: `#<record ${typeName.name}>`,
        fn: (args2) => {
          const fieldName = args2[0];
          if (fieldName?.type === "symbol") {
            return record[fieldName.name] ?? UNDEFINED;
          }
          return UNDEFINED;
        },
        // Store record data for access
        ...(record as Record<string, SchemeVal>),
        __tag__: typeTag,
        __type__: typeName.name,
        __fields__: record,
      } as SchemeVal & {
        __tag__: symbol;
        __type__: string;
        __fields__: Record<string, SchemeVal>;
      };
    },
  });

  // Predicate
  env.define(predicateName, {
    type: "primitive",
    name: predicateName,
    fn: (args) => {
      if (args.length !== 1)
        throw new SchemeError(`${predicateName}: expected 1 argument`);
      const obj = args[0] as SchemeVal & { __tag__?: symbol };
      return makeBoolean(obj.__tag__ === typeTag);
    },
  });

  // Accessors and modifiers
  for (const field of fields) {
    env.define(field.accessor, {
      type: "primitive",
      name: field.accessor,
      fn: (args) => {
        if (args.length !== 1)
          throw new SchemeError(`${field.accessor}: expected 1 argument`);
        const obj = args[0] as SchemeVal & {
          __tag__?: symbol;
          __fields__?: Record<string, SchemeVal>;
        };
        if (obj.__tag__ !== typeTag)
          throw new SchemeError(`${field.accessor}: not a ${typeName.name}`);
        return obj.__fields__?.[field.name] ?? UNDEFINED;
      },
    });

    if (field.modifier) {
      const modName = field.modifier;
      env.define(modName, {
        type: "primitive",
        name: modName,
        fn: (args) => {
          if (args.length !== 2)
            throw new SchemeError(`${modName}: expected 2 arguments`);
          const obj = args[0] as SchemeVal & {
            __tag__?: symbol;
            __fields__?: Record<string, SchemeVal>;
          };
          if (obj.__tag__ !== typeTag)
            throw new SchemeError(`${modName}: not a ${typeName.name}`);
          if (obj.__fields__) {
            obj.__fields__[field.name] = args[1];
          }
          return UNDEFINED;
        },
      });
    }
  }

  return UNDEFINED;
}

function evalQuasiquote(
  expr: SchemeVal,
  env: Environment,
  depth: number,
): SchemeVal {
  if (expr.type === "pair") {
    if (expr.car.type === "symbol" && expr.car.name === "unquote") {
      if (depth === 1) {
        return evaluate(car(cdr(expr)), env);
      }
      return cons(
        makeSymbol("unquote"),
        cons(evalQuasiquote(car(cdr(expr)), env, depth - 1), NIL),
      );
    }

    if (expr.car.type === "symbol" && expr.car.name === "quasiquote") {
      return cons(
        makeSymbol("quasiquote"),
        cons(evalQuasiquote(car(cdr(expr)), env, depth + 1), NIL),
      );
    }

    // Check for unquote-splicing in car
    if (
      expr.car.type === "pair" &&
      expr.car.car.type === "symbol" &&
      expr.car.car.name === "unquote-splicing"
    ) {
      if (depth === 1) {
        const spliced = evaluate(car(cdr(expr.car)), env);
        const rest = evalQuasiquote(expr.cdr, env, depth);
        // Append spliced to rest
        return appendLists(spliced, rest);
      }
    }

    return cons(
      evalQuasiquote(expr.car, env, depth),
      evalQuasiquote(expr.cdr, env, depth),
    );
  }

  if (expr.type === "vector") {
    // Expand quasiquoted vector
    const elements: SchemeVal[] = [];
    for (const e of expr.elements) {
      if (
        e.type === "pair" &&
        e.car.type === "symbol" &&
        e.car.name === "unquote-splicing" &&
        depth === 1
      ) {
        const spliced = evaluate(car(cdr(e)), env);
        // Add all elements from spliced
        let cur: SchemeVal = spliced;
        while (cur.type === "pair") {
          elements.push(cur.car);
          cur = cur.cdr;
        }
      } else {
        elements.push(evalQuasiquote(e, env, depth));
      }
    }
    return { type: "vector", elements };
  }

  return expr;
}

function appendLists(a: SchemeVal, b: SchemeVal): SchemeVal {
  if (a.type === "null") return b;
  if (a.type !== "pair") throw new SchemeError("unquote-splicing: not a list");
  return cons(a.car, appendLists(a.cdr, b));
}

export function applyProc(
  proc: SchemeVal,
  args: SchemeVal[],
  env: Environment,
): SchemeVal {
  if (proc.type === "primitive") {
    return proc.fn(args, env);
  }

  if (proc.type === "procedure") {
    const callEnv = bindArgs(proc, args);
    let result: SchemeVal = UNDEFINED;
    for (let i = 0; i < proc.body.length - 1; i++) {
      result = evaluate(proc.body[i], callEnv);
    }
    return evaluate(proc.body[proc.body.length - 1], callEnv);
  }

  if (proc.type === "macro") {
    throw new SchemeError("Cannot apply macro as procedure");
  }

  throw new SchemeError(`Not a procedure: ${display(proc)}`);
}

function applyProcTCO(
  proc: SchemeVal,
  args: SchemeVal[],
  env: Environment,
): SchemeVal {
  if (proc.type === "primitive") {
    return proc.fn(args, env);
  }

  if (proc.type === "procedure") {
    const callEnv = bindArgs(proc, args);
    for (let i = 0; i < proc.body.length - 1; i++) {
      evaluate(proc.body[i], callEnv);
    }
    return makeTailCall(proc.body[proc.body.length - 1], callEnv);
  }

  if (proc.type === "macro") {
    throw new SchemeError("Cannot apply macro as procedure");
  }

  throw new SchemeError(`Not a procedure: ${display(proc)}`);
}

function bindArgs(proc: SchemeProcedure, args: SchemeVal[]): Environment {
  const callEnv = new Environment(proc.env);
  const params = proc.params;

  if (Array.isArray(params)) {
    if (args.length !== params.length) {
      throw new SchemeError(
        `${proc.name ?? "procedure"}: expected ${params.length} arguments, got ${args.length}`,
      );
    }
    for (let i = 0; i < params.length; i++) {
      callEnv.define(params[i], args[i]);
    }
  } else {
    const { required, rest } = params;
    if (args.length < required.length) {
      throw new SchemeError(
        `${proc.name ?? "procedure"}: expected at least ${required.length} arguments, got ${args.length}`,
      );
    }
    for (let i = 0; i < required.length; i++) {
      callEnv.define(required[i], args[i]);
    }
    if (rest !== null) {
      callEnv.define(rest, arrayToList(args.slice(required.length)));
    }
  }

  return callEnv;
}

function callCC(proc: SchemeVal, env: Environment): SchemeVal {
  const id = Symbol("continuation");

  const continuation: SchemePrimitive = {
    type: "primitive",
    name: "continuation",
    fn: (args) => {
      const val =
        args.length === 1
          ? args[0]
          : args.length === 0
            ? UNDEFINED
            : { type: "values" as const, values: args };
      throw new ContinuationError(id, val);
    },
  };

  try {
    return applyProc(proc, [continuation], env);
  } catch (e) {
    if (e instanceof ContinuationError && e.id === id) {
      return e.value;
    }
    throw e;
  }
}

function eqv(a: SchemeVal, b: SchemeVal): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "boolean":
      return a.value === (b as typeof a).value;
    case "number":
      return a.value === (b as typeof a).value;
    case "symbol":
      return a.name === (b as typeof a).name;
    case "char":
      return a.value === (b as typeof a).value;
    case "null":
      return true;
    case "pair":
    case "vector":
    case "string":
      return a === b; // Reference equality
    default:
      return a === b;
  }
}
