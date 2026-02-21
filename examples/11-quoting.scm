; サンプル 053〜054: クォートと quasiquote
; 実行方法: cpscheme examples/11-quoting.scm

(display "=== quote ===") (newline)
(display '(+ 1 2))     (newline)   ; (+ 1 2) — リスト（評価しない）
(display (+ 1 2))      (newline)   ; 3 — 評価する
(display 'hello)       (newline)   ; hello — シンボル
(display '(a b c))     (newline)   ; (a b c)

(display "=== quasiquote（準クォート）===") (newline)
(define x 5)
(define y 10)

; , で評価、,@ でリストを展開
(display `(sum of ,x and ,y is ,(+ x y)))
(newline)   ; (sum of 5 and 10 is 15)

(define nums '(1 2 3))
(display `(before ,@nums after))
(newline)   ; (before 1 2 3 after)

(display "=== コードをデータとして扱う ===") (newline)
; quasiquote でコードを動的に組み立て
(define (make-adder-code n)
  `(lambda (x) (+ x ,n)))

(display (make-adder-code 5))    (newline)   ; (lambda (x) (+ x 5))
(display (make-adder-code 100))  (newline)   ; (lambda (x) (+ x 100))

; apply を使ってリストをコードとして実行
(display (apply + '(1 2 3 4 5)))   (newline)   ; 15
