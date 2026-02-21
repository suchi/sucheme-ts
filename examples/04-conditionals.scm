; サンプル 017〜021: 条件分岐
; 実行方法: cpscheme examples/04-conditionals.scm

(display "=== if ===") (newline)
(display (if (> 3 2) "yes" "no"))   (newline)   ; yes
(display (if #f "true" "false"))    (newline)   ; false

(display "=== cond ===") (newline)
(define (grade score)
  (cond
    ((>= score 90) "A")
    ((>= score 80) "B")
    ((>= score 70) "C")
    ((>= score 60) "D")
    (else "F")))

(display (grade 95))  (newline)   ; A
(display (grade 83))  (newline)   ; B
(display (grade 72))  (newline)   ; C
(display (grade 55))  (newline)   ; F

(display "=== case ===") (newline)
(define (day-name n)
  (case n
    ((1) "Monday")
    ((2) "Tuesday")
    ((3) "Wednesday")
    ((4) "Thursday")
    ((5) "Friday")
    ((6 7) "Weekend")
    (else "Unknown")))

(display (day-name 3))  (newline)   ; Wednesday
(display (day-name 6))  (newline)   ; Weekend
(display (day-name 9))  (newline)   ; Unknown

(display "=== and / or ===") (newline)
(display (and 1 2 3))      (newline)   ; 3
(display (and 1 #f 3))     (newline)   ; #f
(display (or  #f #f 42))   (newline)   ; 42
(display (or  #f #f #f))   (newline)   ; #f

(display "=== when / unless ===") (newline)
(when (> 5 3)
  (display "5 > 3")
  (newline))

(unless (> 3 5)
  (display "3 is not > 5")
  (newline))
