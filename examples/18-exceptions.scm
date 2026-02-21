; サンプル 080〜082: 例外処理
; 実行方法: cpscheme examples/18-exceptions.scm

(display "=== error で例外を投げる ===") (newline)
(define (safe-divide a b)
  (if (= b 0)
      (error "Division by zero" a b)
      (/ a b)))

(display (safe-divide 10 2))   (newline)   ; 5

(display "=== guard で例外を捕捉 ===") (newline)
(define (try-divide a b)
  (guard (exn
          ; error-message は引数も含めたメッセージを返す
          ((string-contains (error-message exn) "Division by zero")
           "Cannot divide by zero!")
          (else
           (string-append "Other error: " (error-message exn))))
    (safe-divide a b)))

(display (try-divide 10 2))   (newline)   ; 5
(display (try-divide 10 0))   (newline)   ; Cannot divide by zero!

(display "=== with-exception-handler ===") (newline)
(define result
  (call/cc
    (lambda (k)
      (with-exception-handler
        (lambda (e)
          (k (string-append "Caught: " (error-message e))))
        (lambda ()
          (error "test error"))))))
(display result)   (newline)   ; Caught: test error

(display "=== 例外と guard のネスト ===") (newline)
(define (safe-car lst)
  (guard (e (#t 'error))
    (car lst)))

(display (safe-car '(1 2 3)))   (newline)   ; 1
(display (safe-car '()))        (newline)   ; error
