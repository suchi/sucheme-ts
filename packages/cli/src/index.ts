#!/usr/bin/env node
/**
 * CPScheme CLI - R5RS Scheme Interpreter
 *
 * Usage:
 *   cpscheme [options] [file ...]
 *
 * Options:
 *   -h, --help            Show this help message and exit
 *   -V, --version         Show version and exit
 *   -e, --eval <expr>     Evaluate expression and exit (use multiple times)
 *   -l, --load <file>     Load and execute a file before starting REPL
 *   -i, --interactive     Start interactive REPL after processing files/--eval
 *   -q, --quiet           Suppress banner and prompts (useful for scripting)
 *   -b, --batch           Read expressions from stdin in batch mode (no REPL)
 *       --no-write        Do not print result values in REPL (display-only mode)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { Interpreter, SchemeError, write } from "@cpscheme/core";

// ---- version ---------------------------------------------------------------

const VERSION = "0.1.0";

// ---- option parsing --------------------------------------------------------

interface CliOptions {
  help: boolean;
  version: boolean;
  evalExprs: string[];
  loadFiles: string[];
  interactive: boolean;
  quiet: boolean;
  batch: boolean;
  noWrite: boolean;
  files: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    help: false,
    version: false,
    evalExprs: [],
    loadFiles: [],
    interactive: false,
    quiet: false,
    batch: false,
    noWrite: false,
    files: [],
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-V":
      case "--version":
        opts.version = true;
        break;
      case "-e":
      case "--eval": {
        const expr = argv[++i];
        if (!expr) {
          console.error(`cpscheme: option ${arg} requires an argument`);
          process.exit(1);
        }
        opts.evalExprs.push(expr);
        break;
      }
      case "-l":
      case "--load": {
        const file = argv[++i];
        if (!file) {
          console.error(`cpscheme: option ${arg} requires an argument`);
          process.exit(1);
        }
        opts.loadFiles.push(file);
        break;
      }
      case "-i":
      case "--interactive":
        opts.interactive = true;
        break;
      case "-q":
      case "--quiet":
        opts.quiet = true;
        break;
      case "-b":
      case "--batch":
        opts.batch = true;
        break;
      case "--no-write":
        opts.noWrite = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`cpscheme: unknown option: ${arg}`);
          process.exit(1);
        }
        opts.files.push(arg);
        break;
    }
    i++;
  }

  return opts;
}

// ---- help / version --------------------------------------------------------

function printHelp(): void {
  console.log(`\
cpscheme ${VERSION} - R5RS Scheme Interpreter

Usage:
  cpscheme [options] [file ...]

Options:
  -h, --help            Show this help message and exit
  -V, --version         Show version and exit
  -e, --eval <expr>     Evaluate expression and print result (repeatable)
  -l, --load <file>     Load and execute file before REPL (repeatable)
  -i, --interactive     Start interactive REPL after processing files/--eval
  -q, --quiet           Suppress banner and result values (for scripting)
  -b, --batch           Read and execute from stdin without a REPL prompt
      --no-write        Do not print expression results in REPL

Examples:
  cpscheme                        # Start interactive REPL
  cpscheme script.scm             # Execute script and exit
  cpscheme -e "(+ 1 2)"          # Evaluate expression and exit
  cpscheme -l lib.scm -i          # Load library then start REPL
  cpscheme -q script.scm          # Run script silently
  cpscheme -e "(display 42)" -i   # Evaluate then start REPL
  echo "(+ 1 2)" | cpscheme -b    # Batch mode from stdin`);
}

function printVersion(): void {
  console.log(`cpscheme ${VERSION}`);
}

// ---- interpreter helpers ---------------------------------------------------

const interp = new Interpreter((s) => process.stdout.write(s));

function formatResult(val: ReturnType<typeof interp.evalString>): string {
  if (val.type === "undefined") return "";
  return write(val);
}

function evalSource(source: string, sourceName: string): boolean {
  try {
    interp.evalString(source);
    return true;
  } catch (e) {
    if (e instanceof SchemeError) {
      console.error(`${sourceName}: ${e.message}`);
    } else if (e instanceof Error) {
      console.error(`${sourceName}: ${e.message}`);
    } else {
      console.error(`${sourceName}: ${e}`);
    }
    return false;
  }
}

function loadFile(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  try {
    const source = fs.readFileSync(resolved, "utf-8");
    return evalSource(source, resolved);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`cpscheme: cannot open file '${filePath}': No such file`);
    } else if (e instanceof SchemeError) {
      console.error(`${filePath}: ${e.message}`);
    } else if (e instanceof Error) {
      console.error(`${filePath}: ${e.message}`);
    } else {
      console.error(`${filePath}: ${e}`);
    }
    return false;
  }
}

// ---- REPL ------------------------------------------------------------------

function printBanner(): void {
  console.log(`CPScheme ${VERSION} - R5RS Scheme Interpreter`);
  console.log('Type "(exit)" or press Ctrl+D to quit\n');
}

function countParens(s: string): number {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (const ch of s) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === ";") break; // line comment
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
  }
  return depth;
}

async function runRepl(opts: CliOptions): Promise<void> {
  if (!opts.quiet) printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  let buffer = "";
  let depth = 0;

  const prompt = () => {
    if (!opts.quiet) {
      process.stdout.write(buffer ? "  ... " : "scheme> ");
    }
  };

  prompt();

  rl.on("line", (line) => {
    buffer += (buffer ? "\n" : "") + line;
    depth += countParens(line);

    // Evaluate when parens are balanced and there is input
    if (depth <= 0 && buffer.trim()) {
      depth = 0;
      const input = buffer.trim();
      buffer = "";

      if (input === "(exit)" || input === "(quit)") {
        if (!opts.quiet) console.log("Goodbye!");
        rl.close();
        process.exit(0);
      }

      try {
        const result = interp.evalString(input);
        if (!opts.quiet && !opts.noWrite) {
          const formatted = formatResult(result);
          if (formatted) console.log(formatted);
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
      // depth < 0: unbalanced, try to evaluate as-is
      depth = 0;
      const input = buffer.trim();
      buffer = "";
      if (input) {
        try {
          const result = interp.evalString(input);
          if (!opts.quiet && !opts.noWrite) {
            const formatted = formatResult(result);
            if (formatted) console.log(formatted);
          }
        } catch (e) {
          if (e instanceof SchemeError) {
            console.error(`Error: ${e.message}`);
          } else if (e instanceof Error) {
            console.error(`Error: ${e.message}`);
          }
        }
      }
      prompt();
    }
  });

  rl.on("close", () => {
    if (!opts.quiet) console.log("\nGoodbye!");
    process.exit(0);
  });
}

// ---- batch mode (stdin) ----------------------------------------------------

async function runBatch(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const source = Buffer.concat(chunks).toString("utf-8");
  if (source.trim()) {
    const ok = evalSource(source, "<stdin>");
    if (!ok) process.exit(1);
  }
}

// ---- main ------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    printVersion();
    process.exit(0);
  }

  // Step 1: --load files
  for (const file of opts.loadFiles) {
    if (!loadFile(file)) process.exit(1);
  }

  // Step 2: --eval expressions
  for (const expr of opts.evalExprs) {
    try {
      const result = interp.evalString(expr);
      if (!opts.quiet) {
        const formatted = formatResult(result);
        if (formatted) console.log(formatted);
      }
    } catch (e) {
      if (e instanceof SchemeError) {
        console.error(`Error: ${e.message}`);
      } else if (e instanceof Error) {
        console.error(`Error: ${e.message}`);
      } else {
        console.error(`Error: ${e}`);
      }
      if (!opts.interactive) process.exit(1);
    }
  }

  // Step 3: positional file arguments
  if (opts.files.length > 0) {
    for (const file of opts.files) {
      if (!loadFile(file)) process.exit(1);
    }
    // After files: start REPL only if -i was specified
    if (opts.interactive) {
      await runRepl(opts);
    }
    // Otherwise exit cleanly
    return;
  }

  // Step 4: if --eval given (but no positional files), check for -i
  if (opts.evalExprs.length > 0 && !opts.interactive) {
    return;
  }

  // Step 5: batch mode
  if (opts.batch) {
    await runBatch();
    return;
  }

  // Step 6: default — interactive REPL
  await runRepl(opts);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
