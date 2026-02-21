; サンプル 032〜036: ペアとリスト
; 実行方法: sucheme-ts examples/07-lists.scm

(display "=== cons / car / cdr ===") (newline)
(display (cons 1 2))           (newline)   ; (1 . 2)  ドットペア
(display (cons 1 '(2 3)))      (newline)   ; (1 2 3)
(display (car '(1 2 3)))       (newline)   ; 1
(display (cdr '(1 2 3)))       (newline)   ; (2 3)

(display "=== c[ad]+r の略記 ===") (newline)
(display (cadr   '(1 2 3)))    (newline)   ; 2
(display (caddr  '(1 2 3)))    (newline)   ; 3
(display (cadddr '(1 2 3 4)))  (newline)   ; 4

(display "=== リストの基本操作 ===") (newline)
(define lst '(1 2 3 4 5))
(display (length   lst))                  (newline)   ; 5
(display (list-ref lst 2))                (newline)   ; 3
(display (list-tail lst 2))               (newline)   ; (3 4 5)
(display (reverse  lst))                  (newline)   ; (5 4 3 2 1)
(display (append '(1 2) '(3 4) '(5)))     (newline)   ; (1 2 3 4 5)

(display "=== 検索手続き ===") (newline)
(display (member 3 '(1 2 3 4 5)))          (newline)   ; (3 4 5)
(display (member 9 '(1 2 3)))              (newline)   ; #f
(display (memq 'b '(a b c)))               (newline)   ; (b c)
(display (assoc 'b '((a 1) (b 2) (c 3)))) (newline)   ; (b 2)

(display "=== set-car! / set-cdr!（破壊的変更）===") (newline)
(define p (list 1 2 3))
(set-car! p 99)
(display p)   (newline)   ; (99 2 3)
(set-cdr! p '(20 30))
(display p)   (newline)   ; (99 20 30)
