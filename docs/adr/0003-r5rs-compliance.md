# ADR 0003: R5RS Compliance Strategy

- **Status**: Accepted
- **Date**: 2026-02-21
- **Deciders**: Project team

## Context

The project targets R5RS (Revised⁵ Report on the Algorithmic Language Scheme). We need to decide which features to implement in native TypeScript vs. in Scheme itself.

## Decision

1. **Core special forms** are implemented in TypeScript (in `evaluator.ts`)
2. **Built-in procedures** that require low-level access are in TypeScript (in `primitives.ts`)
3. **Higher-level standard library** procedures are implemented in Scheme (`stdlib/init.scm`)
4. **Tail call optimization** uses a trampoline pattern in TypeScript

## Rationale

### Core in TypeScript

Special forms (`lambda`, `define`, `if`, `begin`, `quote`, `set!`, `let`, `cond`, `do`, `define-syntax`, etc.) must be in TypeScript because they require control over evaluation order, which cannot be expressed as regular procedure calls.

### Standard Library in Scheme

Procedures like `map`, `for-each`, `filter`, `fold`, `caar`, `cadr`, etc. can be expressed in Scheme once the core is available. This:
- Validates the core implementation (if `map` works, the core is correct)
- Keeps `primitives.ts` focused on low-level operations
- Demonstrates the power of the language

### Tail Call Optimization

R5RS requires proper tail calls. We implement TCO using a **trampoline** pattern:
- `evaluate()` returns a `SchemeTailCall` object instead of recursing for tail positions
- The outer trampoline loop in `evalTCO()` keeps iterating until it gets a non-tail result
- This allows arbitrarily deep tail recursion without stack overflow

### call/cc (Escape Continuations Only)

Full `call/cc` (reified continuations) is complex and imposes a CPS transform on the entire interpreter. In Phase 1-3, we implement **escape continuations** only using JavaScript's exception mechanism:
- The continuation procedure throws a `ContinuationEscape` exception
- The catch point in `call/cc` catches it and returns the value
- This correctly handles `call/cc` used for early exit patterns, which covers the majority of real-world uses

Full continuations (stack capture/restore) are deferred to a future phase.

## Consequences

- `stdlib/init.scm` is loaded at interpreter startup using `readFileSync` in Node.js context, or bundled as a string in the browser
- The trampoline only handles explicit tail positions; mutual recursion across `eval` and `apply` is also trampolined
- Escape-only `call/cc` means programs relying on multi-shot or upward continuations will not work correctly in the current version
