# Conformance

Run the shared conformance suite:

```bash
python3 conformance/run.py
```

The runner invokes every implementation with the same fixture and compares a stable subset of the JSON result.

This is intentionally a shared mock-shape contract check, not a full real-network parity check.

Use it to validate:

- command shape
- stable JSON output
- fixture compatibility across implementations

Do not treat it as proof that every implementation has identical real SDK behavior. Real localnet validation lives in CI and in the localnet-backed tests under `tests/` and `implementations/<language>/integration`.
