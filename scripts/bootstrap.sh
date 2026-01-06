#!/usr/bin/env bash
set -e

# Deepstaging Workspace Bootstrap (Bash Entry Point)
# 
# This is a minimal bash wrapper that validates prerequisites and
# delegates to the TypeScript bootstrap script for the actual work.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deepstaging Workspace Bootstrap"
echo "=================================="
echo ""

# Check for help flag
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat << 'HELP'
Usage: bootstrap.sh

Bootstrap the Deepstaging multi-repository workspace.

This script validates prerequisites and runs the TypeScript bootstrap.

REQUIREMENTS:
    - Node.js and npm (for TypeScript execution)

EXAMPLES:
    ./bootstrap.sh              # Run bootstrap
    ./bootstrap.sh --help       # Show this help

HELP
    exit 0
fi

# Step 1: Check/copy .envrc to parent directory
PARENT_DIR="$(dirname "$WORKSPACE_DIR")"
ENVRC_PATH="$PARENT_DIR/.envrc"
ENVRC_TEMPLATE="$WORKSPACE_DIR/.envrc"

if [[ ! -f "$ENVRC_PATH" ]]; then
    echo "📋 .envrc not found in parent directory"
    
    if [[ ! -f "$ENVRC_TEMPLATE" ]]; then
        echo "❌ .envrc template not found at: $ENVRC_TEMPLATE"
        echo ""
        echo "The workspace should contain a .envrc template file."
        exit 1
    fi
    
    echo "📄 Copying .envrc template to parent directory..."
    cp "$ENVRC_TEMPLATE" "$ENVRC_PATH"
    echo "✓ Created .envrc at: $ENVRC_PATH"
    echo ""
    
    # Offer to run direnv allow
    if command -v direnv &> /dev/null; then
        echo "🔧 Configuring direnv..."
        cd "$PARENT_DIR"
        direnv allow
        echo "✓ direnv configured"
        echo ""
    else
        echo "⚠️  direnv not installed yet (will be installed by bootstrap)"
        echo "   After bootstrap completes, run: direnv allow"
        echo ""
    fi
else
    echo "✓ Found .envrc at: $ENVRC_PATH"
    echo ""
fi

# Step 2: Check for Node.js
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js is not installed"
    echo ""
    echo "Node.js is required to run the TypeScript bootstrap."
    echo ""
    
    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo "Homebrew is available. You can install dependencies with:"
        echo "  cd $WORKSPACE_DIR && brew bundle"
        echo ""
        read -p "Install dependencies now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📦 Installing dependencies via Homebrew..."
            cd "$WORKSPACE_DIR"
            brew bundle
            echo ""
            echo "✅ Dependencies installed"
            echo ""
            echo "Please run bootstrap again:"
            echo "  ./scripts/bootstrap.sh"
            echo ""
            exit 0
        fi
    else
        echo "Install Homebrew first: https://brew.sh"
        echo "Then run: brew bundle"
    fi
    echo ""
    echo "After installing Node.js, run bootstrap again:"
    echo "  ./scripts/bootstrap.sh"
    echo ""
    exit 0
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js installed: $NODE_VERSION"

# Step 3: Check for npm
if ! command -v npm &> /dev/null; then
    echo "⚠️  npm is not installed"
    echo ""
    echo "npm should be included with Node.js."
    echo "Please reinstall Node.js."
    echo ""
    exit 0
fi

NPM_VERSION=$(npm --version)
echo "✓ npm installed: $NPM_VERSION"
echo ""

# Step 4: Install npm dependencies if node_modules doesn't exist
if [[ ! -d "$WORKSPACE_DIR/node_modules" ]]; then
    echo "📦 Installing npm dependencies..."
    cd "$WORKSPACE_DIR"
    npm install
    echo "✓ Dependencies installed"
    echo ""
fi

# Step 5: Check for tsx (install if missing)
if ! npm list -g tsx &> /dev/null && ! npm list tsx &> /dev/null; then
    echo "📦 tsx not found, installing globally..."
    npm install -g tsx
    echo ""
fi

# Step 6: Run TypeScript bootstrap
echo "🚀 Starting TypeScript bootstrap..."
echo ""

cd "$WORKSPACE_DIR"
exec tsx scripts/bootstrap/index.ts "$@"
