#!/usr/bin/env bash
# Sync package icons from the local assets repo into each project repo.
# Builds icons if the .icons-built marker is missing or stale.
#
# Usage:
#   sync-icons.sh              # Build (if needed) and copy icons
#   sync-icons.sh --check      # Verify icons exist (no build)
#   sync-icons.sh --force      # Force rebuild

set -euo pipefail

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ASSETS_DIR="$ORG_ROOT/repos/assets"
ICONS_DIST="$ASSETS_DIR/dist/icons"
MARKER="$ASSETS_DIR/.icons-built"

# Icon name → repo-relative destination
# Format: PackageName:repo/path/to/project
ICON_MAP=(
  "Deepstaging.Roslyn:roslyn/src/Deepstaging.Roslyn"
  "Deepstaging.Roslyn.LanguageExt:roslyn/src/Deepstaging.Roslyn.LanguageExt"
  "Deepstaging.Roslyn.Testing:roslyn/src/Deepstaging.Roslyn.Testing"
  "Deepstaging.Roslyn.TypeScript:roslyn/src/Deepstaging.Roslyn.TypeScript"
  "Deepstaging.Roslyn.TypeScript.Testing:roslyn/src/Deepstaging.Roslyn.TypeScript.Testing"
  "Deepstaging.Templates:roslyn/templates"
  "Deepstaging:deepstaging/src/Deepstaging"
  "Deepstaging.Testing:deepstaging/src/Deepstaging.Testing"
  "Deepstaging.Web:deepstaging-web/src/Deepstaging.Web"
)

CHECK_ONLY=false
FORCE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK_ONLY=true; shift ;;
    --force) FORCE=true; shift ;;
    *)       echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Build icons if needed
if [[ "$CHECK_ONLY" == false ]]; then
  if [[ ! -d "$ASSETS_DIR" ]]; then
    echo "ERROR: assets repo not found at $ASSETS_DIR"
    echo "Run init.sh to clone it, or set DEEPSTAGING_ORG_ROOT."
    exit 1
  fi

  needs_build=false
  if $FORCE || [[ ! -f "$MARKER" ]]; then
    needs_build=true
  elif [[ -n "$(find "$ASSETS_DIR/icons" -newer "$MARKER" 2>/dev/null)" ]]; then
    needs_build=true
  fi

  if $needs_build; then
    echo "Building icons in assets repo..."
    (cd "$ASSETS_DIR" && ./build.sh)
    touch "$MARKER"
    echo ""
  fi
fi

FAILED=0

for entry in "${ICON_MAP[@]}"; do
  name="${entry%%:*}"
  rel_dir="${entry#*:}"
  dest="$ORG_ROOT/repos/$rel_dir/icon.png"
  src="$ICONS_DIST/${name}.png"

  if [[ "$CHECK_ONLY" == true ]]; then
    if [[ ! -f "$dest" ]]; then
      echo "  ❌ $rel_dir/icon.png"
      FAILED=1
    else
      echo "  ✅ $rel_dir/icon.png"
    fi
  else
    if [[ ! -f "$src" ]]; then
      echo "  ❌ $name.png not in assets/dist/icons/"
      FAILED=1
    else
      cp "$src" "$dest"
      echo "  ✅ $rel_dir/icon.png"
    fi
  fi
done

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Some icons are missing. Ensure assets repo is cloned and icons are built."
  exit 1
fi

echo ""
echo "All icons synced."
