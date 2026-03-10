# Contributing

## Local workflow

- read [spec/canonical-cli.md](/Users/logan/Documents/Playground/spec/canonical-cli.md)
- update shared fixtures before changing user-facing behavior
- keep all implementations aligned to the same CLI rules
- run `python3 conformance/run.py` before opening a pull request

## Pull request expectations

- explain which command or behavior changed
- update fixtures if the behavior contract changed
- update docs when flags or output fields changed
- keep sensitive data out of examples and tests

## Adding a new implementation language

- create `implementations/<language>/`
- implement the canonical commands and output structure
- add a runner entry to `conformance/run.py`
- document the target Aptos SDK in that implementation's README
