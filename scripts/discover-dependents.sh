#!/bin/bash
set -e

# Auto-discover dependent repositories by scanning for package references
# This script finds all repos that reference a given package and optionally restores them
#
# Usage:
#   ./scripts/discover-dependents.sh <package-name> [--restore]
#
# Examples:
#   ./scripts/discover-dependents.sh Deepstaging           # Just list
#   ./scripts/discover-dependents.sh Deepstaging --restore # List and restore
#   ./scripts/discover-dependents.sh Deepstaging.Effects --restore

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ORG_DIR="$(cd "$WORKSPACE_DIR/.." && pwd)"
RESTORE=false

# Parse arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <package-name> [--restore]"
    echo ""
    echo "Examples:"
    echo "  $0 Deepstaging"
    echo "  $0 Deepstaging --restore"
    echo "  $0 Deepstaging.Effects --restore"
    exit 1
fi

PACKAGE_NAME="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        --restore)
            RESTORE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🔍 Discovering repositories that depend on: $PACKAGE_NAME"
echo "=================================================="
echo ""

# Find all directories with .git that are not the package's own repo
DEPENDENT_REPOS=()
PACKAGE_REPO_NAME=$(echo "$PACKAGE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/deepstaging\.//g')

for REPO_DIR in "$ORG_DIR"/*; do
    if [ -d "$REPO_DIR/.git" ]; then
        REPO_NAME=$(basename "$REPO_DIR")
        
        # Skip the package's own repository
        if [[ "$REPO_NAME" == "deepstaging" && "$PACKAGE_NAME" == "Deepstaging"* ]]; then
            continue
        fi
        if [[ "$REPO_NAME" == "$PACKAGE_REPO_NAME" ]]; then
            continue
        fi
        if [[ "$REPO_NAME" == "workspace" ]]; then
            continue
        fi
        
        # Search for PackageReference to this package in any .csproj files
        if grep -r "PackageReference.*Include=\"$PACKAGE_NAME\"" "$REPO_DIR" --include="*.csproj" >/dev/null 2>&1; then
            DEPENDENT_REPOS+=("$REPO_DIR")
            echo "✅ Found: $REPO_NAME"
            
            # Show which projects reference it
            echo "   Projects:"
            grep -r "PackageReference.*Include=\"$PACKAGE_NAME\"" "$REPO_DIR" --include="*.csproj" | \
                sed 's|.*/\([^/]*\.csproj\):.*|     - \1|' | sort -u
            echo ""
        fi
    fi
done

if [ ${#DEPENDENT_REPOS[@]} -eq 0 ]; then
    echo "📭 No dependent repositories found for $PACKAGE_NAME"
    echo ""
    echo "This could mean:"
    echo "  - The package is brand new"
    echo "  - No other repos reference it yet"
    echo "  - Repos use ProjectReference instead of PackageReference"
    exit 0
fi

echo "=================================================="
echo "📊 Summary: Found ${#DEPENDENT_REPOS[@]} dependent repository(ies)"
echo ""

# Restore if requested
if [ "$RESTORE" = true ]; then
    echo "🔄 Restoring dependent repositories..."
    echo "=================================================="
    
    for REPO in "${DEPENDENT_REPOS[@]}"; do
        REPO_NAME=$(basename "$REPO")
        echo ""
        echo "📦 Restoring: $REPO_NAME"
        cd "$REPO"
        
        # Find all solution files
        if ls *.slnx >/dev/null 2>&1 || ls *.sln >/dev/null 2>&1; then
            dotnet restore --force-evaluate
            echo "✅ $REPO_NAME restored"
        else
            echo "⚠️  No solution files found in $REPO_NAME, skipping"
        fi
    done
    
    echo ""
    echo "✅ All dependent repositories restored!"
else
    echo "💡 Run with --restore to automatically restore these repositories"
fi

echo ""
