# Implementations

This directory contains language-specific implementations of the same canonical Aptos transaction CLI.

## Status Matrix

| Language | Target SDK | Real SDK Coverage | Localnet Integration |
| --- | --- | --- | --- |
| TypeScript | `@aptos-labs/ts-sdk` | `single`, `multi-agent`, `multi-key`, `multi-sig`, `inspect` | yes |
| Go | `github.com/aptos-labs/aptos-go-sdk` | `single`, `multi-agent`, `multi-sig`, `inspect` | yes |
| Python | `aptos-python-sdk` | mock-oriented | no |
| Rust | `aptos-rust-sdk` | mock-oriented | no |

## Why The Matrix Is Uneven

The workspace is intentionally staged.

- TypeScript is the primary real backend and the fastest place to add new CLI behavior.
- Go is the second real backend and is used to cross-check real SDK behavior.
- Python and Rust are still kept in the shared conformance path so command shape and stable JSON output can stay aligned while real coverage catches up.

## Current Rule

When a feature is called "implemented" at the workspace level, the expectation is:

1. the canonical CLI contract reflects it
2. at least one real backend supports it end-to-end
3. a localnet-backed test exists for that real path

Cross-language parity is still a goal, but it is not yet complete for every transaction type in every language.
