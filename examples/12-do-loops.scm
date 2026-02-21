; サンプル 056〜058: do ループ
; 実行方法: cpscheme examples/12-do-loops.scm

(display "=== do による繰り返し ===") (newline)
; (do ((変数 初期値 更新式) ...)
;     (終了条件 結果式)
;   本体...)
(display
  (do ((i 0 (+ i 1))
       (sum 0 (+ sum i)))
      ((> i 10) sum)))   ; 55
(newline)

(display "=== do でベクターを初期化 ===") (newline)
(define v (make-vector 5 0))
(do ((i 0 (+ i 1)))
    ((= i 5) v)
  (vector-set! v i (* i i)))
(display v)   (newline)   ; #(0 1 4 9 16)

(display "=== do でリストを構築 ===") (newline)
(display
  (do ((i 5 (- i 1))
       (result '() (cons i result)))
      ((= i 0) result)))
(newline)   ; (1 2 3 4 5)

(display "=== do で文字列を処理 ===") (newline)
(define str "hello world")
(display
  (do ((i 0 (+ i 1))
       (count 0 (if (char=? (string-ref str i) #\space)
                    (+ count 1)
                    count)))
      ((= i (string-length str)) count)))
(newline)   ; 1 (スペースの数)
