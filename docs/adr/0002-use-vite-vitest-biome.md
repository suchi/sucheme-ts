# ADR 0002: Vite・Vitest・Biome を採用

- **状態**: 採用
- **日付**: 2026-02-21
- **決定者**: プロジェクトチーム

## 背景

TypeScript モノレポに対して、ビルドシステム・テストランナー・コード品質ツールが互いにうまく連携できる構成を選択する必要があります。

## 決定

Web UI のバンドルに **Vite**、ユニットテストに **Vitest**、リント・フォーマットに **Biome** を使用する。

## ツールの役割

```mermaid
graph LR
    subgraph 開発時
        VSCode["VS Code\n（エディター）"] -- "保存" --> Biome["Biome\nリント・フォーマット"]
        Biome -- "自動修正" --> VSCode
    end
    subgraph テスト
        Vitest["Vitest\nユニットテスト"] -- "Vite トランスフォーム利用" --> ViteCore["Vite コア"]
    end
    subgraph ビルド・実行
        ViteCore -- "web バンドル" --> WebDist["packages/web/dist/"]
        TSC["tsc\n（TypeScript コンパイラ）"] -- "CLI・コアビルド" --> NodeDist["packages/*/dist/"]
    end
```

## 根拠

### Vite

- HMR（ホットモジュールリプレースメント）による瞬時の開発サーバー
- Rollup 経由で最適化されたプロダクションビルドを生成
- 追加プラグイン不要の TypeScript ファーストサポート
- React ベースの Web UI に最適

### Vitest

- Vite のトランスフォームパイプラインを利用 — TypeScript のための追加設定不要
- Jest 互換 API で学習コストが低い
- ESM をネイティブサポート（当プロジェクトのモジュール戦略と一致）
- 並列テスト実行による高速化

### Biome

- リントとフォーマットを1ツールで実現（ESLint + Prettier を置き換え）
- Rust 製 — JavaScript ベースの代替ツールより大幅に高速
- 意見のある（opinionated）デフォルト設定で不毛な議論を削減
- 強力な TypeScript サポート

## 検討した代替案

| ツール | 不採用理由 |
|---|---|
| Jest | Babel または ts-jest が必要、低速、ESM サポートが不安定 |
| ESLint + Prettier | 2ツール必要、設定が複雑、低速 |
| Webpack | 設定が複雑、開発体験が劣る |
| esbuild | モノレポへの機能が不十分 |

## 影響

- Vitest は `packages/core` のみで使用（CLI と Web のテストは現在統合レベル）
- Biome 設定はルートの `biome.json` に置き、全パッケージに適用
- `.scm` ファイルは Biome から除外（JS/TS のみ処理するため）
