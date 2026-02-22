#!/usr/bin/env bash
# Deepstaging workspace bootstrap.
#
# Run once after cloning the workspace to set up your dev environment:
#   ./bootstrap.sh
#
# What it does:
#   1. Installs Homebrew dependencies (Brewfile)
#   2. Clones repositories (if not already present)
#   3. Creates local NuGet feed directory
#   4. Installs git hooks into cloned repos
#   5. Validates the environment

set -euo pipefail

ORG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Deepstaging Workspace Bootstrap"
echo "═══════════════════════════════════════════"
echo ""

# 1. Brew
if command -v brew &>/dev/null; then
  echo "📦 Installing Homebrew dependencies..."
  brew bundle --file="$ORG_ROOT/Brewfile" --no-lock --quiet
  echo ""
else
  echo "⚠️  Homebrew not found — install manually: https://brew.sh"
  echo "   Then re-run this script."
  exit 1
fi

# 2. Clone repos
echo "📂 Cloning repositories..."
"$ORG_ROOT/init.sh"
echo ""

# 3. Local NuGet feed
FEED="$ORG_ROOT/packages"
if [[ ! -d "$FEED" ]]; then
  echo "📁 Creating local NuGet feed at $FEED"
  mkdir -p "$FEED"
fi

# 4. direnv
if command -v direnv &>/dev/null; then
  echo "🔧 Setting up direnv..."
  (cd "$ORG_ROOT" && direnv allow .)
fi

# 5. Git hooks
echo ""
echo "🪝 Installing git hooks..."
"$ORG_ROOT/hooks/install.sh"

# 6. Validate
echo ""
echo "🔍 Checking environment..."
"$ORG_ROOT/scripts/check-env.sh" || true

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Bootstrap complete"
echo "═══════════════════════════════════════════"
echo ""
echo "If using direnv, run: direnv allow"
echo "Then: check-env.sh"
