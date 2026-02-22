#!/usr/bin/env bash
# Cascading build across all repositories in dependency order.
#
# Dependency graph:
#   roslyn → deepstaging → deepstaging-web
#
# Usage:
#   build-all.sh              # Build all (Release)
#   build-all.sh --test       # Build + test all
#   build-all.sh --skip web   # Skip deepstaging-web

set -euo pipefail

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CONFIG="Release"
RUN_TESTS=false
SKIP=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --test)    RUN_TESTS=true; shift ;;
    --debug)   CONFIG="Debug"; shift ;;
    --skip)    SKIP+=("$2"); shift 2 ;;
    *)         echo "Unknown arg: $1"; exit 1 ;;
  esac
done

should_skip() {
  local name="$1"
  for s in "${SKIP[@]+"${SKIP[@]}"}"; do
    [[ "$s" == "$name" ]] && return 0
  done
  return 1
}

build_repo() {
  local name="$1"
  local dir="$2"
  local test_project="${3:-}"

  if should_skip "$name"; then
    echo "⏭  Skipping $name"
    return
  fi

  if [[ ! -d "$dir" ]]; then
    echo "⚠️  $dir not found, skipping"
    return
  fi

  echo "═══════════════════════════════════════════"
  echo "  Building $name ($CONFIG)"
  echo "═══════════════════════════════════════════"
  (cd "$dir" && dotnet build -c "$CONFIG" --no-incremental)

  if $RUN_TESTS && [[ -n "$test_project" ]]; then
    echo "  Running tests..."
    (cd "$dir" && dotnet run --project "$test_project" -c "$CONFIG" --no-build)
  fi

  echo ""
}

build_repo "roslyn" \
  "$ORG_ROOT/repos/roslyn" \
  "src/Deepstaging.Roslyn.Tests"

build_repo "deepstaging" \
  "$ORG_ROOT/repos/deepstaging" \
  "src/Deepstaging.Tests"

build_repo "web" \
  "$ORG_ROOT/repos/deepstaging-web" \
  "src/Deepstaging.Web.Tests"

echo "✅ All builds complete."
