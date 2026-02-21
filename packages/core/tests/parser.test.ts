import { describe, it, expect } from "vitest";
import { parse, parseOne } from "../src/parser.js";
import { display, write } from "../src/types.js";

describe("Parser", () => {
  it("parses numbers", () => {
    expect(display(parseOne("42"))).toBe("42");
    expect(display(parseOne("-5"))).toBe("-5");
    expect(display(parseOne("3.14"))).toBe("3.14");
  });

  it("parses booleans", () => {
    expect(display(parseOne("#t"))).toBe("#t");
    expect(display(parseOne("#f"))).toBe("#f");
  });

  it("parses symbols", () => {
    expect(display(parseOne("hello"))).toBe("hello");
    expect(display(parseOne("hello-world"))).toBe("hello-world");
    expect(display(parseOne("+"))).toBe("+");
  });

  it("parses strings", () => {
    const s = parseOne('"hello"');
    expect(s.type).toBe("string");
    if (s.type === "string") expect(s.value).toBe("hello");
  });

  it("parses string with escapes", () => {
    const s = parseOne('"hello\\nworld"');
    expect(s.type).toBe("string");
    if (s.type === "string") expect(s.value).toBe("hello\nworld");
  });

  it("parses characters", () => {
    const c = parseOne("#\\a");
    expect(c.type).toBe("char");
    if (c.type === "char") expect(c.value).toBe("a");
  });

  it("parses special characters", () => {
    const space = parseOne("#\\space");
    if (space.type === "char") expect(space.value).toBe(" ");

    const newline = parseOne("#\\newline");
    if (newline.type === "char") expect(newline.value).toBe("\n");
  });

  it("parses empty list", () => {
    const nil = parseOne("()");
    expect(nil.type).toBe("null");
  });

  it("parses simple list", () => {
    const lst = parseOne("(1 2 3)");
    expect(lst.type).toBe("pair");
    expect(display(lst)).toBe("(1 2 3)");
  });

  it("parses nested list", () => {
    const lst = parseOne("(1 (2 3) 4)");
    expect(display(lst)).toBe("(1 (2 3) 4)");
  });

  it("parses dotted pair", () => {
    const pair = parseOne("(a . b)");
    expect(display(pair)).toBe("(a . b)");
  });

  it("parses quoted expression", () => {
    const q = parseOne("'hello");
    expect(display(q)).toBe("(quote hello)");
  });

  it("parses quasiquote", () => {
    const q = parseOne("`hello");
    expect(display(q)).toBe("(quasiquote hello)");
  });

  it("parses unquote", () => {
    const q = parseOne(",x");
    expect(display(q)).toBe("(unquote x)");
  });

  it("parses unquote-splicing", () => {
    const q = parseOne(",@x");
    expect(display(q)).toBe("(unquote-splicing x)");
  });

  it("parses vector", () => {
    const v = parseOne("#(1 2 3)");
    expect(v.type).toBe("vector");
    expect(display(v)).toBe("#(1 2 3)");
  });

  it("parses multiple expressions", () => {
    const exprs = parse("1 2 3");
    expect(exprs).toHaveLength(3);
  });

  it("parses binary numbers", () => {
    const n = parseOne("#b1010");
    expect(n.type).toBe("number");
    if (n.type === "number") expect(n.value).toBe(10);
  });

  it("parses hex numbers", () => {
    const n = parseOne("#xff");
    expect(n.type).toBe("number");
    if (n.type === "number") expect(n.value).toBe(255);
  });

  it("parses octal numbers", () => {
    const n = parseOne("#o10");
    expect(n.type).toBe("number");
    if (n.type === "number") expect(n.value).toBe(8);
  });

  it("write displays strings with quotes", () => {
    const s = parseOne('"hello"');
    expect(write(s)).toBe('"hello"');
    expect(display(s)).toBe("hello");
  });

  it("parses lambda expression", () => {
    const expr = parseOne("(lambda (x y) (+ x y))");
    expect(display(expr)).toBe("(lambda (x y) (+ x y))");
  });

  it("handles comments", () => {
    const exprs = parse("; comment\n42");
    expect(exprs).toHaveLength(1);
    expect(display(exprs[0])).toBe("42");
  });
});
