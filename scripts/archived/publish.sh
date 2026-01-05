#!/bin/bash
set -e

# Smart publish script with auto-discovery of package dependencies
# Discovers package info, builds, publishes, and optionally restores dependents
#
# Usage:
#   ./scripts/publish.sh <repo-name> [--restore-deps]
#
# Examples:
#   ./scripts/publish.sh deepstaging
#   ./scripts/publish.sh effects --restore-deps
#   ./scripts/publish.sh my-new-feature --restore-deps

# Use environment variables if available (from .envrc), otherwise calculate
ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WORKSPACE_DIR="${DEEPSTAGING_WORKSPACE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCAL_NUGET_FEED="${DEEPSTAGING_LOCAL_NUGET_FEED:-$HOME/.nuget/local-feed}"
RESTORE_DEPS=false
SCRIPT_NAME=$(basename "$0")

show_help() {
    cat << EOF
Usage: $SCRIPT_NAME <repo-name> [OPTIONS]

Build and publish a repository's packages to local NuGet feed.

ARGUMENTS:
    repo-name           Name of the repository to publish (e.g., deepstaging, effects)

OPTIONS:
    --restore-deps     Restore packages in dependent repositories after publishing
    --help, -h         Show this help message

DESCRIPTION:
    This script:
    - Discovers .csproj files in the repository
    - Builds and packs them to the local NuGet feed (~/.nuget/local-feed)
    - Optionally discovers and restores dependent repositories

LOCAL NUGET FEED:
    $LOCAL_NUGET_FEED

EXAMPLES:
    $SCRIPT_NAME deepstaging                  # Build and publish Deepstaging
    $SCRIPT_NAME effects --restore-deps       # Publish and restore dependents
    $SCRIPT_NAME my-new-feature --restore-deps

EOF
}

# Parse arguments
if [ $# -lt 1 ]; then
    show_help
    exit 1
fi

if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

REPO_NAME="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        --restore-deps)
            RESTORE_DEPS=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Try '$SCRIPT_NAME --help' for more information."
            exit 1
            ;;
    esac
done

# Discover repository
REPO_DIR="$ORG_ROOT/$REPO_NAME"

if [ ! -d "$REPO_DIR" ]; then
    echo "❌ Repository not found: $REPO_DIR"
    exit 1
fi

# Find solution file(s) - check root first, then packages/ subdirectory
cd "$REPO_DIR"
SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))

# Special case: Deepstaging has solutions in packages/ subdirectory
if [ ${#SOLUTION_FILES[@]} -eq 0 ] && [ -d "packages" ]; then
    cd "packages"
    SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))
    if [ ${#SOLUTION_FILES[@]} -gt 0 ]; then
        REPO_DIR="$REPO_DIR/packages"
    fi
fi

if [ ${#SOLUTION_FILES[@]} -eq 0 ]; then
    echo "❌ No solution files found in $REPO_DIR"
    exit 1
fi

# Prefer solution named after the repo
SOLUTION_FILE=""
REPO_NAME_NORMALIZED=$(echo "$REPO_NAME" | sed 's/deepstaging/Deepstaging/g')
for SOL in "${SOLUTION_FILES[@]}"; do
    if [[ "$SOL" == "$REPO_NAME_NORMALIZED.slnx" ]] || [[ "$SOL" == "$REPO_NAME_NORMALIZED.sln" ]]; then
        SOLUTION_FILE="$SOL"
        break
    fi
done

# Fallback to first solution if no match
if [ -z "$SOLUTION_FILE" ]; then
    SOLUTION_FILE="${SOLUTION_FILES[0]}"
fi

# Discover main package name by looking for <PackageId> in csproj files
# or use the solution name
PACKAGE_NAMES=()
for CSPROJ in $(find . -name "*.csproj" -type f | grep -v "\.Tests\.csproj$" | head -10); do
    PACKAGE_ID=$(grep -o '<PackageId>[^<]*</PackageId>' "$CSPROJ" 2>/dev/null | sed 's/<[^>]*>//g' || true)
    if [ -n "$PACKAGE_ID" ]; then
        PACKAGE_NAMES+=("$PACKAGE_ID")
    fi
done

# Fallback to solution name if no PackageId found
if [ ${#PACKAGE_NAMES[@]} -eq 0 ]; then
    SOLUTION_BASE=$(basename "$SOLUTION_FILE" .slnx)
    SOLUTION_BASE=$(basename "$SOLUTION_BASE" .sln)
    PACKAGE_NAMES=("$SOLUTION_BASE")
fi

echo "🚀 Publishing: $REPO_NAME"
echo "=================================================="
echo "📁 Repository: $REPO_DIR"
echo "📄 Solution: $SOLUTION_FILE"
echo "📦 Package(s): ${PACKAGE_NAMES[*]}"
echo ""

# Create local NuGet feed directory
echo "📁 Ensuring local NuGet feed exists: $LOCAL_NUGET_FEED"
mkdir -p "$LOCAL_NUGET_FEED"

# Add local NuGet source if not already present
if ! dotnet nuget list source | grep -q "LocalFeed"; then
    echo "➕ Adding LocalFeed source..."
    dotnet nuget add source "$LOCAL_NUGET_FEED" --name LocalFeed
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
dotnet clean "$SOLUTION_FILE" --configuration Release --verbosity quiet 2>/dev/null || true

# Build
echo "🔨 Building $REPO_NAME..."
dotnet build "$SOLUTION_FILE" --configuration Release

# Pack
echo "📦 Packing $REPO_NAME..."
dotnet pack "$SOLUTION_FILE" \
    --configuration Release \
    --output "$LOCAL_NUGET_FEED" \
    --no-build

# List what was published
echo ""
echo "✅ Published packages:"
echo "=================================================="
for PACKAGE_NAME in "${PACKAGE_NAMES[@]}"; do
    LATEST_PKG=$(ls -t "$LOCAL_NUGET_FEED/$PACKAGE_NAME".*.nupkg 2>/dev/null | head -1 || true)
    if [ -n "$LATEST_PKG" ]; then
        echo "  ✓ $(basename "$LATEST_PKG")"
    fi
done

echo ""
echo "📍 Feed location: $LOCAL_NUGET_FEED"
echo ""

# Auto-discover and restore dependents if requested
if [ "$RESTORE_DEPS" = true ]; then
    for PACKAGE_NAME in "${PACKAGE_NAMES[@]}"; do
        echo ""
        "$SCRIPT_DIR/discover-dependents.sh" "$PACKAGE_NAME" --restore
    done
else
    echo "💡 Tip: Run with --restore-deps to automatically restore dependent repos"
    echo ""
    echo "To discover dependent repositories:"
    for PACKAGE_NAME in "${PACKAGE_NAMES[@]}"; do
        echo "  ./scripts/discover-dependents.sh $PACKAGE_NAME"
    done
fi

echo ""
