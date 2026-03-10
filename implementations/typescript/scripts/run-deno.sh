#!/bin/sh
set -eu

if command -v deno >/dev/null 2>&1; then
  exec deno run -A --node-modules-dir=auto src/cli.ts "$@"
fi

if [ -x "${HOME}/.deno/bin/deno" ]; then
  exec "${HOME}/.deno/bin/deno" run -A --node-modules-dir=auto src/cli.ts "$@"
fi

echo "deno not found. install it or add it to PATH." >&2
exit 127
