# Tests

This directory holds workspace-level real integration helpers.

Current contents:

- `live_multi_agent.py`: shared real multi-agent validation used by CI

These tests are different from language-specific integration tests under `implementations/<language>/integration`:

- `tests/` is for shared cross-implementation real behavior
- `implementations/<language>/integration` is for implementation-specific real behavior
