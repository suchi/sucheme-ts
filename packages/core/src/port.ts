import { SchemeError, type SchemePort } from "./types.js";

export function makeStringInputPort(s: string): SchemePort {
  let pos = 0;
  return {
    type: "port",
    direction: "input",
    isOpen: true,
    readChar: () => {
      if (pos >= s.length) return null;
      return s[pos++];
    },
    peekChar: () => {
      if (pos >= s.length) return null;
      return s[pos];
    },
    close: () => {
      // no-op for string ports
    },
  };
}

export function makeStringOutputPort(): SchemePort & {
  getOutput: () => string;
} {
  let output = "";
  return {
    type: "port",
    direction: "output",
    isOpen: true,
    writeChar: (ch: string) => {
      output += ch;
    },
    close: () => {
      // no-op
    },
    getOutput: () => output,
  };
}

export function makeConsoleOutputPort(): SchemePort {
  let buffer = "";
  return {
    type: "port",
    direction: "output",
    isOpen: true,
    writeChar: (ch: string) => {
      buffer += ch;
      if (ch === "\n") {
        process.stdout?.write(buffer);
        buffer = "";
      }
    },
    close: () => {
      if (buffer) {
        process.stdout?.write(buffer);
        buffer = "";
      }
    },
  };
}
