; サンプル 089〜104: 実用プログラム例
; 実行方法: sucheme-ts examples/21-practical.scm

;;; ===== クイックソート =====
(display "=== クイックソート ===") (newline)
(define (quicksort lst)
  (if (or (null? lst) (null? (cdr lst)))
      lst
      (let ((pivot (car lst))
            (rest  (cdr lst)))
        (let ((smaller (filter (lambda (x) (< x pivot)) rest))
              (greater (filter (lambda (x) (>= x pivot)) rest)))
          (append (quicksort smaller)
                  (list pivot)
                  (quicksort greater))))))

(display (quicksort '(3 1 4 1 5 9 2 6 5 3 5)))
(newline)   ; (1 1 2 3 3 4 5 5 5 6 9)

;;; ===== エラトステネスの篩 =====
(display "=== 素数生成（エラトステネスの篩）===") (newline)
(define (sieve limit)
  (let ((composites (make-vector (+ limit 1) #f)))
    (let loop ((i 2) (primes '()))
      (cond
        ((> i limit) (reverse primes))
        ((vector-ref composites i)
         (loop (+ i 1) primes))
        (else
         (let mark ((j (* i i)))
           (when (<= j limit)
             (vector-set! composites j #t)
             (mark (+ j i))))
         (loop (+ i 1) (cons i primes)))))))

(display (sieve 50))
(newline)   ; (2 3 5 7 11 13 17 19 23 29 31 37 41 43 47)

;;; ===== メモ化 =====
(display "=== メモ化（memoize）===") (newline)
(define (memoize f)
  (let ((cache '()))
    (lambda args
      (let ((cached (assoc args cache)))
        (if cached
            (cdr cached)
            (let ((result (apply f args)))
              (set! cache (cons (cons args result) cache))
              result))))))

(define fib
  (memoize
    (lambda (n)
      (if (< n 2)
          n
          (+ (fib (- n 1)) (fib (- n 2)))))))

(display (fib 35))   (newline)   ; 9227465

;;; ===== 状態マシン =====
(display "=== 状態マシン（トラフィックライト）===") (newline)
(define (make-traffic-light)
  (let ((state 'red))
    (lambda (msg)
      (cond
        ((eq? msg 'next)
         (set! state
               (case state
                 ((red)    'green)
                 ((green)  'yellow)
                 ((yellow) 'red)))
         state)
        ((eq? msg 'state) state)
        (else (error "Unknown message" msg))))))

(define light (make-traffic-light))
(display (light 'state))   (newline)   ; red
(display (light 'next))    (newline)   ; green
(display (light 'next))    (newline)   ; yellow
(display (light 'next))    (newline)   ; red

;;; ===== 連想リスト辞書 =====
(display "=== 連想リスト辞書 ===") (newline)
(define empty-dict '())

(define (dict-set d key value)
  (cons (list key value)
        (filter (lambda (pair) (not (equal? (car pair) key))) d)))

(define (dict-get d key . default)
  (let ((entry (assoc key d)))
    (if entry
        (cadr entry)
        (if (null? default) #f (car default)))))

(define d empty-dict)
(set! d (dict-set d 'name "Alice"))
(set! d (dict-set d 'age 30))
(set! d (dict-set d 'city "Tokyo"))

(display (dict-get d 'name))           (newline)   ; Alice
(display (dict-get d 'age))            (newline)   ; 30
(display (dict-get d 'missing "n/a"))  (newline)   ; n/a

;;; ===== ジェネレーターパターン =====
(display "=== ジェネレーター ===") (newline)
(define (range-generator start end step)
  (let ((current start))
    (lambda ()
      (if (>= current end)
          'done
          (let ((val current))
            (set! current (+ current step))
            val)))))

(define (generator->list gen)
  (let loop ((result '()))
    (let ((val (gen)))
      (if (eq? val 'done)
          (reverse result)
          (loop (cons val result))))))

(display (generator->list (range-generator 0 10 2)))
(newline)   ; (0 2 4 6 8)

;;; ===== 動的パラメーター =====
(display "=== 動的パラメーター（インデント）===") (newline)
(define current-indent (make-parameter 0))

(define (with-indent thunk)
  (parameterize ((current-indent (+ (current-indent) 2)))
    (thunk)))

(define (print-indented str)
  (display (make-string (current-indent) #\space))
  (display str)
  (newline))

(print-indented "level 0")
(with-indent
  (lambda ()
    (print-indented "level 1")
    (with-indent
      (lambda ()
        (print-indented "level 2")))
    (print-indented "level 1 again")))
(print-indented "level 0 again")

;;; ===== 遅延評価（ストリーム）=====
(display "=== 遅延評価（ストリーム）===") (newline)
(define (stream-cons x thunk)
  (cons x thunk))

(define stream-car car)

(define (stream-cdr s)
  (force (cdr s)))

(define (stream-take n s)
  (if (or (= n 0) (null? s))
      '()
      (cons (stream-car s)
            (stream-take (- n 1) (stream-cdr s)))))

(define (integers-from n)
  (stream-cons n (delay (integers-from (+ n 1)))))

(define nats (integers-from 0))
(display (stream-take 10 nats))
(newline)   ; (0 1 2 3 4 5 6 7 8 9)

;;; ===== 数値フォーマット =====
(display "=== n^2 の表 ===") (newline)
(define (pad-left s width)
  (let* ((len (string-length s))
         (padding (- width len)))
    (if (<= padding 0) s
        (string-append (make-string padding #\space) s))))

(for-each
  (lambda (n)
    (display (pad-left (number->string n) 3))
    (display " | ")
    (display (pad-left (number->string (* n n)) 6))
    (newline))
  '(1 2 3 4 5 6 7 8 9 10))
