; サンプル 068〜074: マクロ（syntax-rules）
; 実行方法: sucheme-ts examples/15-macros.scm
;
; マクロはコンパイル時に式を変換します。
; syntax-rules でパターンマッチングとテンプレート展開を定義します。

(display "=== 最初のマクロ ===") (newline)
(define-syntax my-if
  (syntax-rules ()
    ((my-if condition then else)
     (if condition then else))))

(display (my-if (> 3 2) "yes" "no"))   (newline)   ; yes

(display "=== 省略記号 ... ===") (newline)
(define-syntax my-begin
  (syntax-rules ()
    ((my-begin) (void))
    ((my-begin e) e)
    ((my-begin e1 e2 ...)
     (let ((ignored e1))
       (my-begin e2 ...)))))

(display
  (my-begin 1 2 3))   (newline)   ; 3（最後の値）

(display "=== swap! マクロ ===") (newline)
(define-syntax swap!
  (syntax-rules ()
    ((swap! a b)
     (let ((tmp a))
       (set! a b)
       (set! b tmp)))))

(define x 1)
(define y 2)
(swap! x y)
(display (list x y))   (newline)   ; (2 1)

(display "=== while ループマクロ ===") (newline)
(define-syntax while
  (syntax-rules ()
    ((while condition body ...)
     (let loop ()
       (when condition
         body ...
         (loop))))))

(define i 0)
(define total 0)
(while (< i 10)
  (set! total (+ total i))
  (set! i (+ i 1)))
(display total)   (newline)   ; 45

(display "=== my-and マクロ（短絡評価）===") (newline)
(define-syntax my-and
  (syntax-rules ()
    ((my-and) #t)
    ((my-and e) e)
    ((my-and e1 e2 ...)
     (if e1 (my-and e2 ...) #f))))

(display (my-and 1 2 3))    (newline)   ; 3
(display (my-and 1 #f 3))   (newline)   ; #f
(display (my-and))          (newline)   ; #t

(display "=== let を lambda マクロとして実装 ===") (newline)
(define-syntax my-let
  (syntax-rules ()
    ((my-let ((var val) ...) body ...)
     ((lambda (var ...) body ...) val ...))))

(display
  (my-let ((x 1) (y 2) (z 3))
    (+ x y z)))   (newline)   ; 6
