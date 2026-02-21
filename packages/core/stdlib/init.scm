; R5RS Standard library - loaded automatically by the interpreter
; Note: Most of this is now embedded in interpreter.ts for browser compatibility

(define (list . args) args)

(define (not x) (if x #f #t))

; These are extra procedures not in the primitives
(define (square x) (* x x))

(define (string->list str)
  (let loop ((i (- (string-length str) 1)) (result '()))
    (if (< i 0)
      result
      (loop (- i 1) (cons (string-ref str i) result)))))
