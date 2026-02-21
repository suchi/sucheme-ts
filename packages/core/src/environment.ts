import { SchemeError, type SchemeVal } from "./types.js";

export class Environment {
  private bindings: Map<string, SchemeVal>;
  public parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.bindings = new Map();
    this.parent = parent;
  }

  lookup(name: string): SchemeVal {
    if (this.bindings.has(name)) {
      return this.bindings.get(name) as SchemeVal;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    throw new SchemeError(`Unbound variable: ${name}`);
  }

  define(name: string, value: SchemeVal): void {
    this.bindings.set(name, value);
  }

  set(name: string, value: SchemeVal): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    throw new SchemeError(`Unbound variable: ${name}`);
  }

  extend(params: string[], args: SchemeVal[]): Environment {
    const env = new Environment(this);
    for (let i = 0; i < params.length; i++) {
      env.define(params[i], args[i]);
    }
    return env;
  }

  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getOwnBindings(): Map<string, SchemeVal> {
    return new Map(this.bindings);
  }
}
