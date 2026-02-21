; サンプル 075〜077: 継続（call/cc）
; 実行方法: sucheme-ts examples/16-callcc.scm
;
; call/cc（call-with-current-continuation）は
; 現在の「続きの計算」を捕捉します。
; sucheme-ts はエスケープ継続をサポートします。

(display "=== call/cc の基本 ===") (newline)
; 継続を呼ぶと残りの計算を中断して値を返す
(display
  (+ 1 (call/cc (lambda (k)
                  (k 10)     ; ここで抜ける
                  999))))    ; この999は評価されない
(newline)   ; 11

(display "=== 早期脱出 ===") (newline)
(define (find-even lst)
  (call/cc
    (lambda (return)
      (for-each (lambda (x)
                  (when (even? x)
                    (return x)))
                lst)
      #f)))

(display (find-even '(1 3 5 6 7 9)))   (newline)   ; 6
(display (find-even '(1 3 5 7 9)))     (newline)   ; #f

(display "=== 深いネストの脱出 ===") (newline)
(define (search matrix target)
  (call/cc
    (lambda (found)
      (for-each
        (lambda (row)
          (for-each
            (lambda (item)
              (when (equal? item target)
                (found item)))
            row))
        matrix)
      #f)))

(display (search '((1 2) (3 4) (5 6)) 4))   (newline)   ; 4
(display (search '((1 2) (3 4)) 9))          (newline)   ; #f

(display "=== call/cc で break ===") (newline)
; 積を計算するが 0 があれば即座に 0 を返す
(define (product-with-break lst)
  (call/cc
    (lambda (break)
      (let loop ((lst lst) (acc 1))
        (cond
          ((null? lst) acc)
          ((zero? (car lst)) (break 0))
          (else (loop (cdr lst) (* acc (car lst)))))))))

(display (product-with-break '(1 2 3 4 5)))   (newline)   ; 120
(display (product-with-break '(1 2 0 4 5)))   (newline)   ; 0
