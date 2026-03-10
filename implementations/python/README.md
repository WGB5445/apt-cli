# Python Implementation

Target SDK: `aptos-python-sdk`

## Current Status

This implementation is currently used for shared conformance and mock-shape validation.

It is not yet part of the real localnet transaction path used by CI for TypeScript and Go.

## Entry Point

```bash
python3 -m aptx_py simulate single --input ../../fixtures/transactions/single-transfer.json --output-format json
```

## Role In The Workspace

- keeps Python in the canonical CLI contract
- participates in `python3 conformance/run.py`
- does not yet claim real `simulate/submit/run` localnet parity with the TypeScript and Go implementations
