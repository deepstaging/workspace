#!/usr/bin/env bash
set -e

# Deepstaging Workspace Bootstrap Script
# 
# This script sets up the multi-repository workspace environment:
# - Checks for required dependencies (Homebrew, gh, direnv)
# - Installs missing dependencies via Homebrew
# - Copies .envrc to parent directory for cross-repo script loading
# - Discovers Deepstaging repositories via GitHub CLI
# - Clones selected repositories
# - Sets up local development environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$WORKSPACE_DIR")"
GITHUB_ORG="deepstaging"
SCRIPT_NAME=$(basename "$0")

# Resolve symlinks to find actual script location
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
    SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
    SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
    [[ $SCRIPT_PATH != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$WORKSPACE_DIR")"

show_help() {
    cat << EOF
Usage: $SCRIPT_NAME

Bootstrap the Deepstaging multi-repository workspace.

DESCRIPTION:
    This script sets up the complete development environment:
    - Installs required dependencies (bash, gh, direnv, jq)
    - Copies .envrc and dotnet-tools.json to parent directory
    - Discovers and clones Deepstaging repositories from GitHub
    - Sets up local NuGet feed
    - Configures direnv for cross-repo script loading

    The script is interactive and will prompt for confirmations.

DEPENDENCIES:
    - Homebrew (will check and install others via Brewfile)
    - Bash 4.0+ (for mapfile support)
    - GitHub CLI (gh)
    - direnv
    - jq

EXAMPLES:
    $SCRIPT_NAME              # Run interactive bootstrap
    $SCRIPT_NAME --help       # Show this help

EOF
}

# Check for help flag first
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

echo "🚀 Deepstaging Workspace Bootstrap"
echo "=================================="
echo ""
echo "Workspace: $WORKSPACE_DIR"
echo "Parent:    $PARENT_DIR"
echo ""

# Check Bash version (need 4.0+ for mapfile)
BASH_MAJOR="${BASH_VERSINFO[0]}"
if [[ "$BASH_MAJOR" -lt 4 ]]; then
    echo "❌ Bash version too old: $BASH_VERSION"
    echo ""
    echo "This script requires Bash 4.0 or newer (for mapfile support)."
    echo ""
    echo "Install modern Bash with Homebrew:"
    echo "  brew install bash"
    echo ""
    echo "Then run this script again with:"
    echo "  /opt/homebrew/bin/bash $0"
    echo ""
    exit 1
fi

echo "✓ Bash version: $BASH_VERSION"
echo ""

# Step 0: Check for Homebrew
echo "🍺 Step 0: Checking Dependencies"
echo ""

if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed!"
    echo ""
    echo "Install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✓ Homebrew found"

# Check if Brewfile exists and offer to install dependencies
DEPS_INSTALLED=false
if [[ -f "$WORKSPACE_DIR/Brewfile" ]]; then
    echo ""
    read -p "Install/update workspace dependencies from Brewfile? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo ""
        echo "📦 Installing dependencies..."
        (cd "$WORKSPACE_DIR" && brew bundle install)
        echo ""
        echo "✓ Dependencies installed"
        DEPS_INSTALLED=true
    fi
else
    echo "⚠️  No Brewfile found - skipping dependency installation"
fi

# Verify required tools
echo ""
echo "Checking required tools..."

MISSING_TOOLS=()

if ! command -v gh &> /dev/null; then
    MISSING_TOOLS+=("gh")
fi

if ! command -v direnv &> /dev/null; then
    MISSING_TOOLS+=("direnv")
fi

if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
    echo "❌ Missing required tools: ${MISSING_TOOLS[*]}"
    echo ""
    echo "Install them with:"
    echo "  brew install ${MISSING_TOOLS[*]}"
    echo ""
    echo "Or run this script again to install via Brewfile."
    exit 1
fi

echo "✓ All required tools available (gh, direnv)"

# Install npm dependencies for TypeScript scripts
echo ""
echo "Checking npm dependencies..."

if [[ -f "$WORKSPACE_DIR/package.json" ]]; then
    cd "$WORKSPACE_DIR"
    
    if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.package-lock.json" ]]; then
        echo "📦 Installing npm dependencies..."
        npm install
        echo "✓ npm dependencies installed"
    else
        echo "✓ npm dependencies already installed"
    fi
    
    cd "$PARENT_DIR"
else
    echo "⚠️  No package.json found - skipping npm install"
fi

# Check for useful CLI tools
echo ""
echo "Checking optional CLI tools..."

MISSING_CLI_TOOLS=()

if ! command -v copilot &> /dev/null; then
    MISSING_CLI_TOOLS+=("copilot-cli")
fi

if [[ ${#MISSING_CLI_TOOLS[@]} -gt 0 ]]; then
    echo "⚠️  Recommended tools not installed:"
    for tool in "${MISSING_CLI_TOOLS[@]}"; do
        case "$tool" in
            copilot-cli)
                echo "  - GitHub Copilot CLI (for AI-powered commit messages)"
                ;;
        esac
    done
    echo ""
    read -p "Install recommended tools via Homebrew? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo ""
        for tool in "${MISSING_CLI_TOOLS[@]}"; do
            echo "📥 Installing $tool..."
            brew install --cask "$tool" || echo "   ⚠️  Failed to install $tool"
        done
        echo ""
        echo "✓ Tools installed"
    else
        echo ""
        echo "⏭️  Skipped tool installation"
        echo ""
        echo "   You can install them later with:"
        for tool in "${MISSING_CLI_TOOLS[@]}"; do
            echo "     brew install --cask $tool"
        done
    fi
else
    echo "✓ All recommended tools installed"
fi

echo ""

# If we just installed dependencies, ask user to restart
if [[ "$DEPS_INSTALLED" == "true" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Dependencies installed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please restart this script to continue setup:"
    echo "  $0"
    echo ""
    echo "This ensures the newly installed tools are available."
    echo ""
    exit 0
fi

echo ""

# Step 1: Copy .envrc and dotnet tools to parent directory
echo "📋 Step 1: Setting up workspace configuration"
echo ""

# Copy .envrc
ENVRC_SRC="$WORKSPACE_DIR/.envrc"
ENVRC_DST="$PARENT_DIR/.envrc"

if [[ -f "$ENVRC_DST" ]]; then
    echo "⚠️  .envrc already exists in parent directory"
    read -p "   Overwrite? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$ENVRC_SRC" "$ENVRC_DST"
        echo "✅ Copied .envrc to parent directory"
    else
        echo "⏭️  Skipped .envrc copy"
    fi
else
    cp "$ENVRC_SRC" "$ENVRC_DST"
    echo "✅ Copied .envrc to parent directory"
fi

echo ""
echo "   The .envrc will auto-load scripts from all repositories."
echo ""

# Copy dotnet tools manifest
TOOLS_SRC="$WORKSPACE_DIR/.config/dotnet-tools.json"
TOOLS_DST="$PARENT_DIR/.config"

if [[ -f "$TOOLS_SRC" ]]; then
    mkdir -p "$TOOLS_DST"
    
    if [[ -f "$TOOLS_DST/dotnet-tools.json" ]]; then
        echo "⚠️  dotnet-tools.json already exists in parent directory"
        read -p "   Overwrite? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$TOOLS_SRC" "$TOOLS_DST/dotnet-tools.json"
            echo "✅ Copied dotnet-tools.json to parent directory"
        else
            echo "⏭️  Skipped dotnet-tools.json copy"
        fi
    else
        cp "$TOOLS_SRC" "$TOOLS_DST/dotnet-tools.json"
        echo "✅ Copied dotnet-tools.json to parent directory"
    fi
    echo ""
    echo "   Shared dotnet tools available across all repositories."
    echo ""
fi

# Check direnv hook setup
if ! grep -q "direnv hook" ~/.bashrc ~/.zshrc ~/.config/fish/config.fish 2>/dev/null; then
    echo "   ⚠️  direnv hook not detected in your shell config!"
    echo ""
    echo "   Add to your shell config (~/.bashrc, ~/.zshrc, etc.):"
    echo "   eval \"\$(direnv hook bash)\"  # or zsh, fish"
    echo ""
fi

# Step 2: Discover Deepstaging repositories via GitHub CLI
echo "📦 Step 2: Repository Discovery"
echo ""

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI not authenticated!"
    echo ""
    echo "Please authenticate first:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo "Discovering $GITHUB_ORG repositories via GitHub CLI..."
echo ""

# Fetch all repositories from the organization
REPOS_JSON=$(gh repo list "$GITHUB_ORG" --json name,isArchived,isFork --limit 100 2>/dev/null)

if [[ -z "$REPOS_JSON" || "$REPOS_JSON" == "[]" ]]; then
    echo "❌ Could not fetch repositories from GitHub"
    echo ""
    echo "This could mean:"
    echo "  - You don't have access to the $GITHUB_ORG organization"
    echo "  - The organization doesn't exist or is private"
    echo "  - gh CLI needs re-authentication: gh auth login"
    echo ""
    exit 1
fi

# Parse repository names (exclude archived and forks)
mapfile -t REPOS < <(echo "$REPOS_JSON" | jq -r '.[] | select(.isArchived == false and .isFork == false) | .name' | sort)

if [[ ${#REPOS[@]} -eq 0 ]]; then
    echo "❌ No active repositories found in $GITHUB_ORG"
    exit 1
fi

# Map repository names to local directory names
get_local_dir_name() {
    local repo="$1"
    # Special case: .github repo maps to github-profile directory
    if [[ "$repo" == ".github" ]]; then
        echo "github-profile"
    else
        echo "$repo"
    fi
}

echo "Found ${#REPOS[@]} active repositories:"
MISSING_REPOS=()
for i in "${!REPOS[@]}"; do
    repo="${REPOS[$i]}"
    local_dir=$(get_local_dir_name "$repo")
    if [[ -d "$PARENT_DIR/$local_dir" ]]; then
        echo "  $((i+1)). $repo [✓ Already cloned]"
    else
        echo "  $((i+1)). $repo"
        MISSING_REPOS+=("$repo")
    fi
done
echo ""

# Step 3: Clone repositories (only if there are missing repos)
if [[ ${#MISSING_REPOS[@]} -eq 0 ]]; then
    echo "✅ All repositories already cloned!"
    echo ""
else
    echo "🔄 Step 3: Clone Repositories"
    echo ""
    echo "Options:"
    echo "  a) Clone all missing repositories"
    echo "  s) Select individual repositories to clone"
    echo "  n) Skip (no cloning)"
    echo ""
    read -p "Choice (a/s/n): " -n 1 -r CLONE_CHOICE
    echo
    echo ""

    case $CLONE_CHOICE in
        [Aa])
            echo "Cloning all missing repositories..."
            echo ""
            for repo in "${REPOS[@]}"; do
                local_dir=$(get_local_dir_name "$repo")
                if [[ ! -d "$PARENT_DIR/$local_dir" ]]; then
                    echo "📥 Cloning $repo..."
                    gh repo clone "$GITHUB_ORG/$repo" "$PARENT_DIR/$local_dir"
                    echo "   ✓ $repo cloned to $local_dir"
                    echo ""
                else
                    echo "⏭️  $repo already exists"
                fi
            done
            ;;
        [Ss])
            echo "Select repositories to clone (space-separated numbers, e.g., '1 3'):"
            read -p "Numbers: " -r SELECTIONS
            echo ""
            
            for num in $SELECTIONS; do
                idx=$((num-1))
                if [[ $idx -ge 0 && $idx -lt ${#REPOS[@]} ]]; then
                    repo="${REPOS[$idx]}"
                    local_dir=$(get_local_dir_name "$repo")
                    if [[ ! -d "$PARENT_DIR/$local_dir" ]]; then
                        echo "📥 Cloning $repo..."
                        gh repo clone "$GITHUB_ORG/$repo" "$PARENT_DIR/$local_dir"
                        echo "   ✓ $repo cloned to $local_dir"
                        echo ""
                    else
                        echo "⏭️  $repo already exists"
                    fi
                else
                    echo "⚠️  Invalid selection: $num"
                fi
            done
            ;;
        [Nn])
            echo "⏭️  Skipping repository cloning"
            echo ""
            ;;
        *)
            echo "⚠️  Invalid choice. Skipping repository cloning"
            echo ""
            ;;
    esac
fi

# Step 4: Setup local NuGet feed
echo "📦 Step 4: Local NuGet Feed"
echo ""

NUGET_FEED="$HOME/.nuget/local-feed"
if [[ -d "$NUGET_FEED" ]]; then
    echo "✓ Local NuGet feed exists: $NUGET_FEED"
else
    echo "Creating local NuGet feed directory..."
    mkdir -p "$NUGET_FEED"
    echo "✓ Created: $NUGET_FEED"
fi
echo ""

# Step 5: direnv setup
echo "🔧 Step 5: Enable direnv"
echo ""

cd "$PARENT_DIR"
if direnv status &> /dev/null; then
    echo "Allowing .envrc in parent directory..."
    direnv allow
    echo "✓ direnv configured"
else
    echo "⚠️  Could not detect direnv status"
    echo ""
    echo "Manually allow the .envrc:"
    echo "  cd $PARENT_DIR"
    echo "  direnv allow"
fi
echo ""

# Step 6: Summary
echo "✨ Bootstrap Complete!"
echo "===================="
echo ""
echo "Environment setup:"
echo "  ✓ Dependencies installed"
echo "  ✓ .envrc configured"
echo "  ✓ Repositories available"
echo "  ✓ Local NuGet feed ready"
echo ""
echo "Next steps:"
echo ""
echo "1. Ensure direnv hook is in your shell config:"
echo "   # Add to ~/.bashrc or ~/.zshrc:"
echo "   eval \"\$(direnv hook bash)\"  # or zsh"
echo ""
echo "2. Reload your shell or source config:"
echo "   source ~/.bashrc  # or ~/.zshrc"
echo ""
echo "3. Navigate to any repository:"
echo "   cd $PARENT_DIR"
echo "   # Scripts auto-loaded via direnv!"
echo ""
echo "4. Use workspace scripts:"
echo "   workspace-bootstrap.sh                       # This script"
echo "   workspace-publish.sh deepstaging             # Publish to local NuGet"
echo "   workspace-discover-dependents.sh Deepstaging # Find dependencies"
echo ""
echo "5. Check available documentation:"
echo "   - Permanent:  workspace/.docs/"
echo "   - Session:    workspace/.session/"
echo ""
echo "Happy coding! 🎉"
