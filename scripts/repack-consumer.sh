#!/usr/bin/env bash
# Pack Deepstaging packages and clean-rebuild a consumer project.
#
# Reads consumers.conf to resolve which repos to pack based on declared
# dependencies. Supports an interactive menu with MRU ordering.
#
# Usage:
#   repack-consumer.sh                    # Interactive menu
#   repack-consumer.sh SharedNotes        # By name (basename match)
#   repack-consumer.sh --list             # List registered consumers
#   repack-consumer.sh --pack-only        # Pack deps without rebuilding
#   repack-consumer.sh --no-pack          # Skip packing, just clean + rebuild
#   repack-consumer.sh --purge            # Also remove bin/obj (full clean)

set -euo pipefail

ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CONSUMERS_CONF="$ORG_ROOT/consumers.conf"
MRU_FILE="${XDG_STATE_HOME:-$HOME/.local/state}/deepstaging/repack-mru"

PACK_ONLY=false
NO_PACK=false
LIST_ONLY=false
PURGE=false
TARGET=""

# ── Dependency graph ───────────────────────────
# Each repo and its direct dependencies (transitive closure computed at runtime).
declare -A REPO_DEPS
REPO_DEPS[roslyn]=""
REPO_DEPS[deepstaging]="roslyn"
REPO_DEPS[deepstaging-web]="deepstaging"

# Topological order (used to sort the pack list)
TOPO_ORDER=(roslyn deepstaging deepstaging-web)

# ── Arg parsing ────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pack-only) PACK_ONLY=true; shift ;;
    --no-pack)   NO_PACK=true; shift ;;
    --purge)     PURGE=true; shift ;;
    --list)      LIST_ONLY=true; shift ;;
    -*)          echo "Unknown flag: $1" >&2; exit 1 ;;
    *)           TARGET="$1"; shift ;;
  esac
done

# ── Helpers ────────────────────────────────────
expand_path() {
  echo "${1/#\~/$HOME}"
}

# Compute transitive dependencies for a set of direct deps
resolve_transitive() {
  local -A needed=()
  local queue=("$@")

  while [[ ${#queue[@]} -gt 0 ]]; do
    local repo="${queue[0]}"
    queue=("${queue[@]:1}")

    [[ -n "${needed[$repo]:-}" ]] && continue
    needed[$repo]=1

    for dep in ${REPO_DEPS[$repo]:-}; do
      [[ -z "${needed[$dep]:-}" ]] && queue+=("$dep")
    done
  done

  # Return in topological order
  for repo in "${TOPO_ORDER[@]}"; do
    [[ -n "${needed[$repo]:-}" ]] && echo "$repo"
  done
}

# ── Parse consumers.conf ──────────────────────
declare -a CONSUMER_NAMES=()
declare -A CONSUMER_PATHS=()
declare -A CONSUMER_DEPS=()

parse_consumers() {
  if [[ ! -f "$CONSUMERS_CONF" ]]; then
    echo "❌ $CONSUMERS_CONF not found" >&2
    exit 1
  fi

  while IFS= read -r line; do
    # Skip blanks and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    read -r path deps_rest <<< "$line"
    path="$(expand_path "$path")"
    local name
    name="$(basename "$path")"

    CONSUMER_NAMES+=("$name")
    CONSUMER_PATHS[$name]="$path"
    CONSUMER_DEPS[$name]="$deps_rest"
  done < "$CONSUMERS_CONF"
}

# ── MRU ────────────────────────────────────────
load_mru() {
  [[ -f "$MRU_FILE" ]] && cat "$MRU_FILE" || true
}

save_mru() {
  local selected="$1"
  mkdir -p "$(dirname "$MRU_FILE")"

  # Put selected first, deduplicate, keep max 10
  {
    echo "$selected"
    [[ -f "$MRU_FILE" ]] && grep -v "^${selected}$" "$MRU_FILE" || true
  } | head -10 > "${MRU_FILE}.tmp"
  mv "${MRU_FILE}.tmp" "$MRU_FILE"
}

order_by_mru() {
  local -a mru_list=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && mru_list+=("$line")
  done <<< "$(load_mru)"

  local -a ordered=()
  local -A seen=()

  # MRU items first (if they exist in consumers)
  for m in "${mru_list[@]+"${mru_list[@]}"}"; do
    for name in "${CONSUMER_NAMES[@]}"; do
      if [[ "$name" == "$m" && -z "${seen[$name]:-}" ]]; then
        ordered+=("$name")
        seen[$name]=1
      fi
    done
  done

  # Remaining consumers
  for name in "${CONSUMER_NAMES[@]}"; do
    [[ -z "${seen[$name]:-}" ]] && ordered+=("$name")
  done

  printf '%s\n' "${ordered[@]}"
}

# ── Interactive menu ───────────────────────────
select_consumer() {
  local -a ordered=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && ordered+=("$line")
  done <<< "$(order_by_mru)"

  if [[ ${#ordered[@]} -eq 0 ]]; then
    echo "No consumers registered in $CONSUMERS_CONF" >&2
    exit 1
  fi

  if [[ ${#ordered[@]} -eq 1 ]]; then
    echo "${ordered[0]}"
    return
  fi

  echo "" >&2
  echo "Select consumer project:" >&2
  echo "" >&2
  local i=1
  for name in "${ordered[@]}"; do
    local deps="${CONSUMER_DEPS[$name]}"
    local path="${CONSUMER_PATHS[$name]}"
    printf "  %d) %-20s  deps: %-30s  %s\n" "$i" "$name" "$deps" "$path" >&2
    ((i++))
  done
  echo "" >&2

  local choice
  read -rp "Enter number [1]: " choice
  choice="${choice:-1}"

  if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#ordered[@]} )); then
    echo "Invalid selection" >&2
    exit 1
  fi

  echo "${ordered[$((choice - 1))]}"
}

# ── Pack ───────────────────────────────────────
pack_deps() {
  local name="$1"
  local -a repos_to_pack=()

  while IFS= read -r repo; do
    [[ -n "$repo" ]] && repos_to_pack+=("$repo")
  done <<< "$(resolve_transitive ${CONSUMER_DEPS[$name]})"

  if [[ ${#repos_to_pack[@]} -eq 0 ]]; then
    echo "⚠️  No Deepstaging deps declared for $name"
    return
  fi

  echo "📦 Packing: ${repos_to_pack[*]}"
  echo ""

  # Build --skip args for repos NOT in the pack list
  local -a skip_args=()
  for repo in "${TOPO_ORDER[@]}"; do
    local found=false
    for needed in "${repos_to_pack[@]}"; do
      [[ "$repo" == "$needed" ]] && found=true && break
    done
    if ! $found; then
      # Map repo name to pack-local.sh's skip key
      local skip_key="$repo"
      [[ "$repo" == "deepstaging-web" ]] && skip_key="web"
      skip_args+=(--skip "$skip_key")
    fi
  done

  "$ORG_ROOT/scripts/pack-local.sh" "${skip_args[@]+"${skip_args[@]}"}"
}

# ── Clean consumer ─────────────────────────────
clean_consumer() {
  local path="$1"

  echo "═══════════════════════════════════════════"
  echo "  Cleaning $(basename "$path")"
  echo "═══════════════════════════════════════════"

  # Clear NuGet http-cache for Deepstaging packages so restore fetches fresh
  local http_cache
  http_cache="$(dotnet nuget locals http-cache --list 2>/dev/null | sed 's/.*: //')"
  if [[ -d "$http_cache" ]]; then
    find "$http_cache" -maxdepth 2 -iname '*deepstaging*' -exec rm -rf {} + 2>/dev/null || true
    echo "  Cleared Deepstaging entries from NuGet http-cache"
  fi

  if $PURGE; then
    find "$path" -maxdepth 4 \
      \( -name bin -o -name obj \) \
      -type d \
      -not -path '*/node_modules/*' \
      -not -path '*/.git/*' \
      -exec rm -rf {} + 2>/dev/null || true
    echo "  Purged bin/ and obj/ directories"
  fi

  echo ""
}

# ── Build consumer ─────────────────────────────
build_consumer() {
  local path="$1"
  local name
  name="$(basename "$path")"

  echo "═══════════════════════════════════════════"
  echo "  Restoring & building $name"
  echo "═══════════════════════════════════════════"
  (cd "$path" && dotnet restore --force && dotnet build -c Release)
  echo ""
}

# ── Main ───────────────────────────────────────
parse_consumers

if $LIST_ONLY; then
  for name in "${CONSUMER_NAMES[@]}"; do
    deps="${CONSUMER_DEPS[$name]}"
    resolved="$(resolve_transitive $deps)"
    printf "%-20s  deps: %-20s  packs: %s\n" "$name" "$deps" "$(echo "$resolved" | tr '\n' ' ')"
  done
  exit 0
fi

# Resolve target
SELECTED=""
if [[ -n "$TARGET" ]]; then
  for name in "${CONSUMER_NAMES[@]}"; do
    [[ "$name" == "$TARGET" ]] && SELECTED="$name" && break
  done
  if [[ -z "$SELECTED" ]]; then
    echo "❌ Unknown consumer: $TARGET" >&2
    echo "   Registered: ${CONSUMER_NAMES[*]}" >&2
    exit 1
  fi
else
  SELECTED="$(select_consumer)"
fi

SELECTED_PATH="${CONSUMER_PATHS[$SELECTED]}"
save_mru "$SELECTED"

echo ""
echo "🎯 Target: $SELECTED ($SELECTED_PATH)"
echo "   Deps:   ${CONSUMER_DEPS[$SELECTED]}"
echo ""

if ! $NO_PACK; then
  pack_deps "$SELECTED"
fi

if ! $PACK_ONLY; then
  clean_consumer "$SELECTED_PATH"
  build_consumer "$SELECTED_PATH"
fi

echo "✅ $SELECTED rebuilt with latest Deepstaging packages"
