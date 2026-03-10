import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
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

async function fetchNextMultisigAddress(aptos: Aptos, owner: AccountAddress): Promise<AccountAddress> {
  const response = await aptos.viewJson<[string]>({
    payload: {
      function: "0x1::multisig_account::get_next_multisig_account_address",
      functionArguments: [owner.toString()],
    },
  });
  return AccountAddress.from(response[0]);
}

async function multisigResource(aptos: Aptos, multisigAddress: AccountAddress) {
  return aptos.getAccountResource<{
    num_signatures_required: string;
    owners: string[];
  }>({
    accountAddress: multisigAddress,
    resourceType: "0x1::multisig_account::MultisigAccount",
  });
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

function commonCliFlags(signer: Account): string[] {
  return [
    "--network",
    process.env.APTX_TEST_NETWORK ?? "local",
    "--fullnode",
    fullnodeUrl(),
    "--sender-address",
    signer.accountAddress.toString(),
    "--private-key",
    signerPrivateKey(signer),
    "--output-format",
    "json",
  ];
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

function transferArgs(recipient: AccountAddress): string[] {
  return [
    "--function",
    "0x1::aptos_account::transfer",
    "--arg",
    `address:${recipient.toString()}`,
    "--arg",
    `u64:${TRANSFER_AMOUNT}`,
  ];
}

async function main(): Promise<void> {
  const aptos = createClient();

  const owners = [Account.generate(), Account.generate(), Account.generate()];
  const recipient = Account.generate();

  for (const owner of owners) {
    await fundAccount(owner.accountAddress.toString());
  }

  const expectedMultisigAddress = await fetchNextMultisigAddress(aptos, owners[0].accountAddress);
  const created = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[0]),
    "--multisig-action",
    "create-account",
    "--multisig-owner-address",
    owners[1].accountAddress.toString(),
    "--multisig-owner-address",
    owners[2].accountAddress.toString(),
    "--multisig-threshold",
    "2",
  ]);
  assertCliSuccess("node", "create-account", created);
  if (created.result.multisig_address !== expectedMultisigAddress.toString()) {
    throw new Error(`unexpected multisig address: got ${String(created.result.multisig_address)} want ${expectedMultisigAddress.toString()}`);
  }

  const resource = await multisigResource(aptos, expectedMultisigAddress);
  if (resource.num_signatures_required !== "2") {
    throw new Error(`unexpected multisig threshold: ${resource.num_signatures_required}`);
  }
  if (resource.owners.length !== 3) {
    throw new Error(`unexpected multisig owner count: ${resource.owners.length}`);
  }

  await fundAccount(expectedMultisigAddress.toString());

  const proposed = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[1]),
    "--multisig-action",
    "propose",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    ...transferArgs(recipient.accountAddress),
  ]);
  assertCliSuccess("node", "propose", proposed);

  const simulatedApprove = runCli("node", [
    "simulate",
    "multi-sig",
    ...commonCliFlags(owners[2]),
    "--multisig-action",
    "approve",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    "--multisig-sequence",
    "1",
  ]);
  assertCliSuccess("node", "simulate-approve", simulatedApprove);

  const denoSimulatedApprove = runCli("deno", [
    "simulate",
    "multi-sig",
    ...commonCliFlags(owners[2]),
    "--multisig-action",
    "approve",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    "--multisig-sequence",
    "1",
  ]);
  assertCliSuccess("deno", "simulate-approve", denoSimulatedApprove);

  const approved = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[2]),
    "--multisig-action",
    "approve",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    "--multisig-sequence",
    "1",
  ]);
  assertCliSuccess("node", "approve", approved);

  const executedStoredPayload = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[0]),
    "--multisig-action",
    "execute",
    "--multisig-address",
    expectedMultisigAddress.toString(),
  ]);
  assertCliSuccess("node", "execute-stored", executedStoredPayload);
  await assertBalance(aptos, recipient.accountAddress, TRANSFER_AMOUNT);

  const hashOnlyProposal = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[0]),
    "--multisig-action",
    "propose",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    "--multisig-hash-only",
    ...transferArgs(recipient.accountAddress),
  ]);
  assertCliSuccess("node", "propose-hash-only", hashOnlyProposal);

  const secondApproval = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[2]),
    "--multisig-action",
    "approve",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    "--multisig-sequence",
    "2",
  ]);
  assertCliSuccess("node", "approve-hash-only", secondApproval);

  const executedHashPayload = runCli("node", [
    "run",
    "multi-sig",
    ...commonCliFlags(owners[1]),
    "--multisig-action",
    "execute",
    "--multisig-address",
    expectedMultisigAddress.toString(),
    ...transferArgs(recipient.accountAddress),
  ]);
  assertCliSuccess("node", "execute-hash-payload", executedHashPayload);
  await assertBalance(aptos, recipient.accountAddress, TRANSFER_AMOUNT * 2);

  process.stdout.write(
    JSON.stringify(
      {
        status: "ok",
        tested: ["typescript-multisig-node", "typescript-multisig-deno"],
        multisigAddress: expectedMultisigAddress.toString(),
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
