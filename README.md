# Aptos Transaction CLI Workspace

This repository hosts one canonical Aptos transaction CLI contract and multiple SDK-backed implementations of it.

The immediate goal is a usable transaction CLI. The broader goal is SDK compatibility validation across languages.

## What This Repo Is

- a canonical CLI contract in [`spec/canonical-cli.md`](/Users/logan/Documents/Playground/spec/canonical-cli.md)
- shared fixtures and conformance checks
- multiple language implementations under [`implementations/`](/Users/logan/Documents/Playground/implementations)
- real localnet-backed integration coverage driven by Aptos CLI

## Architecture

Start here:

- workspace guide: [`AGENTS.md`](/Users/logan/Documents/Playground/AGENTS.md)
- architecture overview: [`docs/architecture.md`](/Users/logan/Documents/Playground/docs/architecture.md)
- canonical CLI contract: [`spec/canonical-cli.md`](/Users/logan/Documents/Playground/spec/canonical-cli.md)

Current implementations:

- matrix overview: [`implementations/README.md`](/Users/logan/Documents/Playground/implementations/README.md)
- TypeScript: [`implementations/typescript/README.md`](/Users/logan/Documents/Playground/implementations/typescript/README.md)
- Go: [`implementations/go/README.md`](/Users/logan/Documents/Playground/implementations/go/README.md)
- Python: [`implementations/python/README.md`](/Users/logan/Documents/Playground/implementations/python/README.md)
- Rust: [`implementations/rust/README.md`](/Users/logan/Documents/Playground/implementations/rust/README.md)

Quick start:

```bash
python3 conformance/run.py
```

Implementation commands:

```bash
cd implementations/typescript && pnpm start -- simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
cd implementations/typescript && bun src/cli.ts simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
cd implementations/typescript && pnpm start:deno -- simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
python3 -m aptx_py simulate single --input fixtures/transactions/single-transfer.json --output-format json
cd implementations/go && env GOCACHE=../../.cache/go-build go run ./cmd/aptx simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
cd implementations/rust && cargo run --quiet -- simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
```

## Current Status

- the TypeScript implementation is organized around `pnpm` for Node.js usage, with additional `bun` and `deno` entrypoints
- the TypeScript `pnpm start:deno` entrypoint falls back to `$HOME/.deno/bin/deno` when `deno` is not on `PATH`
- the TypeScript and Go implementations now default to real SDK-backed `single`, `inspect`, and `multi-agent` flows
- the TypeScript implementation now also supports real SDK-backed `multi-key` flows using `--multi-key-public-key`, `--multi-key-threshold`, and `--multi-key-signer <index>:<private-key>`
- the TypeScript and Go implementations now also support real SDK-backed `multi-sig` flows for `create-account`, `propose`, `approve`, and `execute`
- both implementations support simulation without a private key; when the SDK needs signer identity hints, pass `--public-key`
- `multi-agent` can be driven either with a Move entry function (`--function`) or a script payload (`--script-hex`); the official Go SDK multi-agent script works end-to-end on devnet from both implementations
- `multi-sig` is driven with `--multisig-action`; use `create-account` with `--multisig-owner-address` and `--multisig-threshold`, `propose` with `--multisig-address` plus the inner `--function/--arg` payload, `approve` with `--multisig-sequence`, and `execute` with `--multisig-address` and an optional inner payload for hash-only proposals
- `multi-key` is driven with `--multi-key-public-key`, `--multi-key-threshold`, and `--multi-key-signer <index>:<private-key>`; if `--sender-address` is omitted, the TypeScript CLI derives it from the assembled multikey public key
- CI is the primary validation gate: it runs shared mock conformance plus a real localnet integration job that starts `aptos node run-localnet` and validates TypeScript, TypeScript-on-Deno, and Go multi-agent flows, then runs real TypeScript multikey, TypeScript multisig, and Go multisig integration tests
- `python3 conformance/run.py` is intentionally a shared mock-shape test so every language can be compared even before all real SDK backends are implemented
- the repository is structured so CI can later swap SDK versions and rerun the same conformance suite

## Validation

- shared mock conformance: [`conformance/README.md`](/Users/logan/Documents/Playground/conformance/README.md)
- shared real test helpers: [`tests/README.md`](/Users/logan/Documents/Playground/tests/README.md)
- shared real multi-agent helper: [`tests/live_multi_agent.py`](/Users/logan/Documents/Playground/tests/live_multi_agent.py)
- TypeScript localnet multikey flow: [`implementations/typescript/scripts/live-multikey.ts`](/Users/logan/Documents/Playground/implementations/typescript/scripts/live-multikey.ts)
- TypeScript localnet multisig flow: [`implementations/typescript/scripts/live-multisig.ts`](/Users/logan/Documents/Playground/implementations/typescript/scripts/live-multisig.ts)
- Go CLI localnet multisig flow: [`implementations/go/integration/cli_multisig_test.go`](/Users/logan/Documents/Playground/implementations/go/integration/cli_multisig_test.go)
- Go SDK localnet multisig flow: [`implementations/go/integration/multisig_test.go`](/Users/logan/Documents/Playground/implementations/go/integration/multisig_test.go)
