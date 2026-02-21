import { SchemeError } from "./types.js";

export type TokenType =
  | "LPAREN"
  | "RPAREN"
  | "LBRACKET"
  | "RBRACKET"
  | "HASH_LPAREN" // #(
  | "DOT"
  | "QUOTE"
  | "QUASIQUOTE"
  | "UNQUOTE"
  | "UNQUOTE_SPLICING"
  | "NUMBER"
  | "STRING"
  | "SYMBOL"
  | "BOOLEAN"
  | "CHAR"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export class Lexer {
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private tokens: Token[] = [];

  constructor(private source: string) {}

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) break;
      const tok = this.readToken();
      if (tok) this.tokens.push(tok);
    }
    this.tokens.push({ type: "EOF", value: "", line: this.line, col: this.col });
    return this.tokens;
  }

  private peek(offset = 0): string {
    return this.source[this.pos + offset] ?? "";
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        this.advance();
      } else if (ch === ";") {
        // Line comment
        while (this.pos < this.source.length && this.peek() !== "\n") {
          this.advance();
        }
      } else if (ch === "#" && this.peek(1) === "|") {
        // Block comment #| ... |#
        this.advance();
        this.advance();
        while (this.pos < this.source.length) {
          if (this.peek() === "|" && this.peek(1) === "#") {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
      } else if (ch === "#" && this.peek(1) === "!") {
        // Shebang or #!eof etc - skip line
        while (this.pos < this.source.length && this.peek() !== "\n") {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private readToken(): Token | null {
    const line = this.line;
    const col = this.col;
    const ch = this.peek();

    if (ch === "(") {
      this.advance();
      return { type: "LPAREN", value: "(", line, col };
    }
    if (ch === ")") {
      this.advance();
      return { type: "RPAREN", value: ")", line, col };
    }
    if (ch === "[") {
      this.advance();
      return { type: "LBRACKET", value: "[", line, col };
    }
    if (ch === "]") {
      this.advance();
      return { type: "RBRACKET", value: "]", line, col };
    }
    if (ch === "'") {
      this.advance();
      return { type: "QUOTE", value: "'", line, col };
    }
    if (ch === "`") {
      this.advance();
      return { type: "QUASIQUOTE", value: "`", line, col };
    }
    if (ch === ",") {
      this.advance();
      if (this.peek() === "@") {
        this.advance();
        return { type: "UNQUOTE_SPLICING", value: ",@", line, col };
      }
      return { type: "UNQUOTE", value: ",", line, col };
    }
    if (ch === "#") {
      return this.readHash(line, col);
    }
    if (ch === '"') {
      return this.readString(line, col);
    }
    if (ch === ".") {
      // Could be a dot, ellipsis (...), or a number like .5
      const next = this.peek(1);
      if (next >= "0" && next <= "9") {
        return this.readNumber(line, col);
      }
      // Check for ellipsis (...)
      if (next === "." && this.peek(2) === ".") {
        // It's ... (ellipsis) - read as a symbol
        return this.readSymbol(line, col);
      }
      // Single dot only if followed by delimiter
      if (this.isDelimiter(next)) {
        this.advance();
        return { type: "DOT", value: ".", line, col };
      }
      return this.readSymbol(line, col);
    }

    // Number or symbol
    if (this.isNumberStart(ch)) {
      return this.readNumber(line, col);
    }

    return this.readSymbol(line, col);
  }

  private readHash(line: number, col: number): Token {
    this.advance(); // consume #
    const next = this.peek();

    if (next === "(") {
      this.advance();
      return { type: "HASH_LPAREN", value: "#(", line, col };
    }
    if (next === "t") {
      this.advance();
      // #true or #t
      if (this.peek() === "r") {
        this.readWhile((c) => this.isSymbolChar(c));
      }
      return { type: "BOOLEAN", value: "#t", line, col };
    }
    if (next === "f") {
      this.advance();
      // #false or #f
      if (this.peek() === "a") {
        this.readWhile((c) => this.isSymbolChar(c));
      }
      return { type: "BOOLEAN", value: "#f", line, col };
    }
    if (next === "\\") {
      return this.readChar(line, col);
    }
    if (next === "b" || next === "o" || next === "d" || next === "x" || next === "e" || next === "i") {
      return this.readPrefixedNumber(line, col, next);
    }

    // Datum labels like #0= #0# - treat as symbol for now
    const rest = this.readWhile((c) => this.isSymbolChar(c));
    return { type: "SYMBOL", value: `#${rest}`, line, col };
  }

  private readChar(line: number, col: number): Token {
    this.advance(); // consume \
    // Read character name or single char
    let name = "";
    if (this.pos < this.source.length) {
      const first = this.advance();
      name = first;
      // Check if it's a named character
      while (this.pos < this.source.length && this.isSymbolChar(this.peek()) && !this.isDelimiter(this.peek())) {
        name += this.advance();
      }
    }
    return { type: "CHAR", value: `#\\${name}`, line, col };
  }

  private readPrefixedNumber(line: number, col: number, prefix: string): Token {
    this.advance(); // consume prefix letter
    const rest = this.readWhile((c) => this.isNumberChar(c) || c === "+" || c === "-" || c === "." || c === "/");
    return { type: "NUMBER", value: `#${prefix}${rest}`, line, col };
  }

  private readString(line: number, col: number): Token {
    this.advance(); // consume "
    let value = '"';
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === "\\") {
        this.advance();
        value += "\\";
        if (this.pos < this.source.length) {
          value += this.advance();
        }
      } else {
        value += this.advance();
      }
    }
    if (this.pos >= this.source.length) {
      throw new SchemeError(`Unterminated string at line ${line}`);
    }
    this.advance(); // consume closing "
    value += '"';
    return { type: "STRING", value, line, col };
  }

  private readNumber(line: number, col: number): Token {
    // Read sign and digits
    let value = "";
    if (this.peek() === "+" || this.peek() === "-") {
      value += this.advance();
    }
    value += this.readWhile((c) => this.isNumberChar(c) || c === "." || c === "/" || c === "e" || c === "E" || c === "+" || c === "-");
    return { type: "NUMBER", value, line, col };
  }

  private readSymbol(line: number, col: number): Token {
    let value = "";
    while (this.pos < this.source.length && !this.isDelimiter(this.peek())) {
      value += this.advance();
    }
    if (!value) {
      // Unrecognized character - skip it
      value = this.advance();
    }
    return { type: "SYMBOL", value, line, col };
  }

  private readWhile(pred: (ch: string) => boolean): string {
    let result = "";
    while (this.pos < this.source.length && pred(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  private isDelimiter(ch: string): boolean {
    return (
      ch === " " ||
      ch === "\t" ||
      ch === "\n" ||
      ch === "\r" ||
      ch === "(" ||
      ch === ")" ||
      ch === "[" ||
      ch === "]" ||
      ch === '"' ||
      ch === ";" ||
      ch === "" ||
      ch === "#"
    );
  }

  private isNumberStart(ch: string): boolean {
    return (ch >= "0" && ch <= "9") || ((ch === "+" || ch === "-") && this.peek(1) >= "0" && this.peek(1) <= "9") || (ch === "+" && (this.peek(1) === "i" || this.peek(1) === "n")) || (ch === "-" && (this.peek(1) === "i" || this.peek(1) === "n"));
  }

  private isNumberChar(ch: string): boolean {
    return (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
  }

  private isSymbolChar(ch: string): boolean {
    return !this.isDelimiter(ch);
  }
}
