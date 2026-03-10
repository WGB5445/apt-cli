# Architecture

## Purpose

This workspace exists to keep multiple Aptos SDK-backed CLIs aligned around one canonical contract. The immediate product is a transaction-oriented CLI. The broader goal is SDK compatibility validation.

## Layers

### 1. Canonical Contract

`spec/canonical-cli.md` defines the shared command shape:

- actions: `simulate`, `submit`, `run`, `inspect`
- transaction types: `single`, `multi-agent`, `multi-key`, `multi-sig`
- shared input and output rules

This file is the contract that implementations are expected to converge on.

### 2. Shared Conformance

`conformance/run.py` runs each implementation against the same fixture and compares a stable subset of the JSON output.

This layer is intentionally conservative:

- it keeps Python and Rust in the loop even when they do not yet have full real-SDK coverage
- it focuses on command-shape compatibility and stable output structure

### 3. Real SDK Implementations

Each implementation lives under `implementations/<language>`.

Current state:

- `typescript`: primary real backend, supports Node/Bun/Deno
- `go`: real backend for core transaction paths
- `python`: mock-oriented implementation
- `rust`: mock-oriented implementation

### 4. Real Integration Coverage

Real behavior is validated against Aptos localnet started by Aptos CLI.

Current coverage:

- shared real multi-agent flow via `tests/live_multi_agent.py`
- TypeScript localnet multikey flow
- TypeScript localnet multisig flow
- Go localnet multisig flow
- Go CLI-driven multisig flow

## Validation Model

The repository intentionally uses two validation tracks.

### Mock Track

Purpose:

- fast, shared, deterministic
- validates CLI contract and output structure

Entry:

```bash
python3 conformance/run.py
```

### Localnet Track

Purpose:

- validates real SDK behavior
- validates transaction build/sign/simulate/submit/wait paths
- validates that the CLI is actually usable, not just structurally aligned

Entry:

- GitHub Actions workflow in `.github/workflows/ci.yml`
- local runs using `aptos node run-localnet`

## Why This Split Exists

Not every language SDK is equally mature. If the repository required every implementation to have identical real coverage before any shared check could pass, the workspace would stall.

The split allows:

- strict structure checks across all languages
- deeper real checks where the SDKs are ready
- gradual expansion of real coverage

## Current Gaps

- Go `multi-key` CLI support is not implemented yet
- Python and Rust are not yet connected to real localnet transaction flows
- the shared conformance path still compares a mock-shaped projection, not full real execution parity

## Practical Rule

When adding or changing a real feature:

1. update the canonical CLI contract if the user-facing command shape changes
2. update the implementation
3. add or update a real localnet test for that path
4. keep shared conformance stable unless the contract intentionally changed
