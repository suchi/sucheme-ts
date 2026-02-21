; サンプル 027〜031: 再帰
; 実行方法: sucheme-ts examples/06-recursion.scm

(display "=== 階乗（基本的な再帰）===") (newline)
(define (factorial n)
  (if (= n 0)
      1
      (* n (factorial (- n 1)))))

(display (factorial 5))    (newline)   ; 120
(display (factorial 10))   (newline)   ; 3628800

(display "=== フィボナッチ数列 ===") (newline)
(define (fib n)
  (if (< n 2)
      n
      (+ (fib (- n 1))
         (fib (- n 2)))))

(display (fib 0))    (newline)   ; 0
(display (fib 1))    (newline)   ; 1
(display (fib 10))   (newline)   ; 55

(display "=== リストの長さ（再帰）===") (newline)
(define (my-length lst)
  (if (null? lst)
      0
      (+ 1 (my-length (cdr lst)))))

(display (my-length '(1 2 3 4 5)))   (newline)   ; 5
(display (my-length '()))             (newline)   ; 0

(display "=== リストの反転（再帰）===") (newline)
(define (my-reverse lst)
  (define (helper lst acc)
    (if (null? lst)
        acc
        (helper (cdr lst) (cons (car lst) acc))))
  (helper lst '()))

(display (my-reverse '(1 2 3 4 5)))   (newline)   ; (5 4 3 2 1)

(display "=== 高速べき乗（分割統治）===") (newline)
(define (square x) (* x x))

(define (fast-expt base exp)
  (cond
    ((= exp 0) 1)
    ((even? exp) (square (fast-expt base (/ exp 2))))
    (else (* base (fast-expt base (- exp 1))))))

(display (fast-expt 2 10))   (newline)   ; 1024
(display (fast-expt 3 20))   (newline)   ; 3486784401
