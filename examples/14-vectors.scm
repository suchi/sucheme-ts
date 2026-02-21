; サンプル 064〜067: ベクター
; 実行方法: sucheme-ts examples/14-vectors.scm

(display "=== ベクターの基本操作 ===") (newline)
(define v (vector 1 2 3 4 5))
(display (vector-length v))      (newline)   ; 5
(display (vector-ref v 2))       (newline)   ; 3
(vector-set! v 2 99)             ; 破壊的変更
(display v)                      (newline)   ; #(1 2 99 4 5)

(display "=== make-vector ===") (newline)
(display (make-vector 5 0))      (newline)   ; #(0 0 0 0 0)
(display (make-vector 3 "x"))    (newline)   ; #(x x x)

(display "=== ベクターとリストの変換 ===") (newline)
(display (vector->list #(1 2 3)))    (newline)   ; (1 2 3)
(display (list->vector '(4 5 6)))    (newline)   ; #(4 5 6)

(display "=== vector-map / vector-for-each ===") (newline)
(define (square x) (* x x))
(display (vector-map square #(1 2 3 4 5)))
(newline)   ; #(1 4 9 16 25)

(display "=== ベクターを使った効率的な処理（メモ化 fib）===") (newline)
(define memo (make-vector 40 #f))

(define (fib-memo n)
  (or (vector-ref memo n)
      (let ((result
             (if (< n 2)
                 n
                 (+ (fib-memo (- n 1))
                    (fib-memo (- n 2))))))
        (vector-set! memo n result)
        result)))

(display (fib-memo 10))   (newline)   ; 55
(display (fib-memo 30))   (newline)   ; 832040
(display (fib-memo 39))   (newline)   ; 63245986

(display "=== vector-copy / vector-append ===") (newline)
(display (vector-copy #(1 2 3 4 5) 1 4))   (newline)   ; #(2 3 4)
(display (vector-append #(1 2) #(3 4)))    (newline)   ; #(1 2 3 4)
