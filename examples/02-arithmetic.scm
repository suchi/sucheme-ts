; サンプル 008〜014: 算術演算
; 実行方法: cpscheme examples/02-arithmetic.scm
;
; Scheme の算術演算手続きを紹介します。

(display "=== 四則演算 ===") (newline)
(display (+ 1 2 3 4 5))   (newline)   ; 15
(display (- 10 3))         (newline)   ; 7
(display (* 2 3 4))        (newline)   ; 24
(display (/ 10 2))         (newline)   ; 5

(display "=== 整数演算 ===") (newline)
(display (quotient  10 3))   (newline)   ; 3
(display (remainder 10 3))   (newline)   ; 1
(display (modulo    10 3))   (newline)   ; 1
(display (modulo   -10 3))   (newline)   ; 2  (常に除数と同符号)
(display (remainder -10 3))  (newline)   ; -1 (常に被除数と同符号)

(display "=== 数学関数 ===") (newline)
(display (abs -5))        (newline)   ; 5
(display (sqrt 9))        (newline)   ; 3
(display (expt 2 10))     (newline)   ; 1024
(display (floor   3.7))   (newline)   ; 3
(display (ceiling 3.2))   (newline)   ; 4
(display (round   3.5))   (newline)   ; 4 (偶数丸め)
(display (round   2.5))   (newline)   ; 2 (偶数丸め)
(display (truncate -3.7)) (newline)   ; -3

(display "=== min / max / gcd / lcm ===") (newline)
(display (min 3 1 4 1 5 9))   (newline)   ; 1
(display (max 3 1 4 1 5 9))   (newline)   ; 9
(display (gcd 12 8))          (newline)   ; 4
(display (lcm 4 6))           (newline)   ; 12

(display "=== 三角関数 ===") (newline)
(display (sin 0))    (newline)   ; 0
(display (cos 0))    (newline)   ; 1
(display (atan 1 1)) (newline)   ; 0.785... (π/4)

(display "=== 数値変換 ===") (newline)
(display (number->string 255 16))   (newline)   ; "ff"
(display (number->string 10 2))     (newline)   ; "1010"
(display (string->number "ff" 16))  (newline)   ; 255
(display (string->number "1010" 2)) (newline)   ; 10

(display "=== 数値述語 ===") (newline)
(display (zero? 0))       (newline)   ; #t
(display (positive? 5))   (newline)   ; #t
(display (negative? -3))  (newline)   ; #t
(display (odd? 7))        (newline)   ; #t
(display (even? 4))       (newline)   ; #t
(display (exact? 3))      (newline)   ; #t
(display (inexact? 3.0))  (newline)   ; #t
