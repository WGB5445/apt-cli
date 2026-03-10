# Aptos Transaction CLI Plan

## 1. Goal

This CLI is a transaction-focused Aptos developer tool.

Its first goal is not full SDK governance. Its first goal is to let developers:

- build transactions
- simulate transactions
- submit transactions
- inspect transactions
- view results in machine-friendly and human-friendly formats

The CLI should also reduce the friction of testing different transaction modes and different argument input styles.

## 1.1 Why This CLI Exists

The CLI should solve real developer pain points around Aptos transaction execution.

Main meaning of this CLI:

- provide one consistent entry point for different Aptos transaction types
- reduce the need to write one-off scripts for simulation and submission
- make transaction debugging easier by exposing ABI, arguments, gas, VM status, and execution results clearly
- support both quick manual usage and repeatable automation usage
- make it easy to switch between human-readable output and machine-readable output
- let developers safely test transactions without always needing to submit on-chain

This means the CLI is not just a thin wrapper over SDK calls.
It should be a practical transaction workbench for local debugging, scripting, and repeatable testing.

## 2. Product Positioning

This tool should be designed as a unified Aptos transaction executor and debugger.

It should support:

- simple command-line driven execution
- file-driven execution using JSON or YAML
- environment-variable driven execution
- simulation without private key material
- transaction submission with flexible signer input methods
- multi-language implementations with aligned behavior and outputs

Current planned implementation targets in this repository:

- TypeScript
- Python
- Go
- Rust

The design should keep the first version focused and practical.

## 3. Core Scope

The first version should focus on transaction workflows.

Supported actions:

- `simulate`
- `submit`
- `run`
- `inspect`

Supported transaction types:

- `single`
- `multi-agent`
- `multi-key`
- `multi-sig`

Optional later scope:

- sponsored transaction / fee payer
- batch execution
- template-driven transaction generation
- richer reporting and replay

## 4. Command Shape

Recommended top-level commands:

```text
aptx simulate <txn-type>
aptx submit <txn-type>
aptx run <txn-type>
aptx inspect
```

Where `<txn-type>` supports:

```text
single
multi-agent
multi-key
multi-sig
```

Examples:

```bash
aptx simulate single --function 0x1::aptos_account::transfer --arg address:0xabc --arg u64:1000
aptx submit single --private-key-env APTOS_SK --function 0x1::aptos_account::transfer --arg address:0xabc --arg u64:1000
aptx run multi-agent --sender-key-env ALICE_SK --secondary-key-env BOB_SK --function 0x123::demo::exec --arg address:0xabc
```

## 5. Input Model

The CLI should support multiple input sources.

Supported input sources:

- command-line arguments
- JSON files
- YAML files
- stdin
- environment variables
- profile/config file

All input sources should be normalized into a single internal transaction object.

Recommended internal concepts:

- `TransactionSpec`
- `SignerSpec`
- `ExecutionOptions`

## 6. Input Source Priority

If the same field appears in multiple places, the CLI should use a deterministic override order.

Recommended priority:

1. explicit CLI flags
2. environment variables
3. input file content
4. profile/config defaults
5. built-in defaults

This priority should be documented and consistent everywhere.

## 7. Input and Output Formats Are Separate

Input format and output format must be configured separately.

Recommended flags:

- `--input <path|->`
- `--input-format auto|json|yaml`
- `--output <path|->`
- `--output-format auto|json|yaml|table|ascii`
- `--artifacts-dir <path>`

Rules:

- if format is explicitly specified, use it
- otherwise infer from file extension
- if the target is stdin or stdout, use command defaults

Examples:

```bash
aptx simulate --input tx.yaml --output result.json
aptx simulate --input tx.json --output - --output-format table
cat tx.yaml | aptx simulate --input - --input-format yaml --output -
```

## 8. Signer Input

The CLI must support multiple signer input styles.

Supported signer input methods:

- direct private key
- private key from environment variable
- private key from file
- signer from named profile
- sender address only
- no signing for simulation

Recommended signer-related flags:

- `--private-key <hex>`
- `--private-key-env <ENV_NAME>`
- `--private-key-file <path>`
- `--sender-address <address>`
- `--profile <name>`
- `--no-sign`

Rules:

- `simulate` should allow address-only mode and no-sign mode
- `submit` must require valid signing material unless future external-sign mode is introduced

## 9. ABI Behavior

ABI support should be enabled by default.

Recommended flags:

- default ABI behavior: on
- optional override: `--no-abi`
- optional debug flag later: `--show-abi`

When ABI is enabled:

- the CLI fetches or resolves the function ABI
- the CLI validates argument count
- the CLI validates argument layout
- the CLI can map pre-serialized raw arguments to the correct ABI slots

When ABI is disabled:

- the CLI should not allow ABI-dependent raw argument mode
- the CLI should require explicit parsed arguments

## 10. Argument Syntax

The CLI should support one repeatable `--arg` flag.

Two argument modes are required:

- parsed mode
- raw serialized mode

### 10.1 Parsed Argument Mode

Parsed mode syntax:

```text
<type>:<value>
```

Supported first-version parsed types:

```text
address:0xabc
u8:1
u64:1000
u128:123456
bool:true
string:hello
hex:0xdeadbeef
vector<u8>:[1,2,3]
```

Rules:

- the CLI parses the text form
- the CLI serializes the argument according to the ABI target type
- arguments are applied in the order they appear

### 10.2 Raw Serialized Argument Mode

Raw mode syntax:

```text
raw:<hex>
```

Meaning:

- this argument has already been serialized by the user
- the CLI does not re-parse the value semantically
- the CLI uses ABI information to determine which function parameter slot this raw value belongs to

Example:

```bash
aptx simulate single \
  --function 0x1::aptos_account::transfer \
  --arg address:0xabc \
  --arg raw:0xe803000000000000
```

Rules:

- `raw:<hex>` is only valid when ABI mode is enabled
- the CLI should reject malformed hex
- the CLI should reject raw usage if ABI cannot be resolved

## 11. Type Arguments

Type arguments should stay separate from normal arguments.

Recommended flag:

- `--type-arg <type-tag>`

Examples:

```bash
--type-arg 0x1::aptos_coin::AptosCoin
--type-arg 0x123::my_mod::MyType
```

## 12. Output Behavior

The CLI should support both machine-readable and human-readable output.

Supported output formats:

- `json`
- `yaml`
- `table`
- `ascii`

Recommended behavior:

- stdout default for terminal use: `table` or `ascii`
- file output default: infer from extension
- if `--output-format` is set, it overrides extension inference

The result output should include enough information for debugging.

Recommended fields:

- action
- transaction type
- function
- sender
- secondary signers if any
- gas settings
- sequence number
- simulation status
- VM status
- gas used
- transaction hash
- success flag
- events summary
- write set summary
- raw RPC response when requested

## 13. Artifacts

The CLI should support saving execution artifacts.

Recommended flag:

- `--artifacts-dir <path>`

Possible artifacts:

- normalized transaction spec
- final serialized transaction bytes
- simulation result
- submit result
- wait result
- debug metadata

This is useful for debugging and later replay support.

## 14. Error Handling and User Experience

The CLI should have predictable error handling and readable failure output.

Error categories should be separated clearly:

- input validation errors
- config resolution errors
- ABI resolution errors
- signer resolution errors
- serialization errors
- network and RPC errors
- simulation failures
- on-chain execution failures
- internal CLI errors

Recommended error style:

- short summary line first
- one clear cause if known
- actionable next step if possible
- optional detailed context when verbose logging is enabled

Examples:

- invalid argument syntax should point to the offending `--arg`
- ABI resolution failure should mention function id and network/profile
- signature failure should identify which signer source failed
- network error should identify endpoint and operation

The CLI should also support log verbosity control.

Recommended flags:

- `--verbose`
- `--quiet`
- optional later: `--debug`

Suggested behavior:

- default mode prints concise success/failure output
- `--verbose` prints extra execution context and debug fields
- `--quiet` prints minimal output and relies on exit codes / output file

## 15. Testing and Extensibility

The project should include a self-test strategy from the beginning.

Recommended testing layers:

- unit tests for parsing, format inference, and validation
- integration tests for simulation and submission flows
- fixture-based tests for input and output normalization
- golden tests for `table` and `ascii` rendering

Suggested built-in command:

- `aptx doctor`

Purpose of `doctor`:

- verify config loading
- verify network reachability
- verify ABI fetch ability
- verify signer source loading
- verify required local environment assumptions

Suggested future test-fixture format:

- YAML or JSON files describing command input and expected normalized spec
- golden output files for human-readable formatting

The architecture should remain modular so that new transaction types and parameter types can be added without rewriting the whole CLI.

Recommended extension points:

- transaction-type handlers
- argument parsers
- signer providers
- output formatters
- network/profile providers

The architecture should also support more than one implementation language.

Recommended shared layers:

- a language-neutral CLI behavior specification
- shared fixture files for inputs and expected outputs
- a common conformance test runner
- per-language adapters that compile and invoke each implementation in the same way

A plugin system is not required in v1, but internal module boundaries should make future plugin support possible.

## 16. Security

The CLI will handle sensitive signer material, so security rules must be explicit.

Security principles:

- never print private keys by default
- prefer environment variables or file references over direct key literals
- warn when `--private-key` is used directly
- redact sensitive fields in normal output and logs
- keep sensitive material out of saved artifacts unless explicitly requested

Recommended protections:

- default masking for signer fields in output
- file-permission checks for private key files when possible
- separate safe output from debug output
- avoid writing plaintext secrets into config examples

Sensitive output policy:

- addresses may be shown
- private keys, seed phrases, and raw secret material must be redacted
- verbose mode still must not print secrets unless an explicit unsafe flag is later introduced

## 17. Dependencies and Environment

The plan should define environment expectations clearly.

Minimum dependency areas:

- one implementation runtime for the CLI itself
- an Aptos SDK used by the CLI implementation
- network access to Aptos fullnode or localnet
- optional faucet access for localnet or testnet workflows

The exact runtime can be decided later, but the plan should document:

- required runtime version
- supported operating systems
- required external tools, if any
- required environment variables, if any

Recommended operational commands:

- `aptx init`
- `aptx doctor`
- `aptx version`

Suggested role of `aptx init`:

- create example config
- detect environment basics
- explain next setup steps

## 18. Profiles and Config

The CLI should support a config file for common networks and signer references.

Recommended config file shape:

```yaml
default_profile: local

profiles:
  local:
    network: localnet
    fullnode: http://127.0.0.1:8080/v1
  testnet:
    network: testnet
    fullnode: https://api.testnet.aptoslabs.com/v1

accounts:
  alice:
    address: "0x123"
    private_key_env: APTX_ALICE_KEY
```

Guideline:

- prefer storing signer references
- avoid storing plaintext private keys in committed config

## 19. Interaction and Scriptability

The CLI should work well both interactively and inside shell scripts.

Scriptability requirements:

- deterministic stdout behavior
- deterministic exit codes
- machine-readable output support
- file-based input/output support
- stdin support

Batch support does not need to be first-class in v1, but the design should leave room for it.

Possible later capabilities:

- batch simulate from a list of specs
- batch submit with per-item result files
- pipeline-friendly subcommands for normalization and validation

Exit code guidance:

- `0` for successful command completion
- non-zero for failure
- distinct exit codes later for validation failure, network failure, and execution failure

This is important for CI and shell integration.

## 20. Open Source, Community, and Contribution Model

This project should be designed as an open-source repository from the start.

Recommended repository community files:

- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- issue templates
- pull request template
- changelog or release notes policy

Recommended contribution guidance:

- how to run the CLI locally
- how to run tests locally
- how to add a new transaction type
- how to add a new argument type
- how to add a new implementation language
- coding style and review expectations

Recommended GitHub workflow setup:

- CI for formatting, linting, and tests
- PR checks for docs and config validation
- optional nightly conformance jobs

Issue templates should at least cover:

- bug report
- feature request
- SDK compatibility regression
- new language implementation proposal

The contribution model should make it easy for SDK maintainers and external contributors to add support or report compatibility failures.

## 21. Documentation and Help

The CLI should ship with standard discoverability features.

Required standard commands or flags:

- `--help`
- `--version`

Documentation expectations:

- example config file
- quick-start guide
- examples for each transaction type
- examples for each signer input style
- examples for JSON/YAML input and output formats
- explanation of ABI-on and ABI-off behavior
- explanation of `raw:<hex>` semantics

The first release should include enough examples that users can copy and adapt common flows directly.

## 22. Multi-Language Implementations and Shared Conformance

One important long-term goal is that this CLI should exist across multiple implementation languages while behaving the same way.

This means:

- the same command intent should exist in every implementation
- normalized outputs should be equivalent
- transaction execution results should be comparable
- error categories should stay aligned as much as practical

Recommended language strategy:

- define one canonical CLI spec
- allow multiple implementations such as TypeScript, Go, Python, Rust, or others
- require every implementation to pass the same shared conformance suite

Recommended repository shape for this:

- `spec/` for canonical CLI behavior docs
- `fixtures/` for transaction inputs and expected outputs
- `implementations/<lang>/` for each language-specific CLI
- `conformance/` for the shared test runner and adapters

The shared conformance suite should validate:

- argument parsing
- input format inference
- signer resolution behavior
- ABI-on and ABI-off behavior
- parsed vs `raw:<hex>` arguments
- normalized output structure
- simulate and submit behavior against controlled environments
- exit code behavior
- redaction and safe logging rules

Recommended execution model:

- each language implementation compiles to a runnable CLI binary or command
- a language adapter exposes a standard way to invoke that CLI
- the conformance runner feeds the same fixtures into every implementation
- outputs are normalized before comparison when necessary

This allows language-specific internal differences while preserving user-facing compatibility.

## 23. SDK Compatibility and Swap-Based CI

The project should include a CI workflow for verifying SDK compatibility across versions.

Main goal:

- replace the underlying Aptos SDK version used by an implementation
- rebuild the CLI
- run the shared conformance suite
- determine whether the new SDK version remains usable and compatible

This is especially useful when:

- upgrading an official Aptos SDK dependency
- validating a fork or patched SDK
- checking whether a new SDK release breaks transaction building or submission flows

Recommended CI workflow concepts:

- baseline job using pinned known-good SDK versions
- matrix job using alternate SDK versions
- per-language SDK swap job
- compatibility summary report

Recommended workflow steps:

1. select implementation language
2. replace or override the SDK dependency version
3. install dependencies
4. build the CLI implementation
5. run unit tests
6. run shared conformance tests
7. publish pass/fail summary and diff

Suggested CI dimensions:

- implementation language
- Aptos SDK version
- network mode such as mocked, localnet, or testnet-safe flows

Recommended result categories:

- build failed
- CLI boot failed
- parsing regression
- ABI regression
- transaction behavior regression
- output compatibility regression
- success

This CI should answer two questions clearly:

- does the CLI still work with the new SDK version
- if not, what exact behavior changed

## 24. Example Usage Patterns

### 24.1 Simulate without private key

```bash
aptx simulate single \
  --sender-address 0x123 \
  --function 0x1::aptos_account::transfer \
  --arg address:0x456 \
  --arg u64:1000
```

### 24.2 Submit using env private key

```bash
aptx submit single \
  --private-key-env APTOS_SK \
  --function 0x1::aptos_account::transfer \
  --arg address:0x456 \
  --arg u64:1000 \
  --output result.json
```

### 24.3 Mixed parsed and raw argument input

```bash
aptx simulate single \
  --function 0x1::aptos_account::transfer \
  --arg address:0x456 \
  --arg raw:0xe803000000000000 \
  --output-format ascii
```

### 24.4 File-driven execution

```bash
aptx run single --input tx.yaml --output result.json
```

## 25. MVP Boundary

The first implementation should include:

- `simulate`, `submit`, `run`, `inspect`
- `single`, `multi-agent`, `multi-key`, `multi-sig`
- CLI argument input
- JSON and YAML input
- environment variable input
- signer input via direct key, env, file, or address-only
- parsed `--arg`
- `raw:<hex>` argument mode
- ABI enabled by default
- separate input/output format handling
- JSON, table, and ASCII output
- artifact saving
- repository CI for lint, test, and fixture validation
- contribution templates and basic repository governance files

The first implementation should not try to solve everything.

It should avoid:

- full SDK uniformity testing in v1
- complex templating in v1
- interactive wizard in v1
- external signer integration in v1
- multi-language full production parity in v1

Even if full parity is not in v1, the repository should be structured so that shared conformance can be added without a redesign.

## 26. MVP Follow-Up Priorities

After MVP is usable, the next round of work should be driven by real usage feedback.

Recommended post-MVP priorities:

- improve error messages and diagnostics based on failed user runs
- expand batch and pipeline workflows if users rely on scripting heavily
- add richer inspect/debug tooling if simulation output is not sufficient
- add more parameter types only when real use cases require them
- add sponsored transaction support if it becomes a common request
- evaluate whether interactive wizard mode is worth adding for onboarding
- add the shared conformance harness for a second language implementation
- add SDK version swap CI for the first supported implementation
- add cross-language result comparison once at least two implementations exist

The main rule after MVP should be to improve depth and reliability before expanding surface area too quickly.

## 27. Suggested Next Step

The next step after this plan is to define:

- exact CLI argument tables for each command
- the `TransactionSpec` schema
- the `SignerSpec` schema
- the config file schema
- validation and error rules
- a small implementation roadmap for MVP
- repository layout for CI, templates, and governance files
- conformance fixture format for future multi-language support
