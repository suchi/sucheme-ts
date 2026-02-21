; サンプル 037〜044: 高階手続き
; 実行方法: cpscheme examples/08-higher-order.scm

(display "=== map ===") (newline)
(define (square x) (* x x))
(display (map square '(1 2 3 4 5)))           (newline)   ; (1 4 9 16 25)
(display (map (lambda (x) (* x 2)) '(1 2 3))) (newline)   ; (2 4 6)

; 複数リスト
(display (map + '(1 2 3) '(10 20 30)))        (newline)   ; (11 22 33)

(display "=== for-each ===") (newline)
(for-each
  (lambda (x)
    (display x)
    (display " "))
  '(1 2 3 4 5))
(newline)   ; 1 2 3 4 5

(display "=== filter ===") (newline)
(display (filter odd? '(1 2 3 4 5 6 7 8 9 10)))     (newline)   ; (1 3 5 7 9)
(display (filter (lambda (x) (> x 3)) '(1 2 3 4 5))) (newline)   ; (4 5)

(display "=== apply ===") (newline)
(display (apply + '(1 2 3 4 5)))          (newline)   ; 15
(display (apply max '(3 1 4 1 5 9 2 6)))  (newline)   ; 9
(display (apply string '(#\h #\e #\l #\l #\o)))  (newline)   ; hello

(display "=== クロージャ ===") (newline)
(define (make-adder n)
  (lambda (x) (+ x n)))

(define add5  (make-adder 5))
(define add10 (make-adder 10))
(display (add5 3))    (newline)   ; 8
(display (add10 3))   (newline)   ; 13

(display "=== カウンター（クロージャによる状態管理）===") (newline)
(define (make-counter)
  (let ((count 0))
    (lambda ()
      (set! count (+ count 1))
      count)))

(define c1 (make-counter))
(define c2 (make-counter))
(display (c1))   (newline)   ; 1
(display (c1))   (newline)   ; 2
(display (c1))   (newline)   ; 3
(display (c2))   (newline)   ; 1 (別の状態)

(display "=== 関数合成（compose）===") (newline)
(define (compose f g)
  (lambda (x) (f (g x))))

(define add1-then-square
  (compose square (lambda (x) (+ x 1))))

(display (add1-then-square 4))   (newline)   ; 25  ((4+1)^2)
