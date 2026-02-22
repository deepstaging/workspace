#!/bin/bash
# Deepstaging workspace bootstrap.
#
# Run once after cloning the workspace to set up your dev environment:
#   ./bootstrap.sh
#
# What it does:
#   1. Installs Homebrew dependencies (Brewfile)
#   2. Creates local NuGet feed directory
#   3. Installs git hooks into sibling repos
#   4. Validates the environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORG_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Deepstaging Workspace Bootstrap"
echo "═══════════════════════════════════════════"
echo ""

# 1. Brew
if command -v brew &>/dev/null; then
  echo "📦 Installing Homebrew dependencies..."
  brew bundle --file="$SCRIPT_DIR/Brewfile" --no-lock --quiet
  echo ""
else
  echo "⚠️  Homebrew not found — install manually: https://brew.sh"
  echo "   Then re-run this script."
  exit 1
fi

# 2. Local NuGet feed
FEED="$ORG_ROOT/packages"
if [[ ! -d "$FEED" ]]; then
  echo "📁 Creating local NuGet feed at $FEED"
  mkdir -p "$FEED"
fi

# 3. direnv
if command -v direnv &>/dev/null; then
  echo "🔧 Setting up direnv..."
  if [[ ! -f "$ORG_ROOT/.envrc" ]]; then
    ln -sf workspace/.envrc "$ORG_ROOT/.envrc"
    echo "   Symlinked .envrc → workspace/.envrc"
  fi
  (cd "$ORG_ROOT" && direnv allow .)
fi

# 4. Git hooks
echo ""
echo "🪝 Installing git hooks..."
"$SCRIPT_DIR/hooks/install.sh"

# 5. Validate
echo ""
echo "🔍 Checking environment..."
"$SCRIPT_DIR/scripts/check-env.sh" || true

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Bootstrap complete"
echo "═══════════════════════════════════════════"
echo ""
echo "If using direnv, run: direnv allow"
echo "Then: check-env.sh"
