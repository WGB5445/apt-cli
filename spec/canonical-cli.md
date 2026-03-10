# Canonical CLI Spec

Implemented command shape:

```text
aptx simulate <txn-type>
aptx submit <txn-type>
aptx run <txn-type>
aptx inspect
```

Implemented transaction types:

- `single`
- `multi-agent`
- `multi-key`
- `multi-sig`

Currently implemented flags across all language versions:

- `--input`
- `--input-format`
- `--output`
- `--output-format`
- `--artifacts-dir`
- `--network`
- `--function`
- `--arg`
- `--type-arg`
- `--sender-address`
- `--private-key`
- `--private-key-env`
- `--private-key-file`
- `--profile`
- `--no-sign`
- `--no-abi`
- `--verbose`
- `--quiet`
- `--sdk-mode`
- `--multisig-action`
- `--multisig-address`
- `--multisig-owner-address`
- `--multisig-threshold`
- `--multisig-sequence`
- `--multisig-hash-only`
- `--multi-key-public-key`
- `--multi-key-signer`
- `--multi-key-threshold`

Argument modes:

- parsed: `<type>:<value>`
- raw serialized: `raw:<hex>`

Shared behavioral rules:

- `raw:<hex>` requires ABI mode to be enabled
- `submit` requires signer material unless `--sdk-mode mock` and `--no-sign` are both used for dry validation
- output defaults to JSON when writing to a file and table when writing to stdout
- all implementations emit the same JSON shape for conformance
- `multi-sig` uses `--multisig-action` to select one of `create-account`, `propose`, `approve`, or `execute`
- `multi-sig propose` and `multi-sig execute` currently support entry-function payloads; script payloads are not supported
- `multi-key` uses `--multi-key-public-key` to define the N-key set, `--multi-key-threshold` to define M, and `--multi-key-signer <index>:<private-key>` to select the M signers used for submission

Target SDK mappings:

- TypeScript implementation: `@aptos-labs/ts-sdk`
- Python implementation: `aptos-python-sdk`
- Go implementation: `github.com/aptos-labs/aptos-go-sdk`
- Rust implementation: `https://github.com/aptos-labs/aptos-rust-sdk`
