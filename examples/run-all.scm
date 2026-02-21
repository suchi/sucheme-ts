; 全サンプルを一括で実行するスクリプト
; 実行方法: sucheme-ts examples/run-all.scm
;
; このファイルは examples/ ディレクトリのすべての
; サンプルをセパレーターで区切って実行します。

(define (separator title)
  (display "\n")
  (display "========================================\n")
  (display " ")
  (display title)
  (newline)
  (display "========================================\n"))

(separator "01: 基本データ型")
(display "数値: ")       (display 42)      (newline)
(display "真偽値: ")     (display #t)      (newline)
(display "文字列長: ")   (display (string-length "hello")) (newline)
(display "文字: ")       (display (char->integer #\A)) (newline)
(display "シンボル: ")   (display (symbol->string 'foo)) (newline)
(display "リスト長: ")   (display (length '(a b c d))) (newline)
(display "ベクター: ")   (display (vector-ref #(10 20 30) 1)) (newline)

(separator "02: 算術演算")
(display (+ 1 2 3 4 5)) (newline)     ; 15
(display (gcd 12 8))    (newline)     ; 4
(display (expt 2 10))   (newline)     ; 1024
(display (round 3.5))   (newline)     ; 4

(separator "03: 変数定義")
(define x 42)
(define (sq n) (* n n))
(display x)        (newline)
(display (sq 7))   (newline)

(separator "04: 条件分岐")
(define (sign n)
  (cond
    ((> n 0) 'positive)
    ((< n 0) 'negative)
    (else 'zero)))
(display (sign 5))   (newline)   ; positive
(display (sign -3))  (newline)   ; negative
(display (sign 0))   (newline)   ; zero

(separator "05: 手続き定義")
(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))
(display (fact 10))  (newline)   ; 3628800

(separator "06: 再帰")
(display (map sq '(1 2 3 4 5)))  (newline)   ; (1 4 9 16 25)

(separator "07: リスト操作")
(display (filter even? '(1 2 3 4 5 6 7 8)))  (newline)   ; (2 4 6 8)
(display (apply + '(1 2 3 4 5)))              (newline)   ; 15

(separator "08: 高階手続き・クロージャ")
(define (make-adder n) (lambda (x) (+ x n)))
(define add7 (make-adder 7))
(display (add7 10))  (newline)   ; 17

(separator "09: let フォーム")
(display
  (let* ((a 1) (b (+ a 1)) (c (+ b 1)))
    (list a b c)))
(newline)   ; (1 2 3)

(separator "10: 末尾再帰 TCO")
(define (sum-to n)
  (let loop ((i 0) (acc 0))
    (if (> i n) acc (loop (+ i 1) (+ acc i)))))
(display (sum-to 1000000))  (newline)   ; 500000500000

(separator "11: マクロ")
(define-syntax swap!
  (syntax-rules ()
    ((swap! a b)
     (let ((t a)) (set! a b) (set! b t)))))
(define p 1) (define q 2)
(swap! p q)
(display (list p q))  (newline)   ; (2 1)

(separator "12: 継続 call/cc")
(define result
  (+ 1 (call/cc (lambda (k) (k 10) 999))))
(display result)  (newline)   ; 11

(separator "13: 多値")
(display
  (call-with-values
    (lambda () (values 'a 'b 'c))
    list))
(newline)   ; (a b c)

(separator "14: 例外処理")
(display
  (guard (e (#t (error-message e)))
    (error "something went wrong")))
(newline)   ; something went wrong

(separator "15: レコード型")
(define-record-type <vec2>
  (vec2 x y)
  vec2?
  (x vec2-x)
  (y vec2-y))
(define v (vec2 3 4))
(display (sqrt (+ (expt (vec2-x v) 2) (expt (vec2-y v) 2))))
(newline)   ; 5

(separator "完了")
(display "全サンプル実行完了")
(newline)
