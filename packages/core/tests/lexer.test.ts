import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer.js";

function tokenize(source: string) {
  const lexer = new Lexer(source);
  return lexer.tokenize().filter((t) => t.type !== "EOF");
}

describe("Lexer", () => {
  it("tokenizes parentheses", () => {
    const tokens = tokenize("()");
    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe("LPAREN");
    expect(tokens[1].type).toBe("RPAREN");
  });

  it("tokenizes integers", () => {
    const tokens = tokenize("42");
    expect(tokens[0].type).toBe("NUMBER");
    expect(tokens[0].value).toBe("42");
  });

  it("tokenizes negative numbers", () => {
    const tokens = tokenize("-5");
    expect(tokens[0].type).toBe("NUMBER");
    expect(tokens[0].value).toBe("-5");
  });

  it("tokenizes symbols", () => {
    const tokens = tokenize("hello-world");
    expect(tokens[0].type).toBe("SYMBOL");
    expect(tokens[0].value).toBe("hello-world");
  });

  it("tokenizes strings", () => {
    const tokens = tokenize('"hello world"');
    expect(tokens[0].type).toBe("STRING");
    expect(tokens[0].value).toBe('"hello world"');
  });

  it("tokenizes booleans", () => {
    const t1 = tokenize("#t");
    const t2 = tokenize("#f");
    expect(t1[0].type).toBe("BOOLEAN");
    expect(t1[0].value).toBe("#t");
    expect(t2[0].type).toBe("BOOLEAN");
    expect(t2[0].value).toBe("#f");
  });

  it("tokenizes characters", () => {
    const tokens = tokenize("#\\a");
    expect(tokens[0].type).toBe("CHAR");
    expect(tokens[0].value).toBe("#\\a");
  });

  it("tokenizes special character names", () => {
    const tokens = tokenize("#\\space");
    expect(tokens[0].type).toBe("CHAR");
    expect(tokens[0].value).toBe("#\\space");
  });

  it("tokenizes quotes", () => {
    const tokens = tokenize("'x");
    expect(tokens[0].type).toBe("QUOTE");
    expect(tokens[1].type).toBe("SYMBOL");
  });

  it("tokenizes quasiquote", () => {
    const tokens = tokenize("`x");
    expect(tokens[0].type).toBe("QUASIQUOTE");
  });

  it("tokenizes unquote", () => {
    const tokens = tokenize(",x");
    expect(tokens[0].type).toBe("UNQUOTE");
  });

  it("tokenizes unquote-splicing", () => {
    const tokens = tokenize(",@x");
    expect(tokens[0].type).toBe("UNQUOTE_SPLICING");
  });

  it("tokenizes vector literals", () => {
    const tokens = tokenize("#(1 2 3)");
    expect(tokens[0].type).toBe("HASH_LPAREN");
  });

  it("skips line comments", () => {
    const tokens = tokenize("; this is a comment\n42");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe("42");
  });

  it("tokenizes dot", () => {
    const tokens = tokenize("(a . b)");
    const types = tokens.map((t) => t.type);
    expect(types).toContain("DOT");
  });

  it("tokenizes binary numbers", () => {
    const tokens = tokenize("#b1010");
    expect(tokens[0].type).toBe("NUMBER");
    expect(tokens[0].value).toBe("#b1010");
  });

  it("tokenizes hex numbers", () => {
    const tokens = tokenize("#xff");
    expect(tokens[0].type).toBe("NUMBER");
  });

  it("handles multiple expressions", () => {
    const tokens = tokenize("(+ 1 2) (- 3 4)");
    expect(tokens.filter((t) => t.type === "LPAREN")).toHaveLength(2);
  });
});
