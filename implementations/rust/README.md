# Rust Implementation

Target SDK: `aptos-rust-sdk`

## Current Status

This implementation is currently used for shared conformance and mock-shape validation.

It is not yet part of the real localnet transaction path used by CI for TypeScript and Go.

## Entry Point

```bash
cargo run --quiet -- simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
```

## Role In The Workspace

- keeps Rust in the canonical CLI contract
- participates in `python3 conformance/run.py`
- does not yet claim real `simulate/submit/run` localnet parity with the TypeScript and Go implementations
