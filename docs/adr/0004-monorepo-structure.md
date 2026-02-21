# ADR 0004: npm Workspaces によるモノレポ構成

- **状態**: 採用
- **日付**: 2026-02-21
- **決定者**: プロジェクトチーム

## 背景

プロジェクトには、コアインタプリタライブラリ・CLI ツール・Web アプリケーションという3つの独立したコンポーネントがあります。これらをどのように整理するかを決定する必要があります。

## 決定

**npm workspaces** モノレポで3つのパッケージを管理する:

```
packages/
  core/   — @cpscheme/core（ライブラリ）
  cli/    — @cpscheme/cli （Node.js CLI）
  web/    — @cpscheme/web （Vite + React Web アプリ）
```

## パッケージ構成図

```mermaid
graph TB
    subgraph リポジトリルート
        root_pkg["package.json\n（workspaces: packages/*）"]
        biome["biome.json"]
        tsbase["tsconfig.base.json"]
    end

    subgraph "packages/core（@cpscheme/core）"
        core_src["src/\n• types.ts\n• lexer.ts\n• parser.ts\n• evaluator.ts\n• macros.ts\n• primitives.ts\n• interpreter.ts"]
        core_test["tests/\n• lexer.test.ts\n• parser.test.ts\n• evaluator.test.ts\n• r5rs.test.ts"]
        core_stdlib["stdlib/init.scm"]
    end

    subgraph "packages/cli（@cpscheme/cli）"
        cli_src["src/index.ts\n（Node.js readline REPL）"]
    end

    subgraph "packages/web（@cpscheme/web）"
        web_src["src/App.tsx\n（React REPL UI）"]
        vite_cfg["vite.config.ts"]
    end

    root_pkg --> core_src
    root_pkg --> cli_src
    root_pkg --> web_src
    cli_src -- "import" --> core_src
    web_src -- "import" --> core_src
    biome -.->|"lint 設定共有"| core_src
    biome -.->|"lint 設定共有"| cli_src
    biome -.->|"lint 設定共有"| web_src
    tsbase -.->|"tsconfig 継承"| core_src
    tsbase -.->|"tsconfig 継承"| cli_src
    tsbase -.->|"tsconfig 継承"| web_src
```

## CI/CD パイプライン

```mermaid
flowchart LR
    subgraph "CI（push/PR 毎）"
        lint["Biome lint"] --> test["Vitest テスト"]
        test --> build_core["core ビルド\n（tsc）"]
        build_core --> build_cli["cli ビルド\n（tsc）"]
        build_cli --> build_web["web ビルド\n（vite build）"]
    end

    subgraph "Release（v*.*.* タグ）"
        rtag["git push tag"] --> rci["CI 実行"]
        rci --> rpack["npm pack\n（core + cli）"]
        rpack --> rzip["vite build + zip\n（web）"]
        rzip --> release["GitHub Release\n成果物アップロード"]
    end
```

## 根拠

- **コード共有**: `@cpscheme/core` は CLI と Web 両方の単一依存として機能し、コード重複を避けられる
- **独立バージョニング**: 各パッケージは独自のバージョンとリリースサイクルを持てる
- **統合ツール**: ルートの `npm install` 一回で全依存関係をインストール
- **シンプル**: npm workspaces は npm 7+ に標準搭載されており、Lerna・Nx・Turborepo などの追加ツールが不要

## 検討した代替案

| アプローチ | 不採用理由 |
|---|---|
| 単一パッケージ | CLI と Web でインタプリタをクリーンに共有できない |
| Lerna | 3パッケージに対して不要な複雑さ |
| Nx / Turborepo | プロジェクト規模に対してオーバーエンジニアリング |
| 分離リポジトリ | 依存関係管理のオーバーヘッドが発生 |

## 影響

- ルート `package.json` で `"workspaces": ["packages/*"]` を使用
- クロスパッケージのインポートはワークスペースエイリアス（`@cpscheme/core: "*"`）を使用
- Biome 設定と TypeScript 基本設定はルートに置く
- `vitest` は現在 `packages/core` のみ（ユニットテストを持つ唯一のパッケージ）
