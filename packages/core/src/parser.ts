import { Lexer, Token, TokenType } from "./lexer.js";
import {
  SchemeVal,
  SchemeError,
  NIL,
  TRUE,
  FALSE,
  cons,
  makeNumber,
  makeString,
  makeSymbol,
  makeChar,
  arrayToList,
} from "./types.js";

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;

  constructor(private source: string) {
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize();
  }

  parseAll(): SchemeVal[] {
    const results: SchemeVal[] = [];
    while (this.peek().type !== "EOF") {
      results.push(this.parseOne());
    }
    return results;
  }

  parseOne(): SchemeVal {
    const tok = this.peek();
    if (tok.type === "EOF") {
      throw new SchemeError("Unexpected end of input");
    }
    return this.parseExpr();
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "EOF", value: "", line: 0, col: 0 };
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return tok;
  }

  private expect(type: TokenType): Token {
    const tok = this.advance();
    if (tok.type !== type) {
      throw new SchemeError(`Expected ${type} but got ${tok.type} ('${tok.value}') at line ${tok.line}`);
    }
    return tok;
  }

  private parseExpr(): SchemeVal {
    const tok = this.peek();

    switch (tok.type) {
      case "QUOTE": {
        this.advance();
        const val = this.parseExpr();
        return cons(makeSymbol("quote"), cons(val, NIL));
      }
      case "QUASIQUOTE": {
        this.advance();
        const val = this.parseExpr();
        return cons(makeSymbol("quasiquote"), cons(val, NIL));
      }
      case "UNQUOTE": {
        this.advance();
        const val = this.parseExpr();
        return cons(makeSymbol("unquote"), cons(val, NIL));
      }
      case "UNQUOTE_SPLICING": {
        this.advance();
        const val = this.parseExpr();
        return cons(makeSymbol("unquote-splicing"), cons(val, NIL));
      }
      case "LPAREN":
      case "LBRACKET":
        return this.parseList();
      case "HASH_LPAREN":
        return this.parseVector();
      case "NUMBER":
        this.advance();
        return parseNumber(tok.value);
      case "STRING":
        this.advance();
        return parseStringLiteral(tok.value);
      case "SYMBOL":
        this.advance();
        return makeSymbol(tok.value);
      case "BOOLEAN":
        this.advance();
        return tok.value === "#t" || tok.value === "#true" ? TRUE : FALSE;
      case "CHAR":
        this.advance();
        return parseChar(tok.value);
      case "DOT":
        throw new SchemeError(`Unexpected dot at line ${tok.line}`);
      case "EOF":
        throw new SchemeError("Unexpected end of input");
      default:
        throw new SchemeError(`Unexpected token: ${tok.value} at line ${tok.line}`);
    }
  }

  private parseList(): SchemeVal {
    const openTok = this.advance(); // consume ( or [
    const closeType: TokenType = openTok.type === "LBRACKET" ? "RBRACKET" : "RPAREN";

    const elements: SchemeVal[] = [];
    let dotted: SchemeVal | null = null;

    while (this.peek().type !== closeType && this.peek().type !== "EOF") {
      if (this.peek().type === "DOT") {
        this.advance(); // consume .
        dotted = this.parseExpr();
        break;
      }
      elements.push(this.parseExpr());
    }

    if (this.peek().type === "EOF") {
      throw new SchemeError(`Unterminated list starting at line ${openTok.line}`);
    }
    this.advance(); // consume ) or ]

    // Build the list
    let result: SchemeVal = dotted ?? NIL;
    for (let i = elements.length - 1; i >= 0; i--) {
      result = cons(elements[i], result);
    }
    return result;
  }

  private parseVector(): SchemeVal {
    this.advance(); // consume #(
    const elements: SchemeVal[] = [];
    while (this.peek().type !== "RPAREN" && this.peek().type !== "EOF") {
      elements.push(this.parseExpr());
    }
    if (this.peek().type === "EOF") {
      throw new SchemeError("Unterminated vector");
    }
    this.advance(); // consume )
    return { type: "vector", elements };
  }
}

function parseNumber(raw: string): SchemeVal {
  // Handle special float values
  if (raw === "+inf.0") return makeNumber(Infinity, false);
  if (raw === "-inf.0") return makeNumber(-Infinity, false);
  if (raw === "+nan.0" || raw === "-nan.0") return makeNumber(NaN, false);

  // Handle prefixed numbers
  if (raw.startsWith("#")) {
    const prefix = raw[1].toLowerCase();
    const rest = raw.slice(2);

    if (prefix === "b") {
      const n = parseInt(rest, 2);
      if (isNaN(n)) throw new SchemeError(`Invalid binary number: ${raw}`);
      return makeNumber(n, true);
    }
    if (prefix === "o") {
      const n = parseInt(rest, 8);
      if (isNaN(n)) throw new SchemeError(`Invalid octal number: ${raw}`);
      return makeNumber(n, true);
    }
    if (prefix === "d") {
      return parseNumber(rest);
    }
    if (prefix === "x") {
      const n = parseInt(rest, 16);
      if (isNaN(n)) throw new SchemeError(`Invalid hex number: ${raw}`);
      return makeNumber(n, true);
    }
    if (prefix === "e") {
      const inner = parseNumber(rest);
      if (inner.type !== "number") throw new SchemeError(`Invalid exact number: ${raw}`);
      return makeNumber(Math.round(inner.value), true);
    }
    if (prefix === "i") {
      const inner = parseNumber(rest);
      if (inner.type !== "number") throw new SchemeError(`Invalid inexact number: ${raw}`);
      return makeNumber(inner.value, false);
    }
  }

  // Rational number
  if (raw.includes("/")) {
    const [num, den] = raw.split("/");
    const n = parseFloat(num);
    const d = parseFloat(den);
    if (isNaN(n) || isNaN(d) || d === 0) throw new SchemeError(`Invalid rational: ${raw}`);
    return makeNumber(n / d, true);
  }

  // Regular number
  const n = Number(raw);
  if (isNaN(n) && raw !== "+nan.0" && raw !== "-nan.0") {
    throw new SchemeError(`Invalid number: ${raw}`);
  }
  const exact = !raw.includes(".") && !raw.includes("e") && !raw.includes("E") && !raw.includes("n");
  return makeNumber(n, exact);
}

function parseStringLiteral(raw: string): SchemeVal {
  // raw includes surrounding quotes
  const inner = raw.slice(1, -1);
  let result = "";
  let i = 0;
  while (i < inner.length) {
    if (inner[i] === "\\") {
      i++;
      switch (inner[i]) {
        case "n":
          result += "\n";
          break;
        case "t":
          result += "\t";
          break;
        case "r":
          result += "\r";
          break;
        case "\\":
          result += "\\";
          break;
        case '"':
          result += '"';
          break;
        case "a":
          result += "\x07";
          break;
        case "b":
          result += "\x08";
          break;
        case "0":
          result += "\0";
          break;
        default:
          result += inner[i];
          break;
      }
    } else {
      result += inner[i];
    }
    i++;
  }
  return makeString(result);
}

function parseChar(raw: string): SchemeVal {
  // raw is like #\a or #\space
  const name = raw.slice(2); // after #\
  const charNames: Record<string, string> = {
    space: " ",
    newline: "\n",
    tab: "\t",
    return: "\r",
    null: "\0",
    nul: "\0",
    backspace: "\x08",
    delete: "\x7F",
    escape: "\x1B",
    altmode: "\x1B",
    rubout: "\x7F",
    page: "\x0C",
    "": " ", // #\ alone = space
  };
  const lower = name.toLowerCase();
  if (lower in charNames) {
    return makeChar(charNames[lower]);
  }
  if (name.length === 1) {
    return makeChar(name);
  }
  // Hex character: #\x41
  if (name.toLowerCase().startsWith("x") && name.length > 1) {
    const code = parseInt(name.slice(1), 16);
    if (!isNaN(code)) {
      return makeChar(String.fromCharCode(code));
    }
  }
  return makeChar(name[0] ?? "");
}

export function parse(source: string): SchemeVal[] {
  const parser = new Parser(source);
  return parser.parseAll();
}

export function parseOne(source: string): SchemeVal {
  const parser = new Parser(source);
  return parser.parseOne();
}
