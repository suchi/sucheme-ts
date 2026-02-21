import { Environment } from "./environment.js";
import { evaluate } from "./evaluator.js";
import { parse } from "./parser.js";
import { makePrimitives } from "./primitives.js";
import {
  SchemeError,
  type SchemeVal,
  UNDEFINED,
  display,
  write,
} from "./types.js";

export class Interpreter {
  public globalEnv: Environment;
  private outputCallback: (s: string) => void;

  constructor(outputCallback?: (s: string) => void) {
    this.outputCallback = outputCallback ?? ((s) => process.stdout?.write(s));
    this.globalEnv = new Environment();
    this.loadPrimitives();
    this.loadStdlib();
  }

  private loadPrimitives(): void {
    const prims = makePrimitives();
    for (const [name, val] of prims) {
      this.globalEnv.define(name, val);
    }

    // Override output primitives to use our callback
    const cb = this.outputCallback;
    this.globalEnv.define("display", {
      type: "primitive",
      name: "display",
      fn: (args) => {
        if (args.length < 1)
          throw new SchemeError("display: expected at least 1 argument");
        cb(display(args[0]));
        return UNDEFINED;
      },
    });
    this.globalEnv.define("write", {
      type: "primitive",
      name: "write",
      fn: (args) => {
        if (args.length < 1)
          throw new SchemeError("write: expected at least 1 argument");
        cb(write(args[0]));
        return UNDEFINED;
      },
    });
    this.globalEnv.define("newline", {
      type: "primitive",
      name: "newline",
      fn: () => {
        cb("\n");
        return UNDEFINED;
      },
    });
    this.globalEnv.define("write-char", {
      type: "primitive",
      name: "write-char",
      fn: (args) => {
        if (args.length < 1)
          throw new SchemeError("write-char: expected at least 1 argument");
        if (args[0].type !== "char")
          throw new SchemeError("write-char: not a char");
        cb(args[0].value);
        return UNDEFINED;
      },
    });
  }

  private loadStdlib(): void {
    // Load stdlib from embedded string to avoid file system issues in browser
    const stdlib = getStdlibSource();
    try {
      this.evalString(stdlib);
    } catch (e) {
      // Stdlib errors should not crash the interpreter
      console.error("Warning: stdlib load error:", e);
    }
  }

  evalString(source: string): SchemeVal {
    const exprs = parse(source);
    let result: SchemeVal = UNDEFINED;
    for (const expr of exprs) {
      result = evaluate(expr, this.globalEnv);
    }
    return result;
  }

  evalOne(source: string): SchemeVal {
    const exprs = parse(source);
    if (exprs.length === 0) return UNDEFINED;
    return evaluate(exprs[0], this.globalEnv);
  }
}

// Embed the stdlib as a string to avoid file system issues
function getStdlibSource(): string {
  return `
; Standard library
(define (list . args) args)

(define (not x) (if x #f #t))

(define (boolean=? . args)
  (if (null? args) #t
    (let loop ((first (car args)) (rest (cdr args)))
      (if (null? rest) #t
        (if (eq? first (car rest))
          (loop first (cdr rest))
          #f)))))

; List operations
(define (caar x) (car (car x)))
(define (cadr x) (car (cdr x)))
(define (cdar x) (cdr (car x)))
(define (cddr x) (cdr (cdr x)))
(define (caaar x) (car (car (car x))))
(define (caadr x) (car (car (cdr x))))
(define (cadar x) (car (cdr (car x))))
(define (caddr x) (car (cdr (cdr x))))
(define (cdaar x) (cdr (car (car x))))
(define (cdadr x) (cdr (car (cdr x))))
(define (cddar x) (cdr (cdr (car x))))
(define (cdddr x) (cdr (cdr (cdr x))))
(define (caaaar x) (car (car (car (car x)))))
(define (caaadr x) (car (car (car (cdr x)))))
(define (caadar x) (car (car (cdr (car x)))))
(define (caaddr x) (car (car (cdr (cdr x)))))
(define (cadaar x) (car (cdr (car (car x)))))
(define (cadadr x) (car (cdr (car (cdr x)))))
(define (caddar x) (car (cdr (cdr (car x)))))
(define (cadddr x) (car (cdr (cdr (cdr x)))))
(define (cdaaar x) (cdr (car (car (car x)))))
(define (cdaadr x) (cdr (car (car (cdr x)))))
(define (cdadar x) (cdr (car (cdr (car x)))))
(define (cdaddr x) (cdr (car (cdr (cdr x)))))
(define (cddaar x) (cdr (cdr (car (car x)))))
(define (cddadr x) (cdr (cdr (car (cdr x)))))
(define (cdddar x) (cdr (cdr (cdr (car x)))))
(define (cddddr x) (cdr (cdr (cdr (cdr x)))))

; These are also in primitives but define in scheme for completeness
(define (zero? n) (= n 0))
(define (positive? n) (> n 0))
(define (negative? n) (< n 0))

(define (abs n)
  (if (< n 0) (- n) n))

(define (max first . rest)
  (let loop ((m first) (lst rest))
    (if (null? lst) m
      (loop (if (> (car lst) m) (car lst) m) (cdr lst)))))

(define (min first . rest)
  (let loop ((m first) (lst rest))
    (if (null? lst) m
      (loop (if (< (car lst) m) (car lst) m) (cdr lst)))))

(define (gcd . args)
  (define (gcd2 a b)
    (if (= b 0) a (gcd2 b (remainder a b))))
  (if (null? args) 0
    (let loop ((result (abs (car args))) (rest (cdr args)))
      (if (null? rest) result
        (loop (gcd2 result (abs (car rest))) (cdr rest))))))

(define (lcm . args)
  (define (lcm2 a b)
    (if (= a 0) 0 (/ (abs (* a b)) (gcd a b))))
  (if (null? args) 1
    (let loop ((result (abs (car args))) (rest (cdr args)))
      (if (null? rest) result
        (loop (lcm2 result (abs (car rest))) (cdr rest))))))

(define (odd? n) (not (= (remainder n 2) 0)))
(define (even? n) (= (remainder n 2) 0))

; String
(define (string-contains? s sub)
  (not (eq? #f (string-contains s sub))))

; Higher order
(define (fold-left f init lst)
  (if (null? lst) init
    (fold-left f (f init (car lst)) (cdr lst))))

(define (fold-right f init lst)
  (if (null? lst) init
    (f (car lst) (fold-right f init (cdr lst)))))

(define (reduce f init lst)
  (fold-left f init lst))

(define (filter pred lst)
  (cond
    ((null? lst) '())
    ((pred (car lst)) (cons (car lst) (filter pred (cdr lst))))
    (else (filter pred (cdr lst)))))

(define (find pred lst)
  (cond
    ((null? lst) #f)
    ((pred (car lst)) (car lst))
    (else (find pred (cdr lst)))))

(define (any pred lst)
  (cond
    ((null? lst) #f)
    ((pred (car lst)) #t)
    (else (any pred (cdr lst)))))

(define (every pred lst)
  (cond
    ((null? lst) #t)
    ((not (pred (car lst))) #f)
    (else (every pred (cdr lst)))))

(define (flatten lst)
  (cond
    ((null? lst) '())
    ((pair? (car lst)) (append (flatten (car lst)) (flatten (cdr lst))))
    (else (cons (car lst) (flatten (cdr lst))))))

(define (iota count . args)
  (let ((start (if (null? args) 0 (car args)))
        (step (if (or (null? args) (null? (cdr args))) 1 (cadr args))))
    (let loop ((i 0) (result '()))
      (if (= i count)
        (reverse result)
        (loop (+ i 1) (cons (+ start (* i step)) result))))))

(define (make-list n . args)
  (let ((fill (if (null? args) #f (car args))))
    (let loop ((i n) (result '()))
      (if (= i 0) result
        (loop (- i 1) (cons fill result))))))

(define (last-pair lst)
  (if (null? (cdr lst)) lst
    (last-pair (cdr lst))))

(define (list-index pred lst)
  (let loop ((lst lst) (i 0))
    (cond
      ((null? lst) #f)
      ((pred (car lst)) i)
      (else (loop (cdr lst) (+ i 1))))))

(define (take lst k)
  (if (or (= k 0) (null? lst))
    '()
    (cons (car lst) (take (cdr lst) (- k 1)))))

(define (drop lst k)
  (if (or (= k 0) (null? lst))
    lst
    (drop (cdr lst) (- k 1))))

(define (delete x lst)
  (filter (lambda (y) (not (equal? x y))) lst))

(define (delete-duplicates lst)
  (let loop ((lst lst) (seen '()))
    (cond
      ((null? lst) '())
      ((member (car lst) seen) (loop (cdr lst) seen))
      (else (cons (car lst) (loop (cdr lst) (cons (car lst) seen)))))))

(define (sort lst less?)
  (define (merge a b)
    (cond
      ((null? a) b)
      ((null? b) a)
      ((less? (car a) (car b))
       (cons (car a) (merge (cdr a) b)))
      (else
       (cons (car b) (merge a (cdr b))))))
  (define (split lst)
    (let loop ((lst lst) (a '()) (b '()))
      (if (null? lst) (cons a b)
        (loop (cdr lst) b (cons (car lst) a)))))
  (if (or (null? lst) (null? (cdr lst)))
    lst
    (let* ((halves (split lst))
           (left (sort (car halves) less?))
           (right (sort (cdr halves) less?)))
      (merge left right))))

; Numeric
(define (square x) (* x x))

(define (exact-integer? n)
  (and (integer? n) (exact? n)))

(define (floor-quotient n d)
  (floor (/ n d)))

(define (floor-remainder n d)
  (- n (* d (floor-quotient n d))))

(define (truncate-quotient n d)
  (truncate (/ n d)))

(define (truncate-remainder n d)
  (- n (* d (truncate-quotient n d))))

(define (floor/ n d)
  (values (floor-quotient n d) (floor-remainder n d)))

(define (truncate/ n d)
  (values (truncate-quotient n d) (truncate-remainder n d)))

; String procedures
(define (number->string* n . args)
  (let ((radix (if (null? args) 10 (car args))))
    (number->string n radix)))

; When/unless
(define-syntax when
  (syntax-rules ()
    ((_ test body ...)
     (if test (begin body ...) (if #f #f)))))

(define-syntax unless
  (syntax-rules ()
    ((_ test body ...)
     (if (not test) (begin body ...) (if #f #f)))))

; Let forms
(define-syntax let
  (syntax-rules ()
    ((_ ((var val) ...) body ...)
     ((lambda (var ...) body ...) val ...))
    ((_ name ((var val) ...) body ...)
     (letrec ((name (lambda (var ...) body ...)))
       (name val ...)))))

(define-syntax let*
  (syntax-rules ()
    ((_ () body ...)
     (begin body ...))
    ((_ ((var val) rest ...) body ...)
     (let ((var val))
       (let* (rest ...) body ...)))))

(define-syntax and
  (syntax-rules ()
    ((_) #t)
    ((_ e) e)
    ((_ e1 e2 ...)
     (if e1 (and e2 ...) #f))))

(define-syntax or
  (syntax-rules ()
    ((_) #f)
    ((_ e) e)
    ((_ e1 e2 ...)
     (let ((t e1))
       (if t t (or e2 ...))))))

(define-syntax cond
  (syntax-rules (else =>)
    ((_ (else e ...)) (begin e ...))
    ((_ (test => proc) rest ...)
     (let ((t test))
       (if t (proc t) (cond rest ...))))
    ((_ (test) rest ...)
     (let ((t test))
       (if t t (cond rest ...))))
    ((_ (test e ...) rest ...)
     (if test (begin e ...) (cond rest ...)))
    ((_) (if #f #f))))

(define-syntax case
  (syntax-rules (else =>)
    ((_ key (else e ...))
     (begin e ...))
    ((_ key ((datum ...) e ...) rest ...)
     (if (memv key '(datum ...))
       (begin e ...)
       (case key rest ...)))
    ((_ key) (if #f #f))))

(define-syntax do
  (syntax-rules ()
    ((_ ((var init step ...) ...)
        (test expr ...)
        body ...)
     (let loop ((var init) ...)
       (if test
         (begin (if #f #f) expr ...)
         (begin body ... (loop (if (null? '(step ...)) var (car '(step ...))) ...)))))))

(define-syntax let-values
  (syntax-rules ()
    ((_ () body ...)
     (begin body ...))
    ((_ (((var ...) producer) rest ...) body ...)
     (call-with-values (lambda () producer)
       (lambda (var ...)
         (let-values (rest ...) body ...))))))

(define-syntax let*-values
  (syntax-rules ()
    ((_ () body ...)
     (begin body ...))
    ((_ (((var ...) producer) rest ...) body ...)
     (call-with-values (lambda () producer)
       (lambda (var ...)
         (let*-values (rest ...) body ...))))))

(define-syntax receive
  (syntax-rules ()
    ((_ formals expression body ...)
     (call-with-values (lambda () expression)
       (lambda formals body ...)))))

(define-syntax fluid-let
  (syntax-rules ()
    ((_ ((var val) ...) body ...)
     (let ((old-vals (list var ...)))
       (set! var val) ...
       (let ((result (begin body ...)))
         (set! var (car old-vals)) ...
         result)))))

(define-syntax while
  (syntax-rules ()
    ((_ test body ...)
     (let loop ()
       (when test
         body ...
         (loop))))))

(define-syntax parameterize
  (syntax-rules ()
    ((_ ((param val) ...) body ...)
     (let ((old (list (param) ...)))
       (param val) ...
       (let ((result (begin body ...)))
         (for-each (lambda (p v) (p v)) (list param ...) old)
         result)))))

; Ports
(define (call-with-port port proc)
  (let ((result (proc port)))
    (close-port port)
    result))

(define (call-with-input-file filename proc)
  (let ((port (open-input-file filename)))
    (let ((result (proc port)))
      (close-input-port port)
      result)))

(define (call-with-output-file filename proc)
  (let ((port (open-output-file filename)))
    (let ((result (proc port)))
      (close-output-port port)
      result)))

(define (with-input-from-file filename thunk)
  (call-with-input-file filename
    (lambda (port)
      (with-input-from-string (get-output-string (open-output-string)) thunk))))

; Promises
(define (make-promise thunk)
  (let ((forced #f)
        (value #f))
    (lambda ()
      (if forced
        value
        (begin
          (set! value (thunk))
          (set! forced #t)
          value)))))

(define (promise? p)
  (procedure? p))

(define (force promise)
  (promise))

; Association lists
(define (alist-copy alist)
  (map (lambda (pair) (cons (car pair) (cdr pair))) alist))

(define (alist-delete key alist)
  (filter (lambda (pair) (not (equal? (car pair) key))) alist))

; String predicates
(define (string-prefix? prefix str)
  (and (<= (string-length prefix) (string-length str))
       (string=? prefix (substring str 0 (string-length prefix)))))

(define (string-suffix? suffix str)
  (let ((sl (string-length str))
        (pl (string-length suffix)))
    (and (<= pl sl)
         (string=? suffix (substring str (- sl pl) sl)))))

; With-exception-handler that passes value
(define (condition-message e) 
  (if (string? e) e (error-message e)))

; Tail recursive map
(define (map* f . lsts)
  (define (map1 f lst)
    (let loop ((lst lst) (acc '()))
      (if (null? lst)
        (reverse acc)
        (loop (cdr lst) (cons (f (car lst)) acc)))))
  (if (null? (cdr lsts))
    (map1 f (car lsts))
    (let loop ((lsts lsts) (acc '()))
      (if (any null? lsts)
        (reverse acc)
        (loop (map cdr lsts) (cons (apply f (map car lsts)) acc))))))
`;
}
