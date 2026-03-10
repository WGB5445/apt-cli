import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  MultiKey,
  Network,
} from "@aptos-labs/ts-sdk";

const FUNDING_AMOUNT = 100_000_000;
const TRANSFER_AMOUNT = 1_000_000;
const IMPLEMENTATION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type CliRuntime = "node" | "deno";

function resolveNetwork(name: string): Network {
  switch (name.toLowerCase()) {
    case "mainnet":
      return Network.MAINNET;
    case "testnet":
      return Network.TESTNET;
    case "local":
    case "localnet":
      return Network.LOCAL;
    default:
      return Network.DEVNET;
  }
}

function createClient(): Aptos {
  const networkName = process.env.APTX_TEST_NETWORK ?? "local";
  const fullnode = process.env.APTX_TEST_FULLNODE;
  return new Aptos(
    new AptosConfig({
      network: resolveNetwork(networkName),
      fullnode,
      clientConfig: { http2: false },
    }),
  );
}

function fullnodeUrl(): string {
  return process.env.APTX_TEST_FULLNODE ?? "http://127.0.0.1:8080/v1";
}

function faucetUrl(): string {
  return process.env.APTX_TEST_FAUCET ?? "http://127.0.0.1:8081";
}

async function fundAccount(address: string, amount = FUNDING_AMOUNT): Promise<void> {
  const response = await fetch(`${faucetUrl()}/fund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, amount }),
  });
  if (!response.ok) {
    throw new Error(`fund account failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as { txn_hashes?: string[] };
  const txnHash = payload.txn_hashes?.[0];
  if (!txnHash) {
    throw new Error(`fund account response missing txn hash: ${JSON.stringify(payload)}`);
  }
  await waitForTransaction(txnHash);
}

async function waitForTransaction(txHash: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${fullnodeUrl()}/transactions/by_hash/${txHash}`);
    if (response.status === 404) {
      await sleep(1000);
      continue;
    }
    if (!response.ok) {
      throw new Error(`transaction lookup failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as { type?: string; success?: boolean; vm_status?: string };
    if (payload.type === "pending_transaction") {
      await sleep(1000);
      continue;
    }
    if (payload.success === false) {
      throw new Error(`transaction ${txHash} failed: ${payload.vm_status}`);
    }
    return;
  }
  throw new Error(`timed out waiting for transaction ${txHash}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertBalance(aptos: Aptos, address: AccountAddress, expected: number): Promise<void> {
  const amount = await aptos.getAccountAPTAmount({ accountAddress: address });
  if (Number(amount) !== expected) {
    throw new Error(`unexpected balance for ${address.toString()}: got ${amount} want ${expected}`);
  }
}

function signerPrivateKey(signer: Account): string {
  return String((signer as Account & { privateKey: { toString(): string } }).privateKey);
}

function runCli(runtime: CliRuntime, args: string[]) {
  const command =
    runtime === "node" ? process.execPath : path.resolve(IMPLEMENTATION_DIR, "scripts/run-deno.sh");
  const commandArgs =
    runtime === "node" ? ["--experimental-strip-types", "src/cli.ts", ...args] : args;
  const stdout = execFileSync(command, commandArgs, {
    cwd: IMPLEMENTATION_DIR,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(stdout) as {
    input: Record<string, unknown>;
    result: Record<string, unknown>;
  };
}

function assertCliSuccess(runtime: CliRuntime, label: string, payload: { result: Record<string, unknown> }): void {
  if (payload.result.success !== true) {
    throw new Error(`${runtime} ${label} failed: ${JSON.stringify(payload.result)}`);
  }
}

function multiKeyFlags(accounts: Account[]): string[] {
  return accounts.flatMap((account) => ["--multi-key-public-key", account.publicKey.toString()]);
}

async function main(): Promise<void> {
  const aptos = createClient();
  const accounts = [Account.generate(), Account.generate(), Account.generate()];
  const recipient = Account.generate();
  const multiKey = new MultiKey({
    publicKeys: accounts.map((account) => account.publicKey),
    signaturesRequired: 2,
  });
  const senderAddress = multiKey.authKey().derivedAddress().toString();

  await fundAccount(senderAddress);

  const simulated = runCli("node", [
    "simulate",
    "multi-key",
    "--network",
    process.env.APTX_TEST_NETWORK ?? "local",
    "--fullnode",
    fullnodeUrl(),
    "--output-format",
    "json",
    "--multi-key-threshold",
    "2",
    ...multiKeyFlags(accounts),
    "--function",
    "0x1::aptos_account::transfer",
    "--arg",
    `address:${recipient.accountAddress.toString()}`,
    "--arg",
    `u64:${TRANSFER_AMOUNT}`,
  ]);
  assertCliSuccess("node", "simulate", simulated);
  if (String(simulated.input.sender_address) !== senderAddress) {
    throw new Error(`unexpected derived sender address: got ${String(simulated.input.sender_address)} want ${senderAddress}`);
  }

  const denoSimulated = runCli("deno", [
    "simulate",
    "multi-key",
    "--network",
    process.env.APTX_TEST_NETWORK ?? "local",
    "--fullnode",
    fullnodeUrl(),
    "--output-format",
    "json",
    "--multi-key-threshold",
    "2",
    ...multiKeyFlags(accounts),
    "--function",
    "0x1::aptos_account::transfer",
    "--arg",
    `address:${recipient.accountAddress.toString()}`,
    "--arg",
    `u64:${TRANSFER_AMOUNT}`,
  ]);
  assertCliSuccess("deno", "simulate", denoSimulated);

  const executed = runCli("node", [
    "run",
    "multi-key",
    "--network",
    process.env.APTX_TEST_NETWORK ?? "local",
    "--fullnode",
    fullnodeUrl(),
    "--output-format",
    "json",
    "--multi-key-threshold",
    "2",
    ...multiKeyFlags(accounts),
    "--multi-key-signer",
    `0:${signerPrivateKey(accounts[0])}`,
    "--multi-key-signer",
    `2:${signerPrivateKey(accounts[2])}`,
    "--function",
    "0x1::aptos_account::transfer",
    "--arg",
    `address:${recipient.accountAddress.toString()}`,
    "--arg",
    `u64:${TRANSFER_AMOUNT}`,
  ]);
  assertCliSuccess("node", "run", executed);
  await assertBalance(aptos, recipient.accountAddress, TRANSFER_AMOUNT);

  process.stdout.write(
    JSON.stringify(
      {
        status: "ok",
        tested: ["typescript-multikey-node", "typescript-multikey-deno"],
        senderAddress,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
