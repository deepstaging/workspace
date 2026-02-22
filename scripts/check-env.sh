#!/bin/bash
# Validate that all required tools are installed and workspace is configured.

set -euo pipefail

PASS=0
FAIL=0

inc_pass() { PASS=$((PASS + 1)); }
inc_fail() { FAIL=$((FAIL + 1)); }

check() {
  local name="$1"
  local cmd="$2"

  if command -v "$cmd" &>/dev/null; then
    local ver
    ver=$("$cmd" --version 2>&1 | head -1)
    printf "  ✅ %-12s %s\n" "$name" "$ver"
    inc_pass
  else
    printf "  ❌ %-12s not found\n" "$name"
    inc_fail
  fi
}

echo "Tools"
echo "─────────────────────────────────────"
check "dotnet"    dotnet
check "node"      node
check "git"       git
check "gh"        gh
check "direnv"    direnv
check "jq"        jq
check "rg"        rg
check "d2"        d2

echo ""
echo "Environment"
echo "─────────────────────────────────────"

check_env() {
  local name="$1"
  local val="${!name:-}"
  if [[ -n "$val" ]]; then
    printf "  ✅ %-30s %s\n" "$name" "$val"
    inc_pass
  else
    printf "  ❌ %-30s not set\n" "$name"
    inc_fail
  fi
}

check_env DEEPSTAGING_ORG_ROOT
check_env DEEPSTAGING_WORKSPACE_DIR
check_env DEEPSTAGING_LOCAL_NUGET_FEED

echo ""
echo "Repositories"
echo "─────────────────────────────────────"

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
for repo in roslyn deepstaging deepstaging-web assets .github; do
  if [[ -d "$ORG_ROOT/$repo/.git" ]]; then
    branch=$(cd "$ORG_ROOT/$repo" && git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
    printf "  ✅ %-20s (%s)\n" "$repo" "$branch"
    inc_pass
  else
    printf "  ❌ %-20s not cloned\n" "$repo"
    inc_fail
  fi
done

echo ""
echo "Local NuGet Feed"
echo "─────────────────────────────────────"
FEED="${DEEPSTAGING_LOCAL_NUGET_FEED:-$ORG_ROOT/packages}"
if [[ -d "$FEED" ]]; then
  pkg_count=$(find "$FEED" -name '*.nupkg' 2>/dev/null | wc -l | tr -d ' ')
  printf "  ✅ %-30s (%s packages)\n" "$FEED" "$pkg_count"
  inc_pass
else
  printf "  ⚠️  %-30s (not created yet — run pack-local.sh)\n" "$FEED"
fi

echo ""
echo "─────────────────────────────────────"
echo "  $PASS passed, $FAIL failed"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
