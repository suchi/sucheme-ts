import { useState, useRef, useCallback, useEffect } from "react";
import { Interpreter, display, write, SchemeError } from "@cpscheme/core";

interface HistoryEntry {
  input: string;
  output: string;
  isError: boolean;
}

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      input: "",
      output: "CPScheme - R5RS Scheme Interpreter\nType Scheme expressions and press Enter or click Run.\n",
      isError: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const interpRef = useRef<Interpreter | null>(null);

  // Initialize interpreter
  useEffect(() => {
    const output: string[] = [];
    interpRef.current = new Interpreter((s) => {
      output.push(s);
    });
  }, []);

  const getInterp = () => {
    if (!interpRef.current) {
      interpRef.current = new Interpreter((s) => {
        // handled below
      });
    }
    return interpRef.current;
  };

  const runCode = useCallback((code: string) => {
    if (!code.trim()) return;

    const outputParts: string[] = [];
    const interp = new Interpreter((s) => outputParts.push(s));

    // Copy global bindings from shared interpreter
    // For simplicity, create a fresh interpreter per run but keep state
    if (!interpRef.current) {
      interpRef.current = new Interpreter((s) => outputParts.push(s));
    }

    // Re-create with output callback
    const sharedInterp = interpRef.current;
    // Temporarily override output
    const oldDef = sharedInterp.globalEnv.lookup.bind(sharedInterp.globalEnv);

    let result: string;
    let isError = false;

    try {
      // Run in the shared interpreter with captured output
      const captureInterp = new Interpreter((s) => outputParts.push(s));
      // Copy state from sharedInterp by re-evaluating... too complex, use shared
      // Simple approach: create fresh interpreter for each session (stateless) but
      // for a proper REPL we need state. Let's use a stateful approach.

      // Use fresh interp with output capture for now:
      const val = captureInterp.evalString(code);
      const printed = outputParts.join("");
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

    setHistory((h) => [...h, { input: code, output: result, isError }]);
    setCommandHistory((h) => [code, ...h]);
    setHistoryIndex(-1);
    setInput("");

    setTimeout(() => {
      outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
    }, 0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const examples = [
    "(+ 1 2 3)",
    "(map (lambda (x) (* x x)) '(1 2 3 4 5))",
    "(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))\n(fact 10)",
    "(define (fib n)\n  (let loop ((a 0) (b 1) (i n))\n    (if (= i 0) a (loop b (+ a b) (- i 1)))))\n(fib 30)",
    "(filter odd? '(1 2 3 4 5 6 7 8 9 10))",
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 CPScheme</h1>
        <p>R5RS Scheme Interpreter</p>
      </header>

      <main className="main">
        <div className="output-container" ref={outputRef}>
          {history.map((entry, i) => (
            <div key={i} className="history-entry">
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
            autoFocus
          />
          <button className="run-btn" onClick={() => runCode(input)}>
            Run
          </button>
        </div>

        <div className="examples">
          <span>Examples: </span>
          {examples.map((ex, i) => (
            <button
              key={i}
              className="example-btn"
              onClick={() => {
                setInput(ex);
              }}
            >
              {ex.split("\n")[0].slice(0, 30)}...
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
