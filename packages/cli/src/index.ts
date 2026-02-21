#!/usr/bin/env node
import * as readline from "node:readline";
import { Interpreter, SchemeError, display, write } from "@cpscheme/core";

const interp = new Interpreter((s) => process.stdout.write(s));

function printBanner() {
  console.log("CPScheme - R5RS Scheme Interpreter");
  console.log('Type "(exit)" or Ctrl+D to quit\n');
}

function formatResult(val: ReturnType<typeof interp.evalString>): string {
  if (val.type === "undefined") return "";
  return write(val);
}

async function runRepl() {
  printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  let buffer = "";
  let depth = 0;

  const prompt = () => {
    const p = buffer ? "  ... " : "scheme> ";
    process.stdout.write(p);
  };

  prompt();

  rl.on("line", (line) => {
    buffer += (buffer ? "\n" : "") + line;

    // Count parens to determine if expression is complete
    for (const ch of line) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }

    // If we have balanced parens and some input, evaluate
    if (depth <= 0 && buffer.trim()) {
      depth = 0;
      const input = buffer.trim();
      buffer = "";

      if (input === "(exit)" || input === "(quit)") {
        console.log("Goodbye!");
        rl.close();
        process.exit(0);
      }

      try {
        const result = interp.evalString(input);
        const formatted = formatResult(result);
        if (formatted) {
          console.log(formatted);
        }
      } catch (e) {
        if (e instanceof SchemeError) {
          console.error(`Error: ${e.message}`);
        } else if (e instanceof Error) {
          console.error(`Error: ${e.message}`);
        } else {
          console.error(`Error: ${e}`);
        }
      }

      prompt();
    } else if (depth > 0) {
      prompt();
    } else {
      // Unbalanced - reset
      if (buffer.trim()) {
        try {
          const result = interp.evalString(buffer);
          const formatted = formatResult(result);
          if (formatted) {
            console.log(formatted);
          }
        } catch (e) {
          if (e instanceof SchemeError) {
            console.error(`Error: ${e.message}`);
          } else if (e instanceof Error) {
            console.error(`Error: ${e.message}`);
          }
        }
      }
      buffer = "";
      depth = 0;
      prompt();
    }
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}

// Check if file argument provided
if (process.argv.length > 2) {
  const filename = process.argv[2];
  try {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(filename, "utf-8");
    interp.evalString(source);
  } catch (e) {
    if (e instanceof SchemeError) {
      console.error(`Error: ${e.message}`);
    } else {
      console.error(`Error: ${e}`);
    }
    process.exit(1);
  }
} else {
  runRepl();
}
