; サンプル 086〜088: 入出力とポート
; 実行方法: cpscheme examples/20-io.scm

(display "=== display と write の違い ===") (newline)
; display: 人間向け表示
(display "hello")    (newline)   ; hello
(display #\a)        (newline)   ; a

; write: 機械向け表示（Scheme 形式）
(write "hello")      (newline)   ; "hello"
(write #\a)          (newline)   ; #\a
(write '(1 "two" #\3))  (newline)   ; (1 "two" #\3)

(display "=== 文字列ポート ===") (newline)
; 文字列を入力として読み込む
(define port (open-input-string "(+ 1 2)"))
(display (read port))   (newline)   ; (+ 1 2)

; 文字列への出力
(define out (open-output-string))
(display "hello" out)
(display " world" out)
(display (get-output-string out))   (newline)   ; hello world

(display "=== with-output-to-string ===") (newline)
(define result
  (with-output-to-string
    (lambda ()
      (display "count: ")
      (display (* 6 7)))))

(display result)   (newline)   ; count: 42

(display "=== read で S 式を読む ===") (newline)
(define p2 (open-input-string "'(1 2 3)"))
(display (read p2))   (newline)   ; (quote (1 2 3))

(display "=== read-line / read-char ===") (newline)
(define line-port (open-input-string "hello\nworld"))
(display (read-line line-port))   (newline)   ; hello
(display (read-line line-port))   (newline)   ; world
