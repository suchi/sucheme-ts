# サンプルプログラム集

[チュートリアル](../docs/TUTORIAL.md) の各章に対応した実行可能な Scheme プログラムです。

## 実行方法

### ビルド

```bash
npm run build
```

### 個別ファイルを実行

```bash
node packages/cli/dist/index.js examples/01-basic-types.scm
```

または `sucheme-ts` が PATH にインストールされている場合：

```bash
sucheme-ts examples/01-basic-types.scm
```

### 全サンプルを一括実行

```bash
node packages/cli/dist/index.js examples/run-all.scm
```

## ファイル一覧

| ファイル | 内容 | 対応チュートリアル章 |
|---|---|---|
| `01-basic-types.scm` | 基本データ型（数値・真偽値・文字列・文字・シンボル・リスト・ベクター） | 第 2 章 |
| `02-arithmetic.scm` | 算術演算・数学関数・数値変換 | 第 3 章 |
| `03-define.scm` | 変数定義・set! | 第 4 章 |
| `04-conditionals.scm` | if・cond・case・and/or・when/unless | 第 5 章 |
| `05-procedures.scm` | 手続き定義・lambda・可変長引数 | 第 6 章 |
| `06-recursion.scm` | 再帰・階乗・フィボナッチ | 第 7 章 |
| `07-lists.scm` | ペアとリスト・car/cdr・検索手続き | 第 8 章 |
| `08-higher-order.scm` | 高階手続き・map/filter/apply・クロージャ | 第 9 章 |
| `09-let-forms.scm` | let・let*・letrec・内部 define | 第 10 章 |
| `10-tail-recursion.scm` | 末尾再帰・TCO・名前付き let | 第 11 章 |
| `11-quoting.scm` | quote・quasiquote・unquote・unquote-splicing | 第 12 章 |
| `12-do-loops.scm` | do ループ | 第 13 章 |
| `13-strings-chars.scm` | 文字・文字列操作 | 第 14 章 |
| `14-vectors.scm` | ベクター操作・メモ化 fib | 第 15 章 |
| `15-macros.scm` | syntax-rules マクロ・省略記号 `...` | 第 16 章 |
| `16-callcc.scm` | call/cc・早期脱出 | 第 17 章 |
| `17-multiple-values.scm` | values・call-with-values | 第 18 章 |
| `18-exceptions.scm` | error・guard・with-exception-handler | 第 19 章 |
| `19-records.scm` | define-record-type・二分木 | 第 20 章 |
| `20-io.scm` | display・write・文字列ポート・read | 第 21 章 |
| `21-practical.scm` | クイックソート・素数篩・メモ化・状態マシン・ジェネレーター | 第 22 章 |
| `run-all.scm` | 全サンプルを一括実行 | — |

## CLI のオプション

```
使い方:
  sucheme-ts [オプション] [ファイル ...]

オプション:
  -h, --help            ヘルプを表示して終了
  -V, --version         バージョンを表示して終了
  -e, --eval <式>       式を評価して結果を表示（複数回使用可）
  -l, --load <ファイル> ファイルを読み込んでから REPL を起動（複数回使用可）
  -i, --interactive     ファイル/--eval 処理後に対話 REPL を起動
  -q, --quiet           バナーと結果の表示を抑制（スクリプト向け）
  -b, --batch           stdin を一括処理（REPL プロンプトなし）
      --no-write        REPL で式の結果を表示しない

使用例:
  sucheme-ts                          # 対話 REPL を起動
  sucheme-ts script.scm               # スクリプトを実行して終了
  sucheme-ts -e "(+ 1 2)"             # 式を評価して終了
  sucheme-ts -l lib.scm -i            # ライブラリを読み込んで REPL を起動
  sucheme-ts -q script.scm            # バナーなしでスクリプトを実行
  sucheme-ts -e "(display 42)" -i     # 評価後に REPL を起動
  echo "(+ 1 2)" | sucheme-ts -b      # stdin から一括処理
```
