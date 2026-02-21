; サンプル 059〜063: 文字・文字列
; 実行方法: sucheme-ts examples/13-strings-chars.scm

(display "=== 文字の操作 ===") (newline)
(display (char-alphabetic? #\a))    (newline)   ; #t
(display (char-numeric? #\5))       (newline)   ; #t
(display (char-whitespace? #\space))(newline)   ; #t
(display (char-upcase #\a))         (newline)   ; A
(display (char-downcase #\A))       (newline)   ; a
(display (char<? #\a #\b))          (newline)   ; #t
(display (char->integer #\A))       (newline)   ; 65

(display "=== 文字列の操作 ===") (newline)
(define s "Hello, World!")
(display (string-length s))                (newline)   ; 13
(display (string-ref s 0))                 (newline)   ; H
(display (substring s 7 12))               (newline)   ; World
(display (string-upcase s))                (newline)   ; HELLO, WORLD!
(display (string-downcase s))              (newline)   ; hello, world!
(display (string-append "foo" "bar" "baz"))(newline)   ; foobarbaz

(display "=== 文字列とリストの変換 ===") (newline)
(display (string->list "hello"))
(newline)   ; (#\h #\e #\l #\l #\o)

(display (list->string '(#\h #\e #\l #\l #\o)))
(newline)   ; hello

; 文字を使った文字列処理
(display
  (list->string
    (map char-upcase (string->list "hello"))))
(newline)   ; HELLO

(display "=== 文字列の検索と分割 ===") (newline)
(display (string-contains "hello world" "world"))   (newline)   ; 6
(display (string-contains "hello" "xyz"))           (newline)   ; #f
(display (string-split "a,b,c" ","))                (newline)   ; (a b c)
(display (string-join '("a" "b" "c") ","))          (newline)   ; a,b,c

(display "=== 文字列比較 ===") (newline)
(display (string=?    "hello" "hello"))   (newline)   ; #t
(display (string<?    "abc"   "abd"))     (newline)   ; #t
(display (string-ci=? "Hello" "HELLO"))  (newline)   ; #t

(display "=== make-string ===") (newline)
(display (make-string 5 #\*))    (newline)   ; *****
(display (make-string 3 #\0))    (newline)   ; 000
