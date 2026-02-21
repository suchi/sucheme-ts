# Statement of Work (SOW)

## Project Name

**cpscheme** — R5RS-Compliant Scheme Interpreter in TypeScript

## Overview

Build a fully R5RS-compliant Scheme interpreter in TypeScript, including a CLI REPL, a web-based UI, and a comprehensive standard library. The project will be developed incrementally in three phases.

## Objectives

1. Deliver a working Scheme interpreter that fully complies with R5RS
2. Provide both CLI (REPL) and Web UI interfaces
3. Ensure correctness via automated tests (Vitest)
4. Maintain code quality with static analysis (Biome, TypeScript strict mode)
5. Automate CI/CD via GitHub Actions and GitHub Releases

## Scope

### In Scope

- **Lexer**: tokenize Scheme source into tokens
- **Parser**: parse tokens into S-expression AST
- **Evaluator**: tree-walking evaluator with tail-call optimization (TCO)
- **Macro system**: `syntax-rules`, `define-syntax`, `let-syntax`, `letrec-syntax`
- **Standard library**: all R5RS procedures, partly in native TypeScript, partly in Scheme
- **call/cc**: escape continuations
- **Multiple values**: `values`, `call-with-values`
- **Ports**: string ports, `open-input-string`, `open-output-string`
- **CLI REPL**: Node.js readline-based REPL
- **Web UI**: Vite + React browser-based REPL
- **Tests**: unit tests for lexer, parser, evaluator, and R5RS compliance
- **CI/CD**: GitHub Actions workflows for lint, test, build, and release
- **Documentation**: SOW, ADR, onboarding guide

### Out of Scope (Initial)

- Full continuations (only escape continuations in Phase 1)
- Multi-line editing in REPL (deferred to later phase)
- Emacs key bindings in REPL (deferred to later phase)
- File I/O (reading/writing files)
- Numerical tower (only IEEE 754 double-precision for now)
- Modules / R7RS libraries

### Future Phases

- **Phase 4**: Full continuations, proper tail recursion in all contexts
- **Phase 5**: Multi-line REPL editing with Emacs key bindings
- **Phase 6**: Numerical tower (exact rationals, bignums)
- **Phase 7**: R7RS compatibility layer

## Deliverables

| Deliverable | Description |
|---|---|
| `packages/core` | TypeScript Scheme interpreter library |
| `packages/cli` | CLI REPL binary |
| `packages/web` | Web UI (Vite + React) |
| `docs/SOW.md` | This document |
| `docs/ONBOARDING.md` | Developer onboarding guide |
| `docs/adr/*.md` | Architecture Decision Records |
| `.github/workflows/ci.yml` | CI workflow (lint, test, build) |
| `.github/workflows/release.yml` | Release workflow (GitHub Releases) |

## Development Phases

### Phase 1: Minimal REPL (v0.1)

**Goal**: A working REPL that can evaluate basic Scheme expressions.

- [x] Project scaffolding (npm workspaces, TypeScript, Biome, Vitest, Vite)
- [x] Lexer (tokenization)
- [x] Parser (S-expression parsing)
- [x] Core evaluator (lambda, define, if, begin, quote)
- [x] Primitive arithmetic and list operations
- [x] CLI REPL
- [x] Basic Web UI
- [x] Unit tests

### Phase 2: Core Scheme Syntax (v0.2)

**Goal**: Complete R5RS special forms and standard procedures.

- [x] `let`, `let*`, `letrec`, named `let`
- [x] `cond`, `case`, `when`, `unless`, `and`, `or`
- [x] `do` loops
- [x] `quasiquote`, `unquote`, `unquote-splicing`
- [x] `define-syntax`, `syntax-rules` with ellipsis (`...`)
- [x] `call-with-current-continuation` (escape continuations)
- [x] `values`, `call-with-values`
- [x] Full string, character, and vector procedures
- [x] String ports

### Phase 3: Scheme Standard Library in Scheme (v0.3)

**Goal**: Implement as much of the standard library as possible in Scheme itself.

- [x] `stdlib/init.scm` — scheme-level standard library
- [x] `map`, `for-each`, `filter`, `reduce` in Scheme
- [x] Numeric predicates (`zero?`, `positive?`, `negative?`, `odd?`, `even?`)
- [x] `c[ad]{2,4}r` helpers

## Technology Stack

| Tool | Version | Purpose |
|---|---|---|
| TypeScript | ^5.7 | Primary language |
| Vite | ^6.1 | Web bundler and dev server |
| Vitest | ^3.0 | Unit test framework |
| Biome | ^1.9 | Linter and formatter |
| React | ^18.3 | Web UI framework |
| Node.js | 20 LTS | Runtime for CLI |

## Timeline

| Milestone | Target | Status |
|---|---|---|
| v0.1 — Minimal REPL | Phase 1 | ✅ Complete |
| v0.2 — Core Scheme | Phase 2 | ✅ Complete |
| v0.3 — Scheme stdlib | Phase 3 | ✅ Complete |
| v0.4 — Full continuations | TBD | ⬜ Planned |
| v0.5 — Enhanced REPL | TBD | ⬜ Planned |

## Acceptance Criteria

- All 147+ Vitest tests pass
- `npm run build` succeeds for all packages
- Web UI loads and executes basic Scheme expressions
- CLI REPL starts and evaluates expressions interactively
- R5RS compliance: tail calls, `let`-forms, macros, `call/cc`
- CI pipeline passes on every PR
