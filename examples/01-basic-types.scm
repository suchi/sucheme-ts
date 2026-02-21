; サンプル 001〜007: 基本データ型
; 実行方法: cpscheme examples/01-basic-types.scm
;
; このファイルでは Scheme の基本的なデータ型を学びます。

(display "=== 数値 ===") (newline)
(display 42)       (newline)
(display -7)       (newline)
(display 3.14)     (newline)

(display "=== 真偽値 ===") (newline)
(display #t)  (newline)
(display #f)  (newline)
; #f だけが偽。0 や "" や '() もすべて真
(display (if 0   "0 is true"   "0 is false"))   (newline)
(display (if ""  "\"\" is true" "\"\" is false"))(newline)
(display (if '() "'() is true" "'() is false")) (newline)

(display "=== 文字列 ===") (newline)
(display (string-length "hello"))              (newline)
(display (string-append "hello" " " "world"))  (newline)
(display (substring "hello world" 6 11))       (newline)

(display "=== 文字 ===") (newline)
(display (char->integer #\a))   (newline)
(display (integer->char 65))    (newline)
(display (char-upcase #\z))     (newline)

(display "=== シンボル ===") (newline)
(display (symbol->string 'hello))         (newline)
(display (string->symbol "my-symbol"))    (newline)
(display (symbol? 'foo))                  (newline)

(display "=== リスト ===") (newline)
(display '(1 2 3))            (newline)
(display (pair? '(1 2)))      (newline)
(display (null? '()))         (newline)
(display (length '(a b c d))) (newline)

(display "=== ベクター ===") (newline)
(display #(1 2 3))                     (newline)
(display (vector-ref #(10 20 30) 1))   (newline)
(display (vector-length #(1 2 3)))     (newline)
