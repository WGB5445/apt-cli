# Go Implementation

Target SDK: `github.com/aptos-labs/aptos-go-sdk`

## Entry Point

```bash
go run ./cmd/aptx inspect --network testnet
```

## Real Coverage

Implemented real SDK-backed flows:

- `single`
- `multi-agent`
- `multi-sig`
- `inspect`

Current gap:

- `multi-key` CLI support is not implemented yet

## Local Validation

Build:

```bash
GOCACHE=../../.cache/go-build GOMODCACHE=../../.cache/go-mod go build ./...
```

Localnet multisig integration tests:

```bash
APTX_TEST_FULLNODE=http://127.0.0.1:8080/v1 \
APTX_TEST_FAUCET=http://127.0.0.1:8081 \
go test ./integration -run 'Test(OnChainMultisig|CLIOnChainMultisig)' -count=1 -v
```
