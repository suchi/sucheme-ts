# cpscheme

[![CI](https://github.com/suchi/cpschueme/actions/workflows/ci.yml/badge.svg)](https://github.com/suchi/cpschueme/actions/workflows/ci.yml)

An R5RS-compliant Scheme interpreter built in TypeScript by GitHub Copilot.

## Features

- Full R5RS compliance: `lambda`, `define`, `let`/`let*`/`letrec`, `cond`, `case`, `do`, `quasiquote`, and more
- `syntax-rules` macro system with ellipsis (`...`) support
- Tail call optimization (TCO) via trampoline — supports deep recursion
- Escape continuations (`call/cc`)
- Multiple return values (`values`, `call-with-values`)
- String ports (`open-input-string`, `open-output-string`)
- CLI REPL (Node.js)
- Web UI (Vite + React)
- 147+ unit tests

## Quick Start

```bash
npm install
npm test --workspace packages/core  # Run tests
npm run dev:web                      # Start web UI at http://localhost:5173
npm run build && node packages/cli/dist/index.js  # CLI REPL
```

## Documentation

- [Statement of Work](docs/SOW.md)
- [Developer Onboarding](docs/ONBOARDING.md)
- [Architecture Decision Records](docs/adr/)

## Technology Stack

- **TypeScript** (strict mode)
- **Vite** — web bundler
- **Vitest** — unit tests
- **Biome** — linter and formatter
- **React** — web UI
