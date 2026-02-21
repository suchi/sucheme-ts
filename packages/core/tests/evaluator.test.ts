import { describe, it, expect } from "vitest";
import { Interpreter } from "../src/interpreter.js";
import { display } from "../src/types.js";

function makeInterpreter() {
  const output: string[] = [];
  const interp = new Interpreter((s) => output.push(s));
  return { interp, output };
}

function evalExpr(code: string): string {
  const { interp } = makeInterpreter();
  return display(interp.evalString(code));
}

describe("Evaluator - Basic expressions", () => {
  it("evaluates numbers", () => {
    expect(evalExpr("42")).toBe("42");
    expect(evalExpr("3.14")).toBe("3.14");
    expect(evalExpr("-5")).toBe("-5");
  });

  it("evaluates booleans", () => {
    expect(evalExpr("#t")).toBe("#t");
    expect(evalExpr("#f")).toBe("#f");
  });

  it("evaluates strings", () => {
    const { interp } = makeInterpreter();
    const result = interp.evalString('"hello"');
    expect(result.type).toBe("string");
    if (result.type === "string") expect(result.value).toBe("hello");
  });

  it("evaluates quoted expressions", () => {
    expect(evalExpr("'hello")).toBe("hello");
    expect(evalExpr("'(1 2 3)")).toBe("(1 2 3)");
    expect(evalExpr("'()")).toBe("()");
  });
});

describe("Evaluator - Arithmetic", () => {
  it("adds numbers", () => {
    expect(evalExpr("(+ 1 2)")).toBe("3");
    expect(evalExpr("(+ 1 2 3 4)")).toBe("10");
    expect(evalExpr("(+)")).toBe("0");
  });

  it("subtracts numbers", () => {
    expect(evalExpr("(- 10 3)")).toBe("7");
    expect(evalExpr("(- 5)")).toBe("-5");
  });

  it("multiplies numbers", () => {
    expect(evalExpr("(* 3 4)")).toBe("12");
    expect(evalExpr("(*)")).toBe("1");
  });

  it("divides numbers", () => {
    expect(evalExpr("(/ 10 2)")).toBe("5");
    expect(evalExpr("(/ 1 4)")).toBe("0.25");
  });

  it("computes quotient", () => {
    expect(evalExpr("(quotient 13 4)")).toBe("3");
    expect(evalExpr("(quotient -13 4)")).toBe("-3");
  });

  it("computes remainder", () => {
    expect(evalExpr("(remainder 13 4)")).toBe("1");
    expect(evalExpr("(remainder -13 4)")).toBe("-1");
  });

  it("computes modulo", () => {
    expect(evalExpr("(modulo 13 4)")).toBe("1");
    expect(evalExpr("(modulo -13 4)")).toBe("3");
  });

  it("computes abs", () => {
    expect(evalExpr("(abs -5)")).toBe("5");
    expect(evalExpr("(abs 5)")).toBe("5");
  });

  it("computes gcd", () => {
    expect(evalExpr("(gcd 12 8)")).toBe("4");
    expect(evalExpr("(gcd)")).toBe("0");
  });

  it("computes lcm", () => {
    expect(evalExpr("(lcm 4 6)")).toBe("12");
  });

  it("computes floor/ceiling/truncate/round", () => {
    expect(evalExpr("(floor 3.7)")).toBe("3");
    expect(evalExpr("(ceiling 3.2)")).toBe("4");
    expect(evalExpr("(truncate 3.7)")).toBe("3");
    expect(evalExpr("(round 3.5)")).toBe("4");
    expect(evalExpr("(round 2.5)")).toBe("2"); // round to even
  });

  it("computes sqrt", () => {
    expect(evalExpr("(sqrt 4)")).toBe("2");
    expect(evalExpr("(sqrt 2)")).toMatch(/1\.4142/);
  });

  it("computes expt", () => {
    expect(evalExpr("(expt 2 10)")).toBe("1024");
  });

  it("computes min/max", () => {
    expect(evalExpr("(min 3 1 4 1 5)")).toBe("1");
    expect(evalExpr("(max 3 1 4 1 5)")).toBe("5");
  });
});

describe("Evaluator - Comparison", () => {
  it("compares numbers", () => {
    expect(evalExpr("(= 1 1)")).toBe("#t");
    expect(evalExpr("(= 1 2)")).toBe("#f");
    expect(evalExpr("(< 1 2)")).toBe("#t");
    expect(evalExpr("(> 2 1)")).toBe("#t");
    expect(evalExpr("(<= 1 1)")).toBe("#t");
    expect(evalExpr("(>= 2 1)")).toBe("#t");
  });

  it("tests eq?", () => {
    expect(evalExpr("(eq? 'a 'a)")).toBe("#t");
    expect(evalExpr("(eq? '() '())")).toBe("#t");
    expect(evalExpr("(eq? #t #t)")).toBe("#t");
  });

  it("tests eqv?", () => {
    expect(evalExpr("(eqv? 1 1)")).toBe("#t");
    expect(evalExpr("(eqv? #\\a #\\a)")).toBe("#t");
  });

  it("tests equal?", () => {
    expect(evalExpr("(equal? '(1 2 3) '(1 2 3))")).toBe("#t");
    expect(evalExpr("(equal? \"hello\" \"hello\")")).toBe("#t");
    expect(evalExpr("(equal? #(1 2) #(1 2))")).toBe("#t");
  });
});

describe("Evaluator - Booleans", () => {
  it("evaluates not", () => {
    expect(evalExpr("(not #t)")).toBe("#f");
    expect(evalExpr("(not #f)")).toBe("#t");
    expect(evalExpr("(not 0)")).toBe("#f"); // only #f is false
  });

  it("evaluates and", () => {
    expect(evalExpr("(and)")).toBe("#t");
    expect(evalExpr("(and 1 2 3)")).toBe("3");
    expect(evalExpr("(and 1 #f 3)")).toBe("#f");
  });

  it("evaluates or", () => {
    expect(evalExpr("(or)")).toBe("#f");
    expect(evalExpr("(or #f #f 3)")).toBe("3");
    expect(evalExpr("(or #f #f #f)")).toBe("#f");
  });
});

describe("Evaluator - Conditionals", () => {
  it("evaluates if", () => {
    expect(evalExpr("(if #t 1 2)")).toBe("1");
    expect(evalExpr("(if #f 1 2)")).toBe("2");
    expect(evalExpr("(if 0 1 2)")).toBe("1"); // 0 is truthy in Scheme
  });

  it("evaluates cond", () => {
    expect(evalExpr("(cond (#f 1) (#t 2))")).toBe("2");
    expect(evalExpr("(cond (#f 1) (else 3))")).toBe("3");
    expect(evalExpr("(cond ((+ 1 2) => (lambda (x) (* x 2))))")).toBe("6");
  });

  it("evaluates case", () => {
    expect(evalExpr("(case 2 ((1) 'one) ((2) 'two) (else 'other))")).toBe("two");
    expect(evalExpr("(case 5 ((1 2 3) 'small) (else 'big))")).toBe("big");
  });

  it("evaluates when", () => {
    expect(evalExpr("(when #t 1 2 3)")).toBe("3");
    expect(evalExpr("(when #f 1 2 3)")).toBe("");
  });

  it("evaluates unless", () => {
    expect(evalExpr("(unless #f 42)")).toBe("42");
    expect(evalExpr("(unless #t 42)")).toBe("");
  });
});

describe("Evaluator - Definitions", () => {
  it("defines variables", () => {
    expect(evalExpr("(define x 42) x")).toBe("42");
  });

  it("defines procedures", () => {
    expect(evalExpr("(define (double x) (* x 2)) (double 5)")).toBe("10");
  });

  it("set! modifies variables", () => {
    expect(evalExpr("(define x 1) (set! x 2) x")).toBe("2");
  });
});

describe("Evaluator - Lambda", () => {
  it("creates and calls lambda", () => {
    expect(evalExpr("((lambda (x) (* x x)) 5)")).toBe("25");
  });

  it("supports rest args", () => {
    expect(evalExpr("((lambda args args) 1 2 3)")).toBe("(1 2 3)");
    expect(evalExpr("((lambda (x . rest) rest) 1 2 3)")).toBe("(2 3)");
  });

  it("creates closures", () => {
    expect(evalExpr("(define (make-adder n) (lambda (x) (+ x n))) ((make-adder 5) 3)")).toBe("8");
  });
});

describe("Evaluator - Let forms", () => {
  it("evaluates let", () => {
    expect(evalExpr("(let ((x 1) (y 2)) (+ x y))")).toBe("3");
  });

  it("evaluates let*", () => {
    expect(evalExpr("(let* ((x 1) (y (+ x 1))) y)")).toBe("2");
  });

  it("evaluates letrec", () => {
    expect(evalExpr("(letrec ((even? (lambda (n) (if (= n 0) #t (odd? (- n 1))))) (odd? (lambda (n) (if (= n 0) #f (even? (- n 1)))))) (even? 10))")).toBe("#t");
  });

  it("evaluates named let", () => {
    expect(evalExpr("(let loop ((n 5) (acc 1)) (if (= n 0) acc (loop (- n 1) (* acc n))))")).toBe("120");
  });
});

describe("Evaluator - Lists", () => {
  it("cons, car, cdr", () => {
    expect(evalExpr("(car '(1 2 3))")).toBe("1");
    expect(evalExpr("(cdr '(1 2 3))")).toBe("(2 3)");
    expect(evalExpr("(cons 1 '(2 3))")).toBe("(1 2 3)");
  });

  it("null?, pair?", () => {
    expect(evalExpr("(null? '())")).toBe("#t");
    expect(evalExpr("(null? '(1))")).toBe("#f");
    expect(evalExpr("(pair? '(1 2))")).toBe("#t");
    expect(evalExpr("(pair? '())")).toBe("#f");
  });

  it("list", () => {
    expect(evalExpr("(list 1 2 3)")).toBe("(1 2 3)");
    expect(evalExpr("(list)")).toBe("()");
  });

  it("length", () => {
    expect(evalExpr("(length '(1 2 3))")).toBe("3");
    expect(evalExpr("(length '())")).toBe("0");
  });

  it("append", () => {
    expect(evalExpr("(append '(1 2) '(3 4))")).toBe("(1 2 3 4)");
    expect(evalExpr("(append '() '(1 2))")).toBe("(1 2)");
  });

  it("reverse", () => {
    expect(evalExpr("(reverse '(1 2 3))")).toBe("(3 2 1)");
  });

  it("list-ref and list-tail", () => {
    expect(evalExpr("(list-ref '(a b c) 1)")).toBe("b");
    expect(evalExpr("(list-tail '(a b c) 1)")).toBe("(b c)");
  });

  it("member, memq, memv", () => {
    expect(evalExpr("(member 2 '(1 2 3))")).toBe("(2 3)");
    expect(evalExpr("(member 5 '(1 2 3))")).toBe("#f");
    expect(evalExpr("(memq 'b '(a b c))")).toBe("(b c)");
  });

  it("assoc, assq, assv", () => {
    expect(evalExpr("(assoc 'b '((a 1) (b 2) (c 3)))")).toBe("(b 2)");
    expect(evalExpr("(assq 'c '((a 1) (b 2) (c 3)))")).toBe("(c 3)");
  });
});

describe("Evaluator - Higher-order functions", () => {
  it("applies apply", () => {
    expect(evalExpr("(apply + '(1 2 3))")).toBe("6");
    expect(evalExpr("(apply + 1 2 '(3 4))")).toBe("10");
  });

  it("maps over list", () => {
    expect(evalExpr("(map (lambda (x) (* x 2)) '(1 2 3))")).toBe("(2 4 6)");
  });

  it("for-each", () => {
    const { interp, output } = makeInterpreter();
    interp.evalString("(for-each display '(1 2 3))");
    expect(output.join("")).toBe("123");
  });
});

describe("Evaluator - Strings", () => {
  it("string operations", () => {
    expect(evalExpr('(string-length "hello")')).toBe("5");
    expect(evalExpr('(string-append "hello" " " "world")')).toBe("hello world");
    expect(evalExpr('(substring "hello" 1 3)')).toBe("el");
  });

  it("string predicates", () => {
    expect(evalExpr('(string? "hello")')).toBe("#t");
    expect(evalExpr("(string? 42)")).toBe("#f");
    expect(evalExpr('(string=? "hello" "hello")')).toBe("#t");
    expect(evalExpr('(string<? "abc" "abd")')).toBe("#t");
  });

  it("string conversion", () => {
    expect(evalExpr("(string->symbol \"hello\")")).toBe("hello");
    expect(evalExpr("(symbol->string 'world)")).toBe("world");
    expect(evalExpr("(string->list \"abc\")")).toBe("(a b c)");
    expect(evalExpr("(list->string '(#\\a #\\b #\\c))")).toBe("abc");
  });
});

describe("Evaluator - Characters", () => {
  it("char operations", () => {
    expect(evalExpr("(char->integer #\\a)")).toBe("97");
    expect(evalExpr("(integer->char 65)")).toBe("A");
    expect(evalExpr("(char-alphabetic? #\\a)")).toBe("#t");
    expect(evalExpr("(char-numeric? #\\5)")).toBe("#t");
    expect(evalExpr("(char-whitespace? #\\space)")).toBe("#t");
  });
});

describe("Evaluator - Vectors", () => {
  it("vector operations", () => {
    expect(evalExpr("(vector 1 2 3)")).toBe("#(1 2 3)");
    expect(evalExpr("(vector-length (vector 1 2 3))")).toBe("3");
    expect(evalExpr("(vector-ref (vector 'a 'b 'c) 1)")).toBe("b");
    expect(evalExpr("(let ((v (vector 1 2 3))) (vector-set! v 1 99) v)")).toBe("#(1 99 3)");
    expect(evalExpr("(vector->list #(1 2 3))")).toBe("(1 2 3)");
    expect(evalExpr("(list->vector '(1 2 3))")).toBe("#(1 2 3)");
  });

  it("make-vector", () => {
    expect(evalExpr("(make-vector 3 0)")).toBe("#(0 0 0)");
  });
});

describe("Evaluator - Do loop", () => {
  it("evaluates do loop", () => {
    expect(evalExpr("(do ((i 0 (+ i 1)) (sum 0 (+ sum i))) ((= i 5) sum))")).toBe("10");
  });

  it("do loop with body", () => {
    const { interp, output } = makeInterpreter();
    interp.evalString("(do ((i 0 (+ i 1))) ((= i 3)) (display i))");
    expect(output.join("")).toBe("012");
  });
});

describe("Evaluator - Quasiquote", () => {
  it("basic quasiquote", () => {
    expect(evalExpr("`(1 2 3)")).toBe("(1 2 3)");
  });

  it("unquote", () => {
    expect(evalExpr("(let ((x 42)) `(a ,x c))")).toBe("(a 42 c)");
  });

  it("unquote-splicing", () => {
    expect(evalExpr("(let ((xs '(2 3))) `(1 ,@xs 4))")).toBe("(1 2 3 4)");
  });
});

describe("Evaluator - Tail calls", () => {
  it("handles deep recursion without stack overflow", () => {
    const { interp } = makeInterpreter();
    const result = interp.evalString(`
      (define (count-down n)
        (if (= n 0) 'done (count-down (- n 1))))
      (count-down 100000)
    `);
    expect(display(result)).toBe("done");
  });

  it("handles named let tail calls", () => {
    const result = evalExpr("(let loop ((n 100000) (acc 0)) (if (= n 0) acc (loop (- n 1) (+ acc 1))))");
    expect(result).toBe("100000");
  });
});

describe("Evaluator - Begin", () => {
  it("evaluates begin", () => {
    expect(evalExpr("(begin 1 2 3)")).toBe("3");
  });
});

describe("Evaluator - Values", () => {
  it("handles multiple values", () => {
    expect(evalExpr("(call-with-values (lambda () (values 1 2)) +)")).toBe("3");
  });
});

describe("Evaluator - Type predicates", () => {
  it("tests various type predicates", () => {
    expect(evalExpr("(number? 42)")).toBe("#t");
    expect(evalExpr("(string? \"hi\")")).toBe("#t");
    expect(evalExpr("(symbol? 'foo)")).toBe("#t");
    expect(evalExpr("(char? #\\a)")).toBe("#t");
    expect(evalExpr("(vector? #(1 2))")).toBe("#t");
    expect(evalExpr("(boolean? #t)")).toBe("#t");
    expect(evalExpr("(procedure? car)")).toBe("#t");
    expect(evalExpr("(procedure? (lambda (x) x))")).toBe("#t");
  });
});

describe("Evaluator - define-syntax", () => {
  it("defines and uses macros", () => {
    expect(evalExpr(`
      (define-syntax my-if
        (syntax-rules ()
          ((_ test then else)
           (cond (test then) (else else)))))
      (my-if #t 1 2)
    `)).toBe("1");
  });

  it("supports ellipsis patterns", () => {
    expect(evalExpr(`
      (define-syntax my-list
        (syntax-rules ()
          ((_ e ...)
           (list e ...))))
      (my-list 1 2 3)
    `)).toBe("(1 2 3)");
  });

  it("defines swap!", () => {
    expect(evalExpr(`
      (define-syntax swap!
        (syntax-rules ()
          ((_ a b)
           (let ((tmp a))
             (set! a b)
             (set! b tmp)))))
      (define x 1)
      (define y 2)
      (swap! x y)
      (list x y)
    `)).toBe("(2 1)");
  });
});

describe("Evaluator - display output", () => {
  it("display outputs correctly", () => {
    const { interp, output } = makeInterpreter();
    interp.evalString('(display "hello") (newline) (display 42)');
    expect(output.join("")).toBe("hello\n42");
  });
});
