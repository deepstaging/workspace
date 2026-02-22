#!/usr/bin/env bash
# Shared pack library — sourced by each repo's build/pack.sh.
#
# Provides:
#   pack_init             Parse common args, set up variables
#   pack_build            Build a solution
#   pack_solution         Pack all packable projects in a solution
#   pack_project          Pack a single project
#   pack_template         Pack a template project (no prior build needed)
#   pack_cleanup          Remove old .nupkg versions (keep last 3)
#   pack_update_versions  Generate/update Versions.props
#   pack_summary          Print a formatted summary
#
# Expected variables (set by caller before sourcing):
#   REPO_ROOT             Absolute path to the repo root
#
# Set after pack_init:
#   CONFIGURATION         Build configuration (default: Release)
#   VERSION_SUFFIX        Version suffix string
#   OUTPUT_DIR            Package output directory
#   UPDATE_VERSIONS       Whether to update committed Versions.props
#   ORG_ROOT              Workspace root

# Guard against double-sourcing
[[ -n "${_PACK_COMMON_LOADED:-}" ]] && return 0
_PACK_COMMON_LOADED=1

# ──────────────────────────────────────────────
# pack_init: Parse args and set defaults
# ──────────────────────────────────────────────
pack_init() {
  : "${REPO_ROOT:?REPO_ROOT must be set before sourcing pack-common.sh}"

  CONFIGURATION="Release"
  UPDATE_VERSIONS=false

  # Walk up to find workspace root
  if [[ -z "${DEEPSTAGING_ORG_ROOT:-}" ]]; then
    local _dir="$REPO_ROOT"
    while [[ "$_dir" != "/" ]]; do
      if [[ -f "$_dir/repos.conf" ]]; then
        DEEPSTAGING_ORG_ROOT="$_dir"
        break
      fi
      _dir="$(dirname "$_dir")"
    done
  fi
  ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-}"
  OUTPUT_DIR="${ORG_ROOT:+$ORG_ROOT/packages}"
  OUTPUT_DIR="${OUTPUT_DIR:-$REPO_ROOT/../../packages}"

  # Version suffix: local uses timestamp, CI uses git commit count
  if [[ -n "${CI:-}" ]]; then
    VERSION_SUFFIX="dev.$(git -C "$REPO_ROOT" rev-list --count HEAD)"
  else
    VERSION_SUFFIX="local.$(date -u +%Y%m%d%H%M%S)"
  fi

  while [[ $# -gt 0 ]]; do
    case $1 in
      -c|--configuration)    CONFIGURATION="$2"; shift 2 ;;
      --version-suffix)      VERSION_SUFFIX="$2"; shift 2 ;;
      --no-version-suffix)   VERSION_SUFFIX=""; shift ;;
      --update-versions)     UPDATE_VERSIONS=true; shift ;;
      --ci)
        VERSION_SUFFIX="dev.$(git -C "$REPO_ROOT" rev-list --count HEAD)"
        UPDATE_VERSIONS=true
        shift
        ;;
      -o|--output)           OUTPUT_DIR="$2"; shift 2 ;;
      -h|--help)             _pack_help; exit 0 ;;
      *)                     echo "Unknown option: $1"; exit 1 ;;
    esac
  done

  mkdir -p "$OUTPUT_DIR"
}

_pack_help() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -c, --configuration <config>  Build configuration (default: Release)"
  echo "  --version-suffix <suffix>     Version suffix (default: local.TIMESTAMP or dev.N in CI)"
  echo "  --no-version-suffix           Pack without version suffix (for release)"
  echo "  --update-versions             Update committed Versions.props (used by CI)"
  echo "  --ci                          Shorthand for dev.N suffix + --update-versions"
  echo "  -o, --output <dir>            Output directory"
  echo "  -h, --help                    Show this help message"
}

# ──────────────────────────────────────────────
# pack_build: Build a solution
#   Usage: pack_build <solution>
# ──────────────────────────────────────────────
pack_build() {
  local solution="$1"
  local name
  name="$(basename "${solution%.slnx}")"
  name="${name%.sln}"

  echo "Building $name ($CONFIGURATION)..."
  dotnet build "$solution" --configuration "$CONFIGURATION"
  echo ""
}

# ──────────────────────────────────────────────
# _build_pack_args: Internal helper to build dotnet pack args
# ──────────────────────────────────────────────
_build_pack_args() {
  local target="$1"
  local no_build="${2:-true}"
  local args=(
    "$target"
    --configuration "$CONFIGURATION"
    --output "$OUTPUT_DIR"
  )
  [[ "$no_build" == "true" ]] && args+=(--no-build)
  [[ -n "$VERSION_SUFFIX" ]] && args+=(--version-suffix "$VERSION_SUFFIX")
  echo "${args[@]}"
}

# ──────────────────────────────────────────────
# pack_solution: Pack all packable projects in a solution
#   Usage: pack_solution <solution>
# ──────────────────────────────────────────────
pack_solution() {
  local solution="$1"
  echo "Packing all packable projects..."
  dotnet pack $(_build_pack_args "$solution")
  echo ""
}

# ──────────────────────────────────────────────
# pack_project: Pack a single project
#   Usage: pack_project <csproj> [display_name]
# ──────────────────────────────────────────────
pack_project() {
  local project="$1"
  local name="${2:-$(basename "${project%.csproj}")}"
  echo "Packing $name..."
  dotnet pack $(_build_pack_args "$project")
}

# ──────────────────────────────────────────────
# pack_template: Pack a template project (no prior build needed)
#   Usage: pack_template <csproj> [display_name]
# ──────────────────────────────────────────────
pack_template() {
  local project="$1"
  local name="${2:-$(basename "${project%.csproj}")}"
  echo "Packing $name (template)..."
  dotnet pack $(_build_pack_args "$project" "false")
}

# ──────────────────────────────────────────────
# pack_cleanup: Remove old package versions (keep last 3 per package)
# ──────────────────────────────────────────────
pack_cleanup() {
  for prefix in $(ls "$OUTPUT_DIR"/*.nupkg 2>/dev/null | xargs -n1 basename | sed 's/\.[0-9][0-9]*\..*//' | sort -u); do
    ls -t "$OUTPUT_DIR/$prefix".[0-9]*.nupkg 2>/dev/null | tail -n +4 | xargs rm -f
  done
}

# ──────────────────────────────────────────────
# pack_update_versions: Generate Versions.props files
#   Usage: pack_update_versions <product_prefix> <version_var> <package_entries>
#
#   product_prefix:  e.g. "Deepstaging.Roslyn"
#   version_var:     e.g. "DeepstagingRoslynVersion"
#   package_entries:  newline-separated PackageVersion Include strings
#                     (empty string to skip ItemGroup generation)
#
# Sets: PACK_VERSION, VERSIONS_TARGET
# ──────────────────────────────────────────────
pack_update_versions() {
  local product_prefix="$1"
  local version_var="$2"
  local package_entries="${3:-}"

  PACK_VERSION=""
  VERSIONS_TARGET=""

  local versions_file="$REPO_ROOT/$product_prefix.Versions.props"
  local versions_local_file="$REPO_ROOT/$product_prefix.Versions.local.props"

  # Extract version from a generated .nupkg filename
  local nupkg
  nupkg=$(ls "$OUTPUT_DIR"/$product_prefix.[0-9]*.nupkg 2>/dev/null | tail -1 || true)
  [[ -z "$nupkg" ]] && return

  PACK_VERSION=$(basename "$nupkg" | sed "s/^${product_prefix}\.\(.*\)\.nupkg$/\1/")

  if [[ "$UPDATE_VERSIONS" == "true" ]]; then
    VERSIONS_TARGET="$versions_file"

    local item_group=""
    if [[ -n "$package_entries" ]]; then
      item_group="  <ItemGroup>
$(echo "$package_entries" | while IFS= read -r pkg; do
  [[ -z "$pkg" ]] && continue
  echo "    <PackageVersion Include=\"$pkg\" Version=\"\$(${version_var})\" />"
done)
  </ItemGroup>"
    fi

    cat > "$versions_file" << EOF
<!-- Auto-generated by pack.sh -->
<Project>
  <PropertyGroup>
    <${version_var}>$PACK_VERSION</${version_var}>
  </PropertyGroup>
${item_group}
</Project>
EOF
  else
    VERSIONS_TARGET="$versions_local_file"

    cat > "$versions_local_file" << EOF
<!-- Generated by pack.sh — local development override (gitignored) -->
<Project>
  <PropertyGroup>
    <${version_var}>$PACK_VERSION</${version_var}>
  </PropertyGroup>
</Project>
EOF
  fi
}

# ──────────────────────────────────────────────
# pack_summary: Print a formatted pack summary
#   Usage: pack_summary <product_name>
# ──────────────────────────────────────────────
pack_summary() {
  local product_name="$1"

  local BOLD="\033[1m" DIM="\033[2m" CYAN="\033[36m" RED="\033[31m" RESET="\033[0m"

  echo ""
  echo -e "${BOLD}${product_name} Pack Summary${RESET}"
  echo ""

  if [[ -n "${PACK_VERSION:-}" ]]; then
    local display_output
    display_output=$(cd "$OUTPUT_DIR" 2>/dev/null && pwd -P || echo "$OUTPUT_DIR")
    [[ -n "${ORG_ROOT:-}" ]] && display_output="${display_output/#$ORG_ROOT\//}"

    echo -e "  ${DIM}Version${RESET}   ${CYAN}${PACK_VERSION}${RESET}"
    echo -e "  ${DIM}Config${RESET}    ${CONFIGURATION}"
    echo -e "  ${DIM}Output${RESET}    ${display_output}"
    [[ -n "${VERSIONS_TARGET:-}" ]] && echo -e "  ${DIM}Versions${RESET}  $(basename "$VERSIONS_TARGET")"
  else
    echo -e "  ${RED}Could not determine package version${RESET}"
  fi

  local -a packages
  mapfile -t packages < <(ls "$OUTPUT_DIR"/*."${PACK_VERSION:-NONE}".nupkg 2>/dev/null | xargs -n1 basename | sed "s/\.${PACK_VERSION:-NONE}\.nupkg//")
  if [[ ${#packages[@]} -gt 0 ]]; then
    echo ""
    echo -e "  ${DIM}Packages${RESET}"
    for pkg in "${packages[@]}"; do
      echo "    $pkg"
    done
  fi
  echo ""
}
