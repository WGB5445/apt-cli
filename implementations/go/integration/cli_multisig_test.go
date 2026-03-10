package integration_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	aptos "github.com/aptos-labs/aptos-go-sdk"
)

func TestCLIOnChainMultisig(t *testing.T) {
	client := newLocalClient(t)
	cliPath := buildCLI(t)

	owners := []*aptos.Account{
		newAccount(t),
		newAccount(t),
		newAccount(t),
	}
	recipient := newAccount(t)

	for _, owner := range owners {
		fundAccount(t, client, owner.Address, multisigFundingAmount)
	}

	multisigAddress, err := client.FetchNextMultisigAddress(owners[0].Address)
	if err != nil {
		t.Fatalf("fetch next multisig address: %v", err)
	}

	created := runCLI(t, cliPath, owners[0],
		"run", "multi-sig",
		"--multisig-action", "create-account",
		"--multisig-owner-address", owners[1].Address.String(),
		"--multisig-owner-address", owners[2].Address.String(),
		"--multisig-threshold", "2",
	)
	assertCLISuccess(t, "create-account", created)
	if got := asStringMapValue(t, created["result"], "multisig_address"); got != multisigAddress.String() {
		t.Fatalf("unexpected multisig address: got %s want %s", got, multisigAddress.String())
	}

	threshold, ownerList := multisigResource(t, client, multisigAddress)
	if threshold != 2 {
		t.Fatalf("unexpected threshold: got %d want 2", threshold)
	}
	if len(ownerList) != 3 {
		t.Fatalf("unexpected owner count: got %d want 3", len(ownerList))
	}

	fundAccount(t, client, *multisigAddress, multisigFundingAmount)

	proposed := runCLI(t, cliPath, owners[1],
		"run", "multi-sig",
		"--multisig-action", "propose",
		"--multisig-address", multisigAddress.String(),
		"--function", "0x1::aptos_account::transfer",
		"--arg", "address:"+recipient.Address.String(),
		"--arg", fmt.Sprintf("u64:%d", multisigTransferAmount),
	)
	assertCLISuccess(t, "propose", proposed)

	simulatedApprove := runCLI(t, cliPath, owners[2],
		"simulate", "multi-sig",
		"--multisig-action", "approve",
		"--multisig-address", multisigAddress.String(),
		"--multisig-sequence", "1",
	)
	assertCLISuccess(t, "simulate-approve", simulatedApprove)

	approved := runCLI(t, cliPath, owners[2],
		"run", "multi-sig",
		"--multisig-action", "approve",
		"--multisig-address", multisigAddress.String(),
		"--multisig-sequence", "1",
	)
	assertCLISuccess(t, "approve", approved)

	executedStored := runCLI(t, cliPath, owners[0],
		"run", "multi-sig",
		"--multisig-action", "execute",
		"--multisig-address", multisigAddress.String(),
	)
	assertCLISuccess(t, "execute-stored", executedStored)
	assertBalance(t, client, recipient.Address, multisigTransferAmount)

	hashOnlyProposal := runCLI(t, cliPath, owners[0],
		"run", "multi-sig",
		"--multisig-action", "propose",
		"--multisig-address", multisigAddress.String(),
		"--multisig-hash-only",
		"--function", "0x1::aptos_account::transfer",
		"--arg", "address:"+recipient.Address.String(),
		"--arg", fmt.Sprintf("u64:%d", multisigTransferAmount),
	)
	assertCLISuccess(t, "propose-hash-only", hashOnlyProposal)

	secondApproval := runCLI(t, cliPath, owners[2],
		"run", "multi-sig",
		"--multisig-action", "approve",
		"--multisig-address", multisigAddress.String(),
		"--multisig-sequence", "2",
	)
	assertCLISuccess(t, "approve-hash-only", secondApproval)

	executedHashPayload := runCLI(t, cliPath, owners[1],
		"run", "multi-sig",
		"--multisig-action", "execute",
		"--multisig-address", multisigAddress.String(),
		"--function", "0x1::aptos_account::transfer",
		"--arg", "address:"+recipient.Address.String(),
		"--arg", fmt.Sprintf("u64:%d", multisigTransferAmount),
	)
	assertCLISuccess(t, "execute-hash-payload", executedHashPayload)
	assertBalance(t, client, recipient.Address, multisigTransferAmount*2)
}

func buildCLI(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	root := filepath.Dir(wd)
	output := filepath.Join(t.TempDir(), "aptx")
	cmd := exec.Command("go", "build", "-o", output, "./cmd/aptx")
	cmd.Dir = root
	cmd.Env = os.Environ()
	if outputBytes, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("build cli: %v\n%s", err, string(outputBytes))
	}
	return output
}

func runCLI(t *testing.T, cliPath string, signer *aptos.Account, args ...string) map[string]any {
	t.Helper()
	privateKey, err := signer.PrivateKeyString()
	if err != nil {
		t.Fatalf("private key string: %v", err)
	}
	fullnode := os.Getenv("APTX_TEST_FULLNODE")
	if fullnode == "" {
		fullnode = "http://127.0.0.1:8080/v1"
	}
	cliArgs := []string{
		"--network", "local",
		"--fullnode", fullnode,
		"--sender-address", signer.Address.String(),
		"--private-key", privateKey,
		"--output-format", "json",
	}
	cliArgs = append(args[:2], append(cliArgs, args[2:]...)...)
	cmd := exec.Command(cliPath, cliArgs...)
	cmd.Env = os.Environ()
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	if err != nil {
		t.Fatalf("run cli %v: %v\nstdout:\n%s\nstderr:\n%s", cliArgs, err, stdout.String(), stderr.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("decode cli output: %v\nstdout:\n%s\nstderr:\n%s", err, stdout.String(), stderr.String())
	}
	return payload
}

func assertCLISuccess(t *testing.T, label string, payload map[string]any) {
	t.Helper()
	result, ok := payload["result"].(map[string]any)
	if !ok {
		t.Fatalf("%s missing result payload: %#v", label, payload["result"])
	}
	success, ok := result["success"].(bool)
	if !ok || !success {
		t.Fatalf("%s failed: %#v", label, result)
	}
}

func asStringMapValue(t *testing.T, value any, key string) string {
	t.Helper()
	record, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected map value, got %#v", value)
	}
	str, ok := record[key].(string)
	if !ok {
		t.Fatalf("expected string for %s, got %#v", key, record[key])
	}
	return str
}
