# ADR 0002: Use Vite, Vitest, and Biome

- **Status**: Accepted
- **Date**: 2026-02-21
- **Deciders**: Project team

## Context

We need a build system, test runner, and code quality tool that work well together for a TypeScript monorepo.

## Decision

Use **Vite** for bundling the web UI, **Vitest** for unit testing, and **Biome** for linting and formatting.

## Rationale

### Vite

- Near-instant dev server with HMR (Hot Module Replacement)
- Produces optimized production builds via Rollup
- First-class TypeScript support without additional plugins
- Perfect for the React-based Web UI

### Vitest

- Uses Vite's transform pipeline — zero additional configuration for TypeScript
- Jest-compatible API reduces learning curve
- Supports ESM natively, matching our module strategy
- Fast parallel test execution

### Biome

- Single tool for both linting and formatting (replaces ESLint + Prettier)
- Written in Rust — significantly faster than JavaScript-based alternatives
- Opinionated defaults reduce bikeshedding
- Strong TypeScript support

## Alternatives Considered

| Tool | Reason not chosen |
|---|---|
| Jest | Requires Babel or ts-jest, slower, ESM support is fragile |
| ESLint + Prettier | Two tools, complex configuration, slower |
| Webpack | More complex configuration, slower dev experience |
| esbuild | Less feature-complete for monorepos |

## Consequences

- Vitest is used only in `packages/core` (CLI and web tests are integration-level)
- Biome configuration lives in root `biome.json` and applies to all packages
- `.scm` files excluded from Biome (it only processes JS/TS)
