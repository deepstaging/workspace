#!/bin/bash
# Install shared git hooks into all cloned repositories.
#
# Usage:
#   ./hooks/install.sh          # Install hooks
#   ./hooks/install.sh --remove # Remove hooks

set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORG_ROOT="$(dirname "$HOOKS_DIR")"

HOOK_NAMES=(pre-commit commit-msg)

remove=false
[[ "${1:-}" == "--remove" ]] && remove=true

for repo_dir in "$ORG_ROOT"/repos/*/; do
  [[ ! -d "$repo_dir/.git" ]] && continue

  repo_name="$(basename "$repo_dir")"
  git_hooks_dir="$repo_dir/.git/hooks"

  for hook in "${HOOK_NAMES[@]}"; do
    target="$git_hooks_dir/$hook"

    if $remove; then
      if [[ -L "$target" ]]; then
        rm "$target"
        echo "  ✗ $repo_name/$hook removed"
      fi
    else
      ln -sf "$HOOKS_DIR/$hook" "$target"
      echo "  ✓ $repo_name/$hook → hooks/$hook"
    fi
  done
done

echo ""
if $remove; then
  echo "Hooks removed."
else
  echo "Hooks installed."
fi
