import { describe, expect, it } from "vitest";
import { Interpreter } from "../src/interpreter.js";
import { display } from "../src/types.js";

function makeInterp() {
  const interp = new Interpreter();
  return interp;
}

function evalScheme(code: string): string {
  const interp = makeInterp();
  return display(interp.evalString(code));
}

describe("R5RS Compliance Tests", () => {
  describe("Section 6.1 - Equivalence predicates", () => {
    it("eq? works for symbols", () => {
      expect(evalScheme("(eq? 'a 'a)")).toBe("#t");
      expect(evalScheme("(eq? 'a 'b)")).toBe("#f");
    });

    it("eqv? works for numbers", () => {
      expect(evalScheme("(eqv? 42 42)")).toBe("#t");
      expect(evalScheme("(eqv? 42 43)")).toBe("#f");
    });

    it("equal? works for lists", () => {
      expect(evalScheme("(equal? '(a b c) '(a b c))")).toBe("#t");
      expect(evalScheme("(equal? '(a b c) '(a b))")).toBe("#f");
    });
  });

  describe("Section 6.2 - Numbers", () => {
    it("exact arithmetic", () => {
      expect(evalScheme("(+ 1 2 3 4 5)")).toBe("15");
      expect(evalScheme("(* 2 3 4)")).toBe("24");
      expect(evalScheme("(- 100 50 25)")).toBe("25");
      expect(evalScheme("(/ 100 4 5)")).toBe("5");
    });

    it("exact? and inexact?", () => {
      expect(evalScheme("(exact? 1)")).toBe("#t");
      expect(evalScheme("(inexact? 1.0)")).toBe("#t");
      expect(evalScheme("(exact? 1.0)")).toBe("#f");
    });

    it("exact->inexact and inexact->exact", () => {
      expect(evalScheme("(exact->inexact 1)")).toBe("1");
      expect(evalScheme("(inexact->exact 1.5)")).toBe("2");
    });

    it("number predicates", () => {
      expect(evalScheme("(integer? 3)")).toBe("#t");
      expect(evalScheme("(integer? 3.0)")).toBe("#t");
      expect(evalScheme("(integer? 3.1)")).toBe("#f");
      expect(evalScheme("(zero? 0)")).toBe("#t");
      expect(evalScheme("(positive? 1)")).toBe("#t");
      expect(evalScheme("(negative? -1)")).toBe("#t");
      expect(evalScheme("(odd? 3)")).toBe("#t");
      expect(evalScheme("(even? 4)")).toBe("#t");
    });

    it("number->string", () => {
      expect(evalScheme("(number->string 42)")).toBe("42");
      expect(evalScheme("(number->string 255 16)")).toBe("ff");
      expect(evalScheme("(number->string 8 2)")).toBe("1000");
    });

    it("string->number", () => {
      expect(evalScheme('(string->number "42")')).toBe("42");
      expect(evalScheme('(string->number "ff" 16)')).toBe("255");
      expect(evalScheme('(string->number "abc")')).toBe("#f");
    });
  });

  describe("Section 6.3 - Booleans", () => {
    it("boolean?", () => {
      expect(evalScheme("(boolean? #t)")).toBe("#t");
      expect(evalScheme("(boolean? #f)")).toBe("#t");
      expect(evalScheme("(boolean? 0)")).toBe("#f");
    });

    it("only #f is false", () => {
      expect(evalScheme("(if 0 'yes 'no)")).toBe("yes");
      expect(evalScheme("(if \"\" 'yes 'no)")).toBe("yes");
      expect(evalScheme("(if '() 'yes 'no)")).toBe("yes");
      expect(evalScheme("(if #f 'yes 'no)")).toBe("no");
    });
  });

  describe("Section 6.4 - Pairs and lists", () => {
    it("cons, car, cdr", () => {
      expect(evalScheme("(car (cons 1 2))")).toBe("1");
      expect(evalScheme("(cdr (cons 1 2))")).toBe("2");
    });

    it("list operations", () => {
      expect(evalScheme("(length '(1 2 3))")).toBe("3");
      expect(evalScheme("(list-ref '(a b c d) 2)")).toBe("c");
      expect(evalScheme("(list-tail '(a b c d) 2)")).toBe("(c d)");
    });

    it("append", () => {
      expect(evalScheme("(append '(x) '(y))")).toBe("(x y)");
      expect(evalScheme("(append '(a) '(b c d))")).toBe("(a b c d)");
      expect(evalScheme("(append '(a) '())")).toBe("(a)");
      expect(evalScheme("(append '() 'a)")).toBe("a");
    });

    it("association lists", () => {
      expect(evalScheme("(assq 'b '((a 1) (b 2) (c 3)))")).toBe("(b 2)");
      expect(evalScheme("(assv 2 '((1 a) (2 b) (3 c)))")).toBe("(2 b)");
      expect(evalScheme('(assoc "b" \'(("a" 1) ("b" 2)))')).toBe("(b 2)");
    });
  });

  describe("Section 6.5 - Symbols", () => {
    it("symbol operations", () => {
      expect(evalScheme("(symbol? 'foo)")).toBe("#t");
      expect(evalScheme("(symbol->string 'foo)")).toBe("foo");
      expect(evalScheme('(string->symbol "foo")')).toBe("foo");
    });
  });

  describe("Section 6.6 - Characters", () => {
    it("character operations", () => {
      expect(evalScheme("(char=? #\\A #\\A)")).toBe("#t");
      expect(evalScheme("(char<? #\\a #\\b)")).toBe("#t");
      expect(evalScheme("(char-upcase #\\a)")).toBe("A");
      expect(evalScheme("(char-downcase #\\A)")).toBe("a");
    });
  });

  describe("Section 6.7 - Strings", () => {
    it("string operations", () => {
      expect(evalScheme('(string-length "hello")')).toBe("5");
      expect(evalScheme('(string-ref "hello" 1)')).toBe("e");
      expect(evalScheme('(string-append "foo" "bar")')).toBe("foobar");
      expect(evalScheme('(string->list "abc")')).toBe("(a b c)");
      expect(evalScheme("(list->string '(#\\a #\\b #\\c))")).toBe("abc");
    });
  });

  describe("Section 6.8 - Vectors", () => {
    it("vector operations", () => {
      expect(evalScheme("(vector? #(1 2 3))")).toBe("#t");
      expect(evalScheme("(vector-length #(1 2 3))")).toBe("3");
      expect(evalScheme("(vector-ref #(a b c) 1)")).toBe("b");
    });
  });

  describe("Section 6.9 - Control features", () => {
    it("procedure?", () => {
      expect(evalScheme("(procedure? car)")).toBe("#t");
      expect(evalScheme("(procedure? 42)")).toBe("#f");
    });

    it("apply", () => {
      expect(evalScheme("(apply + '(1 2 3 4))")).toBe("10");
      expect(evalScheme("(apply list 1 2 '(3 4))")).toBe("(1 2 3 4)");
    });

    it("map", () => {
      expect(evalScheme("(map car '((a b) (d e) (g h)))")).toBe("(a d g)");
      expect(evalScheme("(map + '(1 2 3) '(4 5 6))")).toBe("(5 7 9)");
    });

    it("call/cc", () => {
      expect(
        evalScheme("(call-with-current-continuation (lambda (k) (k 42) 99))"),
      ).toBe("42");
      expect(evalScheme("(call/cc (lambda (k) 99))")).toBe("99");
    });

    it("values and call-with-values", () => {
      expect(evalScheme("(call-with-values (lambda () (values 1 2)) +)")).toBe(
        "3",
      );
      expect(
        evalScheme("(call-with-values (lambda () 5) (lambda (x) (* x x)))"),
      ).toBe("25");
    });
  });

  describe("Tail call optimization", () => {
    it("mutual recursion with TCO", () => {
      expect(
        evalScheme(`
        (define (even? n)
          (if (= n 0) #t (odd? (- n 1))))
        (define (odd? n)
          (if (= n 0) #f (even? (- n 1))))
        (even? 10000)
      `),
      ).toBe("#t");
    });

    it("fibonacci with accumulator", () => {
      expect(
        evalScheme(`
        (define (fib n acc1 acc2)
          (if (= n 0) acc1
            (fib (- n 1) acc2 (+ acc1 acc2))))
        (fib 20 0 1)
      `),
      ).toBe("6765");
    });
  });

  describe("Macros - syntax-rules", () => {
    it("basic pattern matching", () => {
      expect(
        evalScheme(`
        (define-syntax inc
          (syntax-rules ()
            ((_ x) (+ x 1))))
        (inc 5)
      `),
      ).toBe("6");
    });

    it("ellipsis in patterns", () => {
      expect(
        evalScheme(`
        (define-syntax my-begin
          (syntax-rules ()
            ((_ e) e)
            ((_ e1 e2 ...)
             (let ((t e1)) (my-begin e2 ...)))))
        (my-begin 1 2 3)
      `),
      ).toBe("3");
    });

    it("nested macros", () => {
      expect(
        evalScheme(`
        (define-syntax my-and
          (syntax-rules ()
            ((_) #t)
            ((_ e) e)
            ((_ e1 e2 ...)
             (if e1 (my-and e2 ...) #f))))
        (my-and 1 2 3)
      `),
      ).toBe("3");
    });
  });

  describe("Standard library functions", () => {
    it("filter", () => {
      expect(evalScheme("(filter odd? '(1 2 3 4 5))")).toBe("(1 3 5)");
    });

    it("fold-left", () => {
      expect(evalScheme("(fold-left + 0 '(1 2 3 4 5))")).toBe("15");
    });

    it("fold-right", () => {
      expect(evalScheme("(fold-right cons '() '(1 2 3))")).toBe("(1 2 3)");
    });

    it("iota", () => {
      expect(evalScheme("(iota 5)")).toBe("(0 1 2 3 4)");
      expect(evalScheme("(iota 5 1)")).toBe("(1 2 3 4 5)");
      expect(evalScheme("(iota 5 0 2)")).toBe("(0 2 4 6 8)");
    });

    it("sort", () => {
      expect(evalScheme("(sort '(3 1 4 1 5 9 2 6) <)")).toBe(
        "(1 1 2 3 4 5 6 9)",
      );
    });
  });
});
