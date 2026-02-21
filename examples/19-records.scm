; サンプル 083〜085: レコード型
; 実行方法: sucheme-ts examples/19-records.scm

(display "=== define-record-type の基本 ===") (newline)
(define-record-type point
  (make-point x y)
  point?
  (x point-x)
  (y point-y))

(define p (make-point 3 4))
(display (point? p))       (newline)   ; #t
(display (point-x p))      (newline)   ; 3
(display (point-y p))      (newline)   ; 4

; 距離を計算
(define (distance p1 p2)
  (sqrt (+ (expt (- (point-x p2) (point-x p1)) 2)
           (expt (- (point-y p2) (point-y p1)) 2))))

(display (distance (make-point 0 0) (make-point 3 4)))   (newline)   ; 5

(display "=== ミュータブルなレコード型 ===") (newline)
(define-record-type person
  (make-person name age)
  person?
  (name person-name)
  (age  person-age set-person-age!))   ; セッター付き

(define alice (make-person "Alice" 30))
(display (person-name alice))    (newline)   ; Alice
(set-person-age! alice 31)
(display (person-age alice))     (newline)   ; 31

(display "=== レコード型を使った二分木 ===") (newline)
(define-record-type tree-node
  (make-node value left right)
  tree-node?
  (value node-value)
  (left  node-left)
  (right node-right))

(define (tree-insert tree val)
  (if (not tree)
      (make-node val #f #f)
      (if (< val (node-value tree))
          (make-node (node-value tree)
                     (tree-insert (node-left tree) val)
                     (node-right tree))
          (make-node (node-value tree)
                     (node-left tree)
                     (tree-insert (node-right tree) val)))))

(define (tree-inorder tree)
  (if (not tree)
      '()
      (append
        (tree-inorder (node-left tree))
        (list (node-value tree))
        (tree-inorder (node-right tree)))))

(define t #f)
(for-each (lambda (v) (set! t (tree-insert t v)))
          '(5 3 7 1 4 6 8))

(display (tree-inorder t))   (newline)   ; (1 3 4 5 6 7 8)
