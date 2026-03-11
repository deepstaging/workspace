#!/usr/bin/env bash
# Sync package icons from the local assets repo into each packable project.
# Auto-discovers IsPackable=true projects from roslyn and deepstaging repos.
# Projects without a matching icon in dist/ get a fallback (base icon) + warning.
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
    (cd "$ASSETS_DIR" && ./build.sh --icons-only)
    touch "$MARKER"
    echo ""
  fi
fi

# Auto-discover all IsPackable=true projects
discover_packable() {
  local repo_name="$1"
  local repo_dir="$ORG_ROOT/repos/$repo_name"
  [[ -d "$repo_dir" ]] || return

  while IFS= read -r csproj; do
    if grep -q '<IsPackable>true</IsPackable>' "$csproj" 2>/dev/null; then
      local proj_dir
      proj_dir="$(dirname "$csproj")"
      local rel_path="${proj_dir#"$ORG_ROOT/repos/"}"
      local pkg_name
      pkg_name="$(basename "${csproj%.csproj}")"
      echo "${pkg_name}:${rel_path}"
    fi
  done < <(find "$repo_dir" -name '*.csproj' -not -path '*/bin/*' -not -path '*/obj/*')
}

PROJECTS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && PROJECTS+=("$line")
done < <(discover_packable roslyn; discover_packable deepstaging)

if [[ ${#PROJECTS[@]} -eq 0 ]]; then
  echo "No packable projects found."
  exit 0
fi

FAILED=0
WARNINGS=0

# Determine fallback icon (base icon with no badge)
FALLBACK="$ICONS_DIST/Deepstaging.png"

for entry in "${PROJECTS[@]}"; do
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
    if [[ -f "$src" ]]; then
      cp "$src" "$dest"
      echo "  ✅ $rel_dir/icon.png"
    elif [[ -f "$FALLBACK" ]]; then
      cp "$FALLBACK" "$dest"
      echo "  ⚠️  $rel_dir/icon.png (fallback — no icon for $name in manifest.txt)"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  ❌ $name.png not in assets/dist/icons/ and no fallback available"
      FAILED=1
    fi
  fi
done

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Some icons are missing. Ensure assets repo is cloned and icons are built."
  exit 1
fi

echo ""
if [[ $WARNINGS -gt 0 ]]; then
  echo "All icons synced ($WARNINGS using fallback — add to assets/icons/manifest.txt for custom icons)."
else
  echo "All icons synced."
fi
