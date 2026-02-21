# ADR 0004: Monorepo Structure with npm Workspaces

- **Status**: Accepted
- **Date**: 2026-02-21
- **Deciders**: Project team

## Context

The project has three distinct components: a core interpreter library, a CLI tool, and a web application. We need to decide how to organize them.

## Decision

Use an **npm workspaces** monorepo with three packages:

```
packages/
  core/   — @cpscheme/core (library)
  cli/    — @cpscheme/cli  (Node.js CLI)
  web/    — @cpscheme/web  (Vite + React web app)
```

## Rationale

- **Shared code**: `@cpscheme/core` is a single dependency for both CLI and web, avoiding duplication
- **Independent versioning**: each package can have its own version and release cycle
- **Unified tooling**: single `npm install` at the root installs all dependencies
- **Simple**: npm workspaces are built into npm 7+, no additional tool (Lerna, Nx, Turborepo) needed

## Alternatives Considered

| Approach | Reason not chosen |
|---|---|
| Single package | Cannot share the interpreter between CLI and web cleanly |
| Lerna | Unnecessary complexity for 3 packages |
| Nx / Turborepo | Overkill for project size |
| Separate repos | Creates dependency management overhead |

## Consequences

- Root `package.json` uses `"workspaces": ["packages/*"]`
- Cross-package imports use workspace aliases (`@cpscheme/core: "*"`)
- Biome config and TypeScript base config live at the root
- `vitest` is only in `packages/core` (it's the only package with unit tests currently)
