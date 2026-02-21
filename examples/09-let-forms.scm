; サンプル 045〜048: let フォーム
; 実行方法: sucheme-ts examples/09-let-forms.scm

(display "=== let ===") (newline)
(display
  (let ((x 1)
        (y 2)
        (z 3))
    (+ x y z)))   ; 6
(newline)

(display "=== let*（順次バインド）===") (newline)
(display
  (let* ((x 1)
         (y (+ x 1))
         (z (+ y 1)))
    (list x y z)))   ; (1 2 3)
(newline)

(display "=== letrec（相互再帰）===") (newline)
(display
  (letrec ((my-even? (lambda (n)
                       (if (= n 0) #t (my-odd? (- n 1)))))
           (my-odd?  (lambda (n)
                       (if (= n 0) #f (my-even? (- n 1))))))
    (list (my-even? 4) (my-odd? 3))))   ; (#t #t)
(newline)

(display "=== 内部 define ===") (newline)
(define (hypotenuse a b)
  (define (square x) (* x x))   ; 内部定義
  (sqrt (+ (square a) (square b))))

(display (hypotenuse 3 4))   (newline)   ; 5
(display (hypotenuse 5 12))  (newline)   ; 13
