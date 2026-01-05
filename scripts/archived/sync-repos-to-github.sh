#!/usr/bin/env bash
set -e

# Sync Local Repositories to GitHub
# 
# Ensures every directory in parent has a corresponding repo in GitHub org
# Optionally creates fresh initial commits and force pushes
#
# Usage:
#   sync-repos-to-github.sh              # Normal sync (no history rewrite)
#   sync-repos-to-github.sh --fresh-history  # Enable fresh commit option

#==============================================================================
# Configuration and Initialization
#==============================================================================

# Resolve script directory (follow symlinks to find actual location)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
    SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"

# Source utility libraries
source "$SCRIPT_DIR/lib/ui-helpers.sh"
source "$SCRIPT_DIR/lib/git-utils.sh"
source "$SCRIPT_DIR/lib/copilot-ai.sh"

# Use environment variables if available (from .envrc), otherwise calculate
ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
GITHUB_ORG="${DEEPSTAGING_GITHUB_ORG:-deepstaging}"
ALLOW_FRESH_HISTORY=false
SCRIPT_NAME=$(basename "$0")

# Global arrays for repository state
REPOS=()
REPO_INFO=()
REPO_UNPUSHED=()
REPO_UNCOMMITTED=()
SELECTED_REPOS=()
declare -A REPO_COMMIT_MSGS

# Commit message state
COMMIT_MSG=""
USE_PER_REPO=false

#==============================================================================
# Help
#==============================================================================

show_help() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Sync local repositories to GitHub organization.

OPTIONS:
    --fresh-history    Enable dangerous fresh initial commit and force push option
    --help, -h         Show this help message

DESCRIPTION:
    This script:
    - Discovers all git repositories in the parent directory
    - Shows commit status for each repo
    - Lets you select which repos to push (interactive checkbox menu)
    - Ensures they exist on GitHub (creates if needed)
    - Configures remote origins
    - Pushes selected repositories
    
    By default, the dangerous "fresh history" rewrite is disabled.
    Use --fresh-history to enable the option to create fresh initial commits.

EXAMPLES:
    $SCRIPT_NAME                  # Safe sync without history rewrite
    $SCRIPT_NAME --fresh-history  # Enable fresh history option (dangerous)

EOF
}

#==============================================================================
# Commit Creation
#==============================================================================

# Prompt user for commit message and strategy
prompt_for_commit_message() {
    #⮕ ui-helpers.sh: Display fzf menu to choose AI/custom/default commit strategy
    local method=$(select_commit_message_method)
    
    case $method in
        ai)
            #⮕ copilot-ai.sh: Generate commit messages using GitHub Copilot CLI
            if ! generate_ai_commit_messages "$ORG_ROOT"; then
                read -p "Enter custom message: " COMMIT_MSG
            fi
            ;;
        custom)
            read -p "Enter commit message: " COMMIT_MSG
            ;;
        default)
            COMMIT_MSG="Sync changes from $(date +%Y-%m-%d)"
            echo "Using default message: \"$COMMIT_MSG\""
            ;;
    esac
    
    # Fallback to default if empty and not using per-repo
    if [[ -z "$COMMIT_MSG" ]] && [[ "$USE_PER_REPO" != "true" ]]; then
        COMMIT_MSG="Sync changes from $(date +%Y-%m-%d)"
    fi
}

# Create commits for repositories with uncommitted changes
create_commits() {
    local HAS_UNCOMMITTED=false
    for i in "${!REPO_UNCOMMITTED[@]}"; do
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
            HAS_UNCOMMITTED=true
            break
        fi
    done
    
    if [[ "$HAS_UNCOMMITTED" == "false" ]]; then
        return
    fi
    
    echo "⚠️  Some repositories have uncommitted changes"
    echo ""
    read -p "Create commits for repositories with changes? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    echo ""
    
    # Prompt for commit message
    prompt_for_commit_message
    
    echo ""
    if [[ "$USE_PER_REPO" == "true" ]]; then
        echo "Creating per-repo commits..."
    else
        echo "Creating commits with message: \"$COMMIT_MSG\""
    fi
    echo ""
    
    for i in "${!REPOS[@]}"; do
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
            local repo="${REPOS[$i]}"
            cd "$ORG_ROOT/$repo"
            
            # Use per-repo message or shared message
            if [[ "$USE_PER_REPO" == "true" ]]; then
                local MSG="${REPO_COMMIT_MSGS[$repo]}"
                local subject=$(echo "$MSG" | head -1)
                echo "  📝 $repo: $subject"
            else
                local MSG="$COMMIT_MSG"
                echo "  📝 Committing changes in: $repo"
            fi
            
            git add -A
            git commit -m "$MSG" || echo "     ⚠️  Commit failed"
            
            # Update status - now has unpushed commits
            REPO_UNCOMMITTED[$i]=false
            local UNPUSHED=$(git rev-list --count origin/"$(git branch --show-current)"..HEAD 2>/dev/null || echo "0")
            REPO_UNPUSHED[$i]=$UNPUSHED
        fi
    done
    
    cd "$ORG_ROOT"
    echo ""
    echo "✓ Commits created"
    echo ""
}

#==============================================================================
# Repository Processing
#==============================================================================

# Process a single repository (setup and push)
process_repository() {
    local repo="$1"
    
    echo "📦 Processing: $repo"
    echo "────────────────────────────────────────────────────────"
    
    #⮕ git-utils.sh: Create repository on GitHub if it doesn't exist
    if ! ensure_github_repo_exists "$repo" "$ORG_ROOT" "$GITHUB_ORG" "$EXISTING_REPOS"; then
        echo "⏭️  Skipping $repo (not on GitHub)"
        echo ""
        return
    fi
    
    echo ""
    
    #⮕ git-utils.sh: Set up or update git remote to GitHub organization
    configure_repo_remote "$repo" "$ORG_ROOT" "$GITHUB_ORG"
    
    echo ""
    
    # Push if remote is configured
    if git -C "$ORG_ROOT/$repo" remote get-url origin &> /dev/null; then
        #⮕ git-utils.sh: Push commits to GitHub with optional history rewrite
        push_repository "$repo" "$ORG_ROOT" "$ALLOW_FRESH_HISTORY"
    fi
    
    cd "$ORG_ROOT"
    echo ""
}

#==============================================================================
# Main Execution
#==============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fresh-history)
                ALLOW_FRESH_HISTORY=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo ""
                echo "Usage: $SCRIPT_NAME [--fresh-history]"
                echo "Try '$SCRIPT_NAME --help' for more information."
                exit 1
                ;;
        esac
    done
    
    echo "🔄 GitHub Repository Sync"
    echo "========================="
    echo ""
    echo "Organization root: $ORG_ROOT"
    echo "GitHub org: $GITHUB_ORG"
    if [[ "$ALLOW_FRESH_HISTORY" == "true" ]]; then
        echo "⚠️  Fresh history mode: ENABLED"
    fi
    echo ""
    
    # Check authentication
    if ! gh auth status &> /dev/null; then
        echo "❌ GitHub CLI not authenticated!"
        echo "   Run: gh auth login"
        exit 1
    fi
    
    echo "✓ GitHub CLI authenticated"
    echo ""
    
    # Get list of existing GitHub repos
    echo "Fetching existing repositories from GitHub..."
    EXISTING_REPOS=$(gh repo list "$GITHUB_ORG" --json name --limit 100 | jq -r '.[].name' | sort)
    echo "Found $(echo "$EXISTING_REPOS" | wc -l | tr -d ' ') repositories on GitHub"
    echo ""
    
    #⮕ git-utils.sh: Discover all git repos and collect their status
    scan_repositories "$ORG_ROOT"
    
    #⮕ ui-helpers.sh: Show formatted table of repository statuses
    if ! display_repo_status REPOS REPO_INFO; then
        exit 0
    fi
    
    # Check if any repos need attention
    local NEEDS_ATTENTION=false
    for i in "${!REPO_UNPUSHED[@]}"; do
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]] || [[ "${REPO_UNPUSHED[$i]}" -gt 0 ]]; then
            NEEDS_ATTENTION=true
            break
        fi
    done
    
    if [[ "$NEEDS_ATTENTION" == "false" ]]; then
        echo "✅ All repositories are up to date!"
        exit 0
    fi
    
    # Offer to commit changes
    create_commits
    
    # Build lists for repos that need pushing (filter out up-to-date ones)
    local PUSHABLE_REPOS=()
    local PUSHABLE_INFO=()
    
    for i in "${!REPOS[@]}"; do
        # Include repos that have uncommitted changes or unpushed commits
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]] || [[ "${REPO_UNPUSHED[$i]}" -gt 0 ]]; then
            PUSHABLE_REPOS+=("${REPOS[$i]}")
            PUSHABLE_INFO+=("${REPO_INFO[$i]}")
        fi
    done
    
    if [[ ${#PUSHABLE_REPOS[@]} -eq 0 ]]; then
        echo "✅ All repositories are up to date!"
        exit 0
    fi
    
    # Select repos to push
    echo "Select repositories to push:"
    #⮕ ui-helpers.sh: Interactive fzf multi-select with pre-selection
    select_repos PUSHABLE_REPOS PUSHABLE_INFO
    
    if [[ ${#SELECTED_REPOS[@]} -eq 0 ]]; then
        echo "No repositories selected. Exiting."
        exit 0
    fi
    
    echo ""
    echo "Selected ${#SELECTED_REPOS[@]} repository(ies) to push"
    echo ""
    
    # Process each selected repo
    for repo in "${SELECTED_REPOS[@]}"; do
        process_repository "$repo"
    done
    
    echo "✨ Sync Complete!"
    echo ""
    echo "Summary:"
    for dir in "$ORG_ROOT"/*/; do
        local repo=$(basename "$dir")
        if [[ -d "$dir/.git" ]]; then
            cd "$dir"
            local REMOTE=$(git remote get-url origin 2>/dev/null || echo "[NO REMOTE]")
            local BRANCH=$(git branch --show-current 2>/dev/null || echo "[NO BRANCH]")
            echo "  $repo"
            echo "    Remote: $REMOTE"
            echo "    Branch: $BRANCH"
        fi
    done
}

# Run main function
main "$@"
