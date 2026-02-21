; サンプル 015〜016: 変数の定義
; 実行方法: sucheme-ts examples/03-define.scm

(display "=== define による変数定義 ===") (newline)
(define x 42)
(define pi 3.14159)
(define greeting "Hello, World!")
(display x)         (newline)
(display pi)        (newline)
(display greeting)  (newline)

(display "=== set! による再代入 ===") (newline)
(define counter 0)
(set! counter 1)
(set! counter (+ counter 1))
(display counter)   (newline)   ; 2
