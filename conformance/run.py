#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / "fixtures" / "transactions" / "single-transfer.json"

IMPLEMENTATIONS = {
    "typescript": [
        "node",
        "--experimental-strip-types",
        str(ROOT / "implementations" / "typescript" / "src" / "cli.ts"),
        "simulate",
        "single",
        "--sdk-mode",
        "mock",
        "--input",
        str(FIXTURE),
        "--output-format",
        "json",
    ],
    "python": [
        "python3",
        "-m",
        "aptx_py",
        "simulate",
        "single",
        "--input",
        str(FIXTURE),
        "--output-format",
        "json",
    ],
    "go": [
        "go",
        "run",
        "./cmd/aptx",
        "simulate",
        "single",
        "--sdk-mode",
        "mock",
        "--input",
        str(FIXTURE),
        "--output-format",
        "json",
    ],
    "rust": [
        "cargo",
        "run",
        "--quiet",
        "--",
        "simulate",
        "single",
        "--input",
        str(FIXTURE),
        "--output-format",
        "json",
    ],
}


def run_impl(name: str):
    cmd = IMPLEMENTATIONS[name]
    cwd = ROOT
    env = os.environ.copy()
    if name == "python":
        cwd = ROOT / "implementations" / "python"
    elif name == "go":
        cwd = ROOT / "implementations" / "go"
        cache_dir = ROOT / ".cache" / "go-build"
        cache_dir.mkdir(parents=True, exist_ok=True)
        env["GOCACHE"] = str(cache_dir)
    elif name == "rust":
        cwd = ROOT / "implementations" / "rust"
        target_dir = ROOT / ".cache" / "cargo-target"
        target_dir.mkdir(parents=True, exist_ok=True)
        env["CARGO_TARGET_DIR"] = str(target_dir)
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"{name} failed with code {proc.returncode}\nstdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
    return json.loads(proc.stdout)


def projection(payload: dict) -> dict:
    sender_address = payload["input"]["sender_address"]
    if isinstance(sender_address, str) and sender_address.startswith("0x"):
        sender_address = f"0x{sender_address[2:].rjust(64, '0')}"
    return {
        "action": payload["action"],
        "txn_type": payload["txn_type"],
        "function": payload["input"]["function"],
        "args": payload["input"]["args"],
        "type_args": payload["input"]["type_args"],
        "sender_address": sender_address,
        "abi_enabled": payload["abi_enabled"],
        "sign_mode": payload["signing"]["mode"],
        "result_mode": payload["result"]["mode"],
        "success": payload["result"]["success"],
        "vm_status": payload["result"]["vm_status"],
        "gas_used": payload["result"]["gas_used"],
    }


def main() -> int:
    results = {}
    for name in IMPLEMENTATIONS:
        payload = run_impl(name)
        results[name] = projection(payload)

    baseline = None
    for name, proj in results.items():
        if baseline is None:
            baseline = proj
            continue
        if proj != baseline:
            print(json.dumps(results, indent=2))
            print(f"conformance mismatch detected in {name}", file=sys.stderr)
            return 1

    print(json.dumps({"status": "ok", "projection": baseline, "implementations": list(results.keys())}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
