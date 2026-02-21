import { Interpreter, SchemeError, write } from "@cpscheme/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface HistoryEntry {
  id: number;
  input: string;
  output: string;
  isError: boolean;
}

const EXAMPLES = [
  "(+ 1 2 3)",
  "(map (lambda (x) (* x x)) '(1 2 3 4 5))",
  "(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))\n(fact 10)",
  "(define (fib n)\n  (let loop ((a 0) (b 1) (i n))\n    (if (= i 0) a (loop b (+ a b) (- i 1)))))\n(fib 30)",
  "(filter odd? '(1 2 3 4 5 6 7 8 9 10))",
];

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: 0,
      input: "",
      output:
        "CPScheme - R5RS Scheme Interpreter\nType Scheme expressions and press Enter or click Run.\n",
      isError: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const interpRef = useRef<Interpreter | null>(null);
  const outputPartsRef = useRef<string[]>([]);
  const nextIdRef = useRef(1); // initial history entry has id:0

  // Initialize a single persistent interpreter instance for REPL session state
  useEffect(() => {
    outputPartsRef.current = [];
    interpRef.current = new Interpreter((s) => outputPartsRef.current.push(s));
  }, []);

  const runCode = useCallback((code: string) => {
    if (!code.trim()) return;

    outputPartsRef.current = [];

    // Lazily initialize if not yet ready
    if (!interpRef.current) {
      interpRef.current = new Interpreter((s) =>
        outputPartsRef.current.push(s),
      );
    }

    // Reuse the persistent interpreter to maintain session state (defines, etc.)
    const interp = interpRef.current;

    let result: string;
    let isError = false;

    try {
      const val = interp.evalString(code);
      const printed = outputPartsRef.current.join("");
      const repr = val.type !== "undefined" ? write(val) : "";
      result = [printed, repr].filter(Boolean).join("\n");
    } catch (e) {
      isError = true;
      if (e instanceof SchemeError) {
        result = `Error: ${e.message}`;
      } else if (e instanceof Error) {
        result = `Error: ${e.message}`;
      } else {
        result = `Error: ${String(e)}`;
      }
    }

    setHistory((h) => [
      ...h,
      { id: nextIdRef.current++, input: code, output: result, isError },
    ]);
    setCommandHistory((h) => [code, ...h]);
    setHistoryIndex(-1);
    setInput("");

    setTimeout(() => {
      outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
    }, 0);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runCode(input);
    } else if (e.key === "ArrowUp" && !e.shiftKey) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      if (newIndex >= 0) setInput(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown" && !e.shiftKey) {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? commandHistory[newIndex] : "");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 CPScheme</h1>
        <p>R5RS Scheme Interpreter</p>
      </header>

      <main className="main">
        <div className="output-container" ref={outputRef}>
          {history.map((entry) => (
            <div key={entry.id} className="history-entry">
              {entry.input && (
                <div className="input-line">
                  <span className="prompt">scheme&gt; </span>
                  <span className="input-text">{entry.input}</span>
                </div>
              )}
              {entry.output && (
                <div className={`output-text ${entry.isError ? "error" : ""}`}>
                  {entry.output}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="input-container">
          <span className="prompt">scheme&gt; </span>
          <textarea
            className="input-area"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Scheme expression... (Enter to run, Shift+Enter for newline)"
            rows={3}
          />
          <button
            type="button"
            className="run-btn"
            onClick={() => runCode(input)}
          >
            Run
          </button>
        </div>

        <div className="examples">
          <span>Examples: </span>
          {EXAMPLES.map((ex) => {
            const label = ex.split("\n")[0];
            const truncated =
              label.length > 30 ? `${label.slice(0, 30)}...` : label;
            return (
              <button
                key={ex}
                type="button"
                className="example-btn"
                onClick={() => setInput(ex)}
              >
                {truncated}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
