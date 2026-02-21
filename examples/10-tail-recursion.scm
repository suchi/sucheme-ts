; サンプル 049〜052: 末尾再帰・名前付き let
; 実行方法: cpscheme examples/10-tail-recursion.scm
;
; R5RS は末尾呼び出し最適化（TCO）を必須とします。
; cpscheme はトランポリンパターンで TCO を実装しており、
; 深い末尾再帰でもスタックオーバーフローが起きません。

(display "=== 末尾再帰による階乗 ===") (newline)
(define (factorial n)
  (define (iter acc n)
    (if (= n 0)
        acc
        (iter (* acc n) (- n 1))))
  (iter 1 n))

(display (factorial 10))    (newline)   ; 3628800
(display (factorial 20))    (newline)   ; 2432902008176640000

(display "=== 名前付き let によるループ ===") (newline)
; 1 から 100 の和
(display
  (let loop ((i 1) (sum 0))
    (if (> i 100)
        sum
        (loop (+ i 1) (+ sum i)))))
(newline)   ; 5050

(display "=== 名前付き let でリスト処理 ===") (newline)
(define (product lst)
  (let loop ((lst lst) (acc 1))
    (if (null? lst)
        acc
        (loop (cdr lst) (* acc (car lst))))))

(display (product '(1 2 3 4 5)))   (newline)   ; 120

(display "=== 深い末尾再帰（TCO の確認）===") (newline)
; 100,000 回の再帰でもスタックオーバーフローしない
(define (count-down n)
  (if (= n 0)
      "done"
      (count-down (- n 1))))

(display (count-down 100000))   (newline)   ; done

(display "=== 末尾再帰フィボナッチ（高速）===") (newline)
(define (fib n)
  (let loop ((a 0) (b 1) (i n))
    (if (= i 0) a (loop b (+ a b) (- i 1)))))

(display (fib 0))    (newline)   ; 0
(display (fib 10))   (newline)   ; 55
(display (fib 50))   (newline)   ; 12586269025
