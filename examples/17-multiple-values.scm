; サンプル 078〜079: 多値
; 実行方法: sucheme-ts examples/17-multiple-values.scm

(display "=== values で複数の値を返す ===") (newline)
(define (div-and-mod a b)
  (values (quotient a b) (remainder a b)))

(call-with-values
  (lambda () (div-and-mod 17 5))
  (lambda (q r)
    (display (list 'quotient q 'remainder r))
    (newline)))   ; (quotient 3 remainder 2)

(display "=== values を直接受け取る ===") (newline)
(display
  (call-with-values
    (lambda () (values 1 2 3))
    list))
(newline)   ; (1 2 3)

(display "=== 最小・最大の同時取得 ===") (newline)
(define (min-max lst)
  (let loop ((lst (cdr lst))
             (mn (car lst))
             (mx (car lst)))
    (if (null? lst)
        (values mn mx)
        (loop (cdr lst)
              (min mn (car lst))
              (max mx (car lst))))))

(display
  (call-with-values
    (lambda () (min-max '(3 1 4 1 5 9 2 6)))
    list))
(newline)   ; (1 9)

(display "=== values で複数の集計を同時に ===") (newline)
(define (stats lst)
  (let ((n (length lst))
        (total (apply + lst)))
    (values n total (/ total (length lst)))))

(call-with-values
  (lambda () (stats '(1 2 3 4 5)))
  (lambda (n total avg)
    (display (list 'count n 'sum total 'avg avg))
    (newline)))   ; (count 5 sum 15 avg 3)
