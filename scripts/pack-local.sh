#!/bin/bash
# Pack NuGet packages and publish to the local feed.
#
# Dependency graph:
#   roslyn → deepstaging → deepstaging-web
#
# Usage:
#   pack-local.sh                           # Pack all
#   pack-local.sh --version-suffix dev.42   # Custom suffix
#   pack-local.sh --skip web                # Skip deepstaging-web

set -euo pipefail

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
FEED="${DEEPSTAGING_LOCAL_NUGET_FEED:-$ORG_ROOT/packages}"
SKIP=()
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip) SKIP+=("$2"); shift 2 ;;
    *)      EXTRA_ARGS+=("$1"); shift ;;
  esac
done

mkdir -p "$FEED"

should_skip() {
  for s in "${SKIP[@]+"${SKIP[@]}"}"; do
    [[ "$s" == "$1" ]] && return 0
  done
  return 1
}

pack_repo() {
  local name="$1"
  local dir="$2"

  if should_skip "$name"; then
    echo "⏭  Skipping $name"
    return
  fi

  if [[ ! -f "$dir/build/pack.sh" ]]; then
    echo "⚠️  $dir/build/pack.sh not found, skipping"
    return
  fi

  echo "═══════════════════════════════════════════"
  echo "  Packing $name"
  echo "═══════════════════════════════════════════"
  "$dir/build/pack.sh" "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
  echo ""
}

pack_repo "roslyn"      "$ORG_ROOT/roslyn"
pack_repo "deepstaging" "$ORG_ROOT/deepstaging"
pack_repo "web"         "$ORG_ROOT/deepstaging-web"

echo "✅ All packages published to $FEED"
