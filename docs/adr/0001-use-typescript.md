# ADR 0001: Use TypeScript as the Implementation Language

- **Status**: Accepted
- **Date**: 2026-02-21
- **Deciders**: Project team

## Context

We need to choose a language for implementing the Scheme interpreter. The interpreter will be used in both a Node.js CLI environment and a browser-based Web UI.

## Decision

Use **TypeScript** (strict mode) as the sole implementation language.

## Rationale

- **Type safety**: A Scheme interpreter manipulates a wide variety of tagged-union value types (`SchemeVal`). TypeScript's discriminated union types (`type: "pair" | "null" | ...`) provide compile-time exhaustiveness checking.
- **Browser + Node.js portability**: TypeScript compiles to standard JavaScript that runs in both environments without modification.
- **Ecosystem**: Rich tooling (Vite, Vitest, Biome) is TypeScript-native.
- **Maintainability**: Strict types prevent entire classes of runtime errors.

## Consequences

- Build step required (TypeScript → JavaScript)
- Cannot use TypeScript-specific runtime features in the interpreter core (portability requirement)
- ESM modules used throughout (`.js` extension in import paths per TypeScript ESM conventions)
