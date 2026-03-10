# Project Guide

This repository is an Aptos transaction CLI workspace. It contains:

- a canonical CLI contract in `spec/`
- shared fixtures and conformance checks in `fixtures/` and `conformance/`
- multiple language implementations in `implementations/`
- localnet-backed integration coverage in `tests/` and language-specific integration tests

## Intent

The project is not a single CLI implementation. It is a workspace for keeping several SDK-backed CLIs aligned so new SDK versions can be checked for:

- command-shape compatibility
- transaction behavior compatibility
- localnet usability

## Primary Layout

- `README.md`: workspace entrypoint and current status
- `docs/architecture.md`: high-level architecture and validation model
- `spec/canonical-cli.md`: canonical command and flag contract
- `conformance/run.py`: shared mock-shape conformance runner
- `tests/live_multi_agent.py`: shared real multi-agent integration helper
- `implementations/README.md`: implementation status matrix
- `implementations/typescript`: TS SDK implementation, with Node/Bun/Deno entrypoints
- `implementations/go`: Go SDK implementation and Go integration tests
- `implementations/python`: Python mock-oriented implementation
- `implementations/rust`: Rust mock-oriented implementation

## Working Rules

- Preserve the canonical CLI shape unless the spec and at least the active implementations are updated together.
- Prefer localnet-backed tests for real SDK changes.
- Keep mock conformance working even when only part of the workspace has real SDK support.
- Do not commit local build artifacts or generated binaries.

## Validation

Before considering a real backend change complete, run the relevant checks:

- `python3 conformance/run.py`
- `cd implementations/typescript && pnpm exec tsc --noEmit`
- `cd implementations/go && go build ./...`
- localnet-backed tests for any changed real transaction path

## Current Reality

- TypeScript has the broadest real coverage.
- Go has real `single`, `multi-agent`, and `multi-sig` coverage; `multi-key` is still pending.
- Python and Rust are currently kept in the shared conformance path, not the real localnet path.
