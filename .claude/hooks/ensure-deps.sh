#!/usr/bin/env bash
# SessionStart hook: install deps in fresh worktrees so agents never hit the
# "missing node_modules" tax. Installs only when node_modules is absent, so
# warm worktrees pay nothing.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
bun="$(command -v bun || true)"
[ -n "$bun" ] || { echo '{"suppressOutput": true}'; exit 0; }

if [ -f "$root/package.json" ] && [ ! -d "$root/node_modules" ]; then
	( cd "$root" && "$bun" install ) >/dev/null 2>&1
	echo '{"systemMessage": "ensure-deps: ran bun install"}'
else
	echo '{"suppressOutput": true}'
fi
