; サンプル 022〜026: 手続きの定義
; 実行方法: sucheme-ts examples/05-procedures.scm

(display "=== define による手続き定義 ===") (newline)
(define (square x)
  (* x x))

(display (square 5))    (newline)   ; 25
(display (square 12))   (newline)   ; 144

(display "=== lambda ===") (newline)
; 即時実行
(display ((lambda (x y) (+ x y)) 3 4))   (newline)   ; 7

; lambda を変数に代入
(define cube (lambda (x) (* x x x)))
(display (cube 3))   (newline)   ; 27

(display "=== 複数の引数 ===") (newline)
(define (add x y) (+ x y))
(define (volume l w h) (* l w h))
(display (add 3 4))        (newline)   ; 7
(display (volume 2 3 4))   (newline)   ; 24

(display "=== 可変長引数 ===") (newline)
(define (sum . numbers)
  (apply + numbers))

(display (sum 1 2 3 4 5))   (newline)   ; 15
(display (sum))              (newline)   ; 0

; 必須引数 + 可変長引数
(define (at-least-two first second . rest)
  (list first second rest))

(display (at-least-two 1 2 3 4 5))   (newline)   ; (1 2 (3 4 5))

(display "=== 複数の式（begin）===") (newline)
(define (print-and-square x)
  (display "Squaring: ")
  (display x)
  (newline)
  (* x x))

(display (print-and-square 5))   (newline)
; 出力:
; Squaring: 5
; 25
