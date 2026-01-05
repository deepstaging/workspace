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

# Use environment variables if available (from .envrc), otherwise calculate
ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
GITHUB_ORG="${DEEPSTAGING_GITHUB_ORG:-deepstaging}"
ALLOW_FRESH_HISTORY=false
SCRIPT_NAME=$(basename "$0")

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

# Interactive checkbox selection using fzf if available, otherwise fallback
select_repos() {
    local -n repos_array=$1
    local -n info_array=$2
    
    # Check if fzf is available
    if command -v fzf &> /dev/null; then
        # Use fzf for nice multi-select
        local selected=$(printf '%s\n' "${info_array[@]}" | \
            fzf --multi \
                --height=~50% \
                --border \
                --header="Select repositories to push (Tab to select, Enter to confirm)" \
                --prompt="❯ " \
                --pointer="▶" \
                --marker="✓ " \
                --reverse)
        
        # Extract repo names from selection
        SELECTED_REPOS=()
        while IFS= read -r line; do
            if [[ -n "$line" ]]; then
                # Extract repo name (first field)
                repo=$(echo "$line" | awk '{print $1}')
                SELECTED_REPOS+=("$repo")
            fi
        done <<< "$selected"
    else
        # Fallback to simple numbered selection
        echo ""
        echo "Select repositories to push (space-separated numbers, e.g., '1 3 4'):"
        read -p "Numbers (or 'all'): " -r SELECTIONS
        echo ""
        
        SELECTED_REPOS=()
        if [[ "$SELECTIONS" == "all" ]]; then
            SELECTED_REPOS=("${repos_array[@]}")
        else
            for num in $SELECTIONS; do
                idx=$((num-1))
                if [[ $idx -ge 0 && $idx -lt ${#repos_array[@]} ]]; then
                    SELECTED_REPOS+=("${repos_array[$idx]}")
                fi
            done
        fi
    fi
}

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

# First pass: gather information about all repos
echo "Scanning local repositories..."
echo ""

REPOS=()
REPO_INFO=()
REPO_UNPUSHED=()
REPO_UNCOMMITTED=()

cd "$ORG_ROOT"

for dir in */; do
    repo="${dir%/}"
    
    # Skip if not a git repo
    if [[ ! -d "$repo/.git" ]]; then
        continue
    fi
    
    cd "$repo"
    
    # Get repo status
    BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    if [[ -z "$BRANCH" ]]; then
        cd "$ORG_ROOT"
        continue
    fi
    
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    
    # Check for uncommitted changes
    UNCOMMITTED=false
    if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
        UNCOMMITTED=true
    fi
    
    # Check if remote exists and get unpushed commits
    UNPUSHED=0
    STATUS_MSG=""
    if git remote get-url origin &> /dev/null 2>&1; then
        # Fetch to update remote tracking
        git fetch origin "$BRANCH" 2>/dev/null || true
        
        # Count unpushed commits
        UNPUSHED=$(git rev-list --count origin/"$BRANCH"..HEAD 2>/dev/null || echo "0")
        
        if [[ "$UNCOMMITTED" == "true" ]]; then
            STATUS_MSG="⚠️  uncommitted changes"
        elif [[ "$UNPUSHED" -gt 0 ]]; then
            STATUS_MSG="📤 $UNPUSHED commit(s) ahead"
        else
            STATUS_MSG="✓ up to date"
        fi
    else
        if [[ "$UNCOMMITTED" == "true" ]]; then
            STATUS_MSG="⚠️  uncommitted changes, no remote"
        else
            STATUS_MSG="❌ no remote"
        fi
        UNPUSHED=999  # Force to top of list
    fi
    
    REPOS+=("$repo")
    REPO_INFO+=("$repo │ $BRANCH │ $COMMIT_COUNT commits │ $STATUS_MSG")
    REPO_UNPUSHED+=("$UNPUSHED")
    REPO_UNCOMMITTED+=("$UNCOMMITTED")
    
    cd "$ORG_ROOT"
done

if [[ ${#REPOS[@]} -eq 0 ]]; then
    echo "No git repositories found in $ORG_ROOT"
    exit 0
fi

# Display status
echo "Repository Status:"
echo "════════════════════════════════════════════════════════════"
for i in "${!REPO_INFO[@]}"; do
    printf "%2d. %s\n" $((i+1)) "${REPO_INFO[$i]}"
done
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if any repos need attention
NEEDS_ATTENTION=false
HAS_UNCOMMITTED=false
for i in "${!REPO_UNPUSHED[@]}"; do
    if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
        HAS_UNCOMMITTED=true
        NEEDS_ATTENTION=true
    elif [[ "${REPO_UNPUSHED[$i]}" -gt 0 ]]; then
        NEEDS_ATTENTION=true
    fi
done

if [[ "$NEEDS_ATTENTION" == "false" ]]; then
    echo "✅ All repositories are up to date!"
    exit 0
fi

# Offer to commit changes in repos with uncommitted changes
if [[ "$HAS_UNCOMMITTED" == "true" ]]; then
    echo "⚠️  Some repositories have uncommitted changes"
    echo ""
    read -p "Create commits for repositories with changes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Commit message options:"
        echo "  1) Enter custom message"
        echo "  2) Generate with AI (GitHub Copilot CLI)"
        echo "  3) Use default message"
        echo ""
        read -p "Choice (1/2/3): " -n 1 -r COMMIT_CHOICE
        echo
        echo ""
        
        COMMIT_MSG=""
        
        case $COMMIT_CHOICE in
            2)
                # Try to generate with GitHub Copilot CLI
                if command -v copilot &> /dev/null; then
                    echo "🤖 Generating commit message with GitHub Copilot..."
                    echo ""
                    
                    # Gather changes from all repos with uncommitted changes
                    ALL_CHANGES=""
                    for i in "${!REPOS[@]}"; do
                        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
                            repo="${REPOS[$i]}"
                            cd "$ORG_ROOT/$repo"
                            
                            # Get concise diff summary
                            files=$(git diff --name-status 2>/dev/null | head -15)
                            if [[ -n "$files" ]]; then
                                ALL_CHANGES+="Repository: $repo"$'\n'
                                ALL_CHANGES+="$files"$'\n\n'
                            fi
                        fi
                    done
                    
                    cd "$ORG_ROOT"
                    
                    # Use copilot CLI to generate commit message
                    PROMPT="Generate only a concise conventional commit message (max 50 chars, format: type(scope): description) for these multi-repo changes:

$ALL_CHANGES

Reply with ONLY the commit message, nothing else."
                    
                    echo "Analyzing changes..."
                    SUGGESTED_MSG=$(copilot -p "$PROMPT" --allow-all-tools 2>/dev/null | grep -E "^(feat|fix|docs|chore|refactor|test|style|perf|build|ci)" | head -1 | sed 's/^[`]*//;s/[`]*$//')
                    
                    if [[ -n "$SUGGESTED_MSG" ]]; then
                        echo ""
                        echo "Suggested message: $SUGGESTED_MSG"
                        echo ""
                        read -p "Use this message? (Y/n): " -n 1 -r
                        echo
                        
                        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                            COMMIT_MSG="$SUGGESTED_MSG"
                        else
                            read -p "Enter custom message: " COMMIT_MSG
                        fi
                    else
                        echo "⚠️  Could not generate message with Copilot"
                        read -p "Enter custom message: " COMMIT_MSG
                    fi
                else
                    echo "⚠️  GitHub Copilot CLI not available"
                    echo ""
                    echo "Install with: brew install --cask copilot-cli"
                    echo ""
                    read -p "Enter custom message: " COMMIT_MSG
                fi
                ;;
            3)
                COMMIT_MSG="Sync changes from $(date +%Y-%m-%d)"
                echo "Using default message: \"$COMMIT_MSG\""
                ;;
            *)
                read -p "Enter commit message: " COMMIT_MSG
                ;;
        esac
        
        # Fallback to default if empty
        if [[ -z "$COMMIT_MSG" ]]; then
            COMMIT_MSG="Sync changes from $(date +%Y-%m-%d)"
        fi
        
        echo ""
        echo "Creating commits with message: \"$COMMIT_MSG\""
        echo ""
        
        for i in "${!REPOS[@]}"; do
            if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
                repo="${REPOS[$i]}"
                cd "$ORG_ROOT/$repo"
                
                echo "  📝 Committing changes in: $repo"
                git add -A
                git commit -m "$COMMIT_MSG" || echo "     ⚠️  Commit failed"
                
                # Update status - now has unpushed commits
                REPO_UNCOMMITTED[$i]=false
                UNPUSHED=$(git rev-list --count origin/"$(git branch --show-current)"..HEAD 2>/dev/null || echo "0")
                REPO_UNPUSHED[$i]=$UNPUSHED
            fi
        done
        
        cd "$ORG_ROOT"
        echo ""
        echo "✓ Commits created"
        echo ""
    fi
fi

# Select repos to push
echo "Select repositories to push:"
select_repos REPOS REPO_INFO

if [[ ${#SELECTED_REPOS[@]} -eq 0 ]]; then
    echo "No repositories selected. Exiting."
    exit 0
fi

echo ""
echo "Selected ${#SELECTED_REPOS[@]} repository(ies) to push"
echo ""

# Process each selected repo
for repo in "${SELECTED_REPOS[@]}"; do
    
    echo "📦 Processing: $repo"
    echo "────────────────────────────────────────────────────────"
    
    cd "$ORG_ROOT/$repo"
    
    # Determine GitHub repo name
    if [[ "$repo" == "github-profile" ]]; then
        GITHUB_REPO_NAME=".github"
    else
        GITHUB_REPO_NAME="$repo"
    fi
    
    # Check current remote
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    EXPECTED_REMOTE="git@github.com:$GITHUB_ORG/$GITHUB_REPO_NAME.git"
    
    # Check if repo exists on GitHub
    if echo "$EXISTING_REPOS" | grep -q "^$GITHUB_REPO_NAME$"; then
        echo "✓ Repository exists on GitHub: $GITHUB_REPO_NAME"
        
        # Check/update remote
        if [[ "$CURRENT_REMOTE" == "$EXPECTED_REMOTE" ]]; then
            echo "✓ Remote already configured correctly"
        elif [[ -z "$CURRENT_REMOTE" ]]; then
            echo "📝 Adding remote origin..."
            git remote add origin "$EXPECTED_REMOTE"
            echo "✓ Remote added"
        else
            echo "⚠️  Current remote: $CURRENT_REMOTE"
            echo "   Expected remote: $EXPECTED_REMOTE"
            read -p "   Update remote? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git remote set-url origin "$EXPECTED_REMOTE"
                echo "✓ Remote updated"
            fi
        fi
    else
        echo "❌ Repository does not exist on GitHub: $GITHUB_REPO_NAME"
        echo ""
        read -p "   Create repository on GitHub? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Get description from README if it exists
            DESCRIPTION=""
            if [[ -f "README.md" ]]; then
                DESCRIPTION=$(head -5 README.md | grep -v "^#" | grep -v "^$" | head -1 | cut -c1-80)
            fi
            
            echo "📝 Creating repository: $GITHUB_REPO_NAME"
            gh repo create "$GITHUB_ORG/$GITHUB_REPO_NAME" \
                --private \
                --description "$DESCRIPTION" \
                --source=. \
                --remote=origin \
                || echo "⚠️  Failed to create repository"
            
            if git remote get-url origin &> /dev/null; then
                echo "✓ Repository created and remote configured"
            fi
        fi
    fi
    
    echo ""
    
    # Push/sync logic
    if git remote get-url origin &> /dev/null; then
        BRANCH=$(git branch --show-current)
        COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
        
        echo "Current branch: $BRANCH"
        echo "Commit count: $COMMIT_COUNT"
        echo ""
        
        # Fresh history option (only if flag enabled)
        if [[ "$ALLOW_FRESH_HISTORY" == "true" ]]; then
            read -p "Create fresh initial commit and force push? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo ""
                echo "🔄 Creating fresh history..."
                
                # Create orphan branch
                TEMP_BRANCH="temp-initial-$(date +%s)"
                git checkout --orphan "$TEMP_BRANCH"
                
                # Stage everything
                git add -A
                
                # Create initial commit
                REPO_TITLE=$(echo "$repo" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
                git commit -m "Initial commit: $REPO_TITLE

Repository structure and conventions established.
Clean start for main branch."
                
                # Replace main/master branch
                git branch -D "$BRANCH" 2>/dev/null || true
                git branch -m "$BRANCH"
                
                # Force push
                echo ""
                echo "⚠️  About to force push to origin/$BRANCH"
                read -p "   Continue? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git push -f origin "$BRANCH"
                    echo "✓ Pushed fresh history to GitHub"
                else
                    echo "⏭️  Skipped push"
                fi
                cd "$ORG_ROOT"
                echo ""
                continue
            fi
        fi
        
        # Normal push
        echo "Pushing current branch: $BRANCH"
        git push origin "$BRANCH" && echo "✓ Pushed to GitHub" || echo "⚠️  Push failed"
    fi
    
    cd "$ORG_ROOT"
    echo ""
done

echo "✨ Sync Complete!"
echo ""
echo "Summary:"
for dir in */; do
    repo="${dir%/}"
    if [[ -d "$repo/.git" ]]; then
        cd "$repo"
        REMOTE=$(git remote get-url origin 2>/dev/null || echo "[NO REMOTE]")
        BRANCH=$(git branch --show-current 2>/dev/null || echo "[NO BRANCH]")
        echo "  $repo"
        echo "    Remote: $REMOTE"
        echo "    Branch: $BRANCH"
        cd "$ORG_ROOT"
    fi
done
