#!/usr/bin/env bash
# Clone all Deepstaging repositories into repos/.
#
# Usage:
#   ./init.sh          # Clone via SSH (default)
#   ./init.sh --https  # Clone via HTTPS

set -euo pipefail

ORG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$ORG_ROOT/repos"
REPOS_CONF="$ORG_ROOT/repos.conf"
GITHUB_ORG="deepstaging"
USE_SSH=true

[[ "${1:-}" == "--https" ]] && USE_SSH=false

if [[ ! -f "$REPOS_CONF" ]]; then
  echo "❌ $REPOS_CONF not found"
  exit 1
fi

mapfile -t REPOS < <(grep -v '^\s*#' "$REPOS_CONF" | grep -v '^\s*$')

repo_url() {
  local name="$1"
  if $USE_SSH; then
    echo "git@github.com:$GITHUB_ORG/$name.git"
  else
    echo "https://github.com/$GITHUB_ORG/$name.git"
  fi
}

mkdir -p "$REPOS_DIR"

for repo in "${REPOS[@]}"; do
  target="$REPOS_DIR/$repo"
  if [[ -d "$target/.git" ]]; then
    echo "  ✓ $repo (already cloned)"
  else
    echo "  ⬇ Cloning $repo..."
    git clone "$(repo_url "$repo")" "$target"
  fi
done

echo ""
echo "✅ All repositories cloned to $REPOS_DIR"
