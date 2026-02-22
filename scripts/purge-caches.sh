#!/usr/bin/env bash
# Remove bin/ and obj/ directories from all repositories.
#
# Usage:
#   purge-caches.sh          # Dry run (list what would be deleted)
#   purge-caches.sh --force  # Actually delete

set -euo pipefail

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

DIRS=$(find "$ORG_ROOT/repos" -maxdepth 4 \
  \( -name bin -o -name obj \) \
  -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  2>/dev/null | sort)

if [[ -z "$DIRS" ]]; then
  echo "Nothing to purge."
  exit 0
fi

COUNT=$(echo "$DIRS" | wc -l | tr -d ' ')

if $FORCE; then
  echo "$DIRS" | xargs rm -rf
  echo "🗑  Purged $COUNT directories."
else
  echo "$DIRS" | sed "s|$ORG_ROOT/||"
  echo ""
  echo "Found $COUNT directories. Run with --force to delete."
fi
