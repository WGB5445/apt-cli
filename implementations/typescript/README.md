# TypeScript Implementation

Target SDK: `@aptos-labs/ts-sdk`

## Runtimes

- Node via `pnpm`
- Bun
- Deno

## Entry Points

```bash
pnpm start -- inspect --network testnet
pnpm start:bun -- inspect --network testnet
pnpm start:deno -- inspect --network testnet
```

## Real Coverage

Implemented real SDK-backed flows:

- `single`
- `multi-agent`
- `multi-key`
- `multi-sig`
- `inspect`

## Local Validation

Typecheck:

```bash
pnpm exec tsc --noEmit
```

Localnet multikey:

```bash
APTX_TEST_NETWORK=local \
APTX_TEST_FULLNODE=http://127.0.0.1:8080/v1 \
APTX_TEST_FAUCET=http://127.0.0.1:8081 \
pnpm --silent test:multikey
```

Localnet multisig:

```bash
APTX_TEST_NETWORK=local \
APTX_TEST_FULLNODE=http://127.0.0.1:8080/v1 \
APTX_TEST_FAUCET=http://127.0.0.1:8081 \
pnpm --silent test:multisig
```
