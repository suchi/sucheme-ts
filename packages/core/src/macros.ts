import type { Environment } from "./environment.js";
import {
  NIL,
  SchemeError,
  type SchemeVal,
  type SyntaxRulesTransformer,
  arrayToList,
  cons,
  display,
  isList,
  listToArray,
  makeSymbol,
} from "./types.js";

// Match a syntax-rules pattern against a form, returning bindings or null
function matchPattern(
  pattern: SchemeVal,
  form: SchemeVal,
  literals: string[],
  bindings: Map<string, SchemeVal | SchemeVal[]>,
): boolean {
  if (pattern.type === "symbol") {
    if (pattern.name === "_") {
      return true; // wildcard
    }
    if (literals.includes(pattern.name)) {
      // Must match literally
      return form.type === "symbol" && form.name === pattern.name;
    }
    // Pattern variable - bind it
    bindings.set(pattern.name, form as SchemeVal);
    return true;
  }

  if (pattern.type === "null") {
    return form.type === "null";
  }

  if (pattern.type === "boolean") {
    return form.type === "boolean" && form.value === pattern.value;
  }

  if (pattern.type === "number") {
    return form.type === "number" && form.value === pattern.value;
  }

  if (pattern.type === "string") {
    return form.type === "string" && form.value === pattern.value;
  }

  if (pattern.type === "pair") {
    // Check for ellipsis pattern
    if (
      pattern.cdr.type === "pair" &&
      pattern.cdr.car.type === "symbol" &&
      pattern.cdr.car.name === "..."
    ) {
      // The subpattern is pattern.car, rest is pattern.cdr.cdr
      const subPattern = pattern.car;
      const restPattern = pattern.cdr.cdr;

      // Collect pattern variables in subPattern
      const subPatVars = collectPatternVars(subPattern, literals);

      // Initialize ellipsis bindings
      for (const v of subPatVars) {
        bindings.set(v, []);
      }

      // Match as many elements as possible
      const current: SchemeVal = form;
      const collected: SchemeVal[] = [];

      // Count how many elements remain after ellipsis
      const restPatternLength = listLength(restPattern);

      // Collect the form elements
      const formElements: SchemeVal[] = [];
      let cur: SchemeVal = form;
      while (cur.type === "pair") {
        formElements.push(cur.car);
        cur = cur.cdr;
      }
      const formTail = cur;

      const ellipsisCount = formElements.length - restPatternLength;
      if (ellipsisCount < 0) return false;

      // Match ellipsis elements
      for (let i = 0; i < ellipsisCount; i++) {
        const subBindings = new Map<string, SchemeVal | SchemeVal[]>();
        if (!matchPattern(subPattern, formElements[i], literals, subBindings))
          return false;
        for (const v of subPatVars) {
          const existing = bindings.get(v) as SchemeVal[];
          const val = subBindings.get(v);
          if (val !== undefined) {
            existing.push(val as SchemeVal);
          }
        }
      }

      // Match rest pattern
      let restForm: SchemeVal = arrayToList(formElements.slice(ellipsisCount));
      if (formTail.type !== "null") {
        // Improper list in form - attach tail
        // This is unusual; handle by building improper list
        let r: SchemeVal = formTail;
        for (let i = formElements.length - 1; i >= ellipsisCount; i--) {
          r = cons(formElements[i], r);
        }
        restForm = r;
      }

      return matchPattern(restPattern, restForm, literals, bindings);
    }

    // Regular pair
    if (form.type !== "pair") return false;
    return (
      matchPattern(pattern.car, form.car, literals, bindings) &&
      matchPattern(pattern.cdr, form.cdr, literals, bindings)
    );
  }

  if (pattern.type === "vector") {
    if (form.type !== "vector") return false;
    if (pattern.elements.length !== form.elements.length) return false;
    for (let i = 0; i < pattern.elements.length; i++) {
      if (
        !matchPattern(pattern.elements[i], form.elements[i], literals, bindings)
      )
        return false;
    }
    return true;
  }

  return false;
}

function collectPatternVars(pattern: SchemeVal, literals: string[]): string[] {
  const vars: string[] = [];
  collectPatternVarsHelper(pattern, literals, vars);
  return vars;
}

function collectPatternVarsHelper(
  pattern: SchemeVal,
  literals: string[],
  vars: string[],
): void {
  if (pattern.type === "symbol") {
    if (
      pattern.name !== "_" &&
      pattern.name !== "..." &&
      !literals.includes(pattern.name)
    ) {
      vars.push(pattern.name);
    }
    return;
  }
  if (pattern.type === "pair") {
    collectPatternVarsHelper(pattern.car, literals, vars);
    collectPatternVarsHelper(pattern.cdr, literals, vars);
    return;
  }
  if (pattern.type === "vector") {
    for (const e of pattern.elements) {
      collectPatternVarsHelper(e, literals, vars);
    }
  }
}

function listLength(lst: SchemeVal): number {
  let count = 0;
  let cur: SchemeVal = lst;
  while (cur.type === "pair") {
    count++;
    cur = cur.cdr;
  }
  return count;
}

// Expand a template using bindings
function expandTemplate(
  template: SchemeVal,
  bindings: Map<string, SchemeVal | SchemeVal[]>,
  ellipsisDepth: number,
): SchemeVal {
  if (template.type === "symbol") {
    const val = bindings.get(template.name);
    if (val !== undefined) {
      if (Array.isArray(val)) {
        if (ellipsisDepth > 0) {
          throw new SchemeError(
            `macro: ellipsis variable used at wrong depth: ${template.name}`,
          );
        }
        return val[0] ?? NIL;
      }
      return val;
    }
    return template;
  }

  if (template.type === "pair") {
    // Check for ellipsis expansion
    if (
      template.cdr.type === "pair" &&
      template.cdr.car.type === "symbol" &&
      template.cdr.car.name === "..."
    ) {
      const subTemplate = template.car;
      const restTemplate = template.cdr.cdr;

      // Find ellipsis variables in subTemplate
      const ellipsisVars = findEllipsisVars(subTemplate, bindings);

      if (ellipsisVars.length === 0) {
        // No ellipsis vars - treat literally
        return cons(
          expandTemplate(subTemplate, bindings, ellipsisDepth),
          expandTemplate(restTemplate, bindings, ellipsisDepth),
        );
      }

      // Get length from first ellipsis var
      const firstVar = bindings.get(ellipsisVars[0]);
      const count = Array.isArray(firstVar) ? firstVar.length : 0;

      // Expand count times
      const expanded: SchemeVal[] = [];
      for (let i = 0; i < count; i++) {
        // Create bindings with index
        const subBindings = new Map(bindings);
        for (const v of ellipsisVars) {
          const arr = bindings.get(v) as SchemeVal[];
          subBindings.set(v, arr[i] ?? NIL);
        }
        expanded.push(
          expandTemplate(subTemplate, subBindings, ellipsisDepth + 1),
        );
      }

      // Build list from expanded + rest
      const rest = expandTemplate(restTemplate, bindings, ellipsisDepth);
      let result: SchemeVal = rest;
      for (let i = expanded.length - 1; i >= 0; i--) {
        result = cons(expanded[i], result);
      }
      return result;
    }

    return cons(
      expandTemplate(template.car, bindings, ellipsisDepth),
      expandTemplate(template.cdr, bindings, ellipsisDepth),
    );
  }

  if (template.type === "vector") {
    const elements: SchemeVal[] = [];
    for (const e of template.elements) {
      elements.push(expandTemplate(e, bindings, ellipsisDepth));
    }
    return { type: "vector", elements };
  }

  return template;
}

function findEllipsisVars(
  template: SchemeVal,
  bindings: Map<string, SchemeVal | SchemeVal[]>,
): string[] {
  const vars: string[] = [];
  findEllipsisVarsHelper(template, bindings, vars);
  return vars;
}

function findEllipsisVarsHelper(
  template: SchemeVal,
  bindings: Map<string, SchemeVal | SchemeVal[]>,
  vars: string[],
): void {
  if (template.type === "symbol") {
    const val = bindings.get(template.name);
    if (Array.isArray(val)) {
      vars.push(template.name);
    }
    return;
  }
  if (template.type === "pair") {
    findEllipsisVarsHelper(template.car, bindings, vars);
    findEllipsisVarsHelper(template.cdr, bindings, vars);
    return;
  }
  if (template.type === "vector") {
    for (const e of template.elements) {
      findEllipsisVarsHelper(e, bindings, vars);
    }
  }
}

export function applyMacro(
  transformer: SyntaxRulesTransformer,
  form: SchemeVal,
): SchemeVal {
  const { literals, rules } = transformer;

  for (const rule of rules) {
    const bindings = new Map<string, SchemeVal | SchemeVal[]>();
    // The pattern's car is the keyword - skip it in matching
    const patternTail =
      rule.pattern.type === "pair" ? rule.pattern.cdr : rule.pattern;
    const formTail = form.type === "pair" ? form.cdr : form;

    if (matchPattern(patternTail, formTail, literals, bindings)) {
      return expandTemplate(rule.template, bindings, 0);
    }
  }

  throw new SchemeError(`macro: no matching pattern for ${display(form)}`);
}

export function parseSyntaxRules(
  form: SchemeVal,
  definitionEnv: Environment,
): SyntaxRulesTransformer {
  // (syntax-rules (literals...) (pattern template) ...)
  if (form.type !== "pair") throw new SchemeError("syntax-rules: invalid form");

  const args = listToArray(form);
  if (args.length < 2) throw new SchemeError("syntax-rules: too few arguments");

  const literalsList = args[0];
  const literals: string[] = [];

  if (literalsList.type !== "null") {
    for (const lit of listToArray(literalsList)) {
      if (lit.type !== "symbol")
        throw new SchemeError("syntax-rules: literal must be symbol");
      literals.push(lit.name);
    }
  }

  const rules: Array<{ pattern: SchemeVal; template: SchemeVal }> = [];
  for (let i = 1; i < args.length; i++) {
    const rule = args[i];
    if (rule.type !== "pair")
      throw new SchemeError("syntax-rules: invalid rule");
    const ruleArr = listToArray(rule);
    if (ruleArr.length !== 2)
      throw new SchemeError(
        "syntax-rules: rule must have pattern and template",
      );
    rules.push({ pattern: ruleArr[0], template: ruleArr[1] });
  }

  return { literals, rules, definitionEnv };
}
