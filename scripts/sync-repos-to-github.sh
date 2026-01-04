#!/bin/bash
set -e

# Sync Local Repositories to GitHub
# 
# Ensures every directory in parent has a corresponding repo in GitHub org
# Optionally creates fresh initial commits and force pushes

PARENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GITHUB_ORG="deepstaging"

echo "🔄 GitHub Repository Sync"
echo "========================="
echo ""
echo "Parent directory: $PARENT_DIR"
echo "GitHub org: $GITHUB_ORG"
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

# Process each directory
cd "$PARENT_DIR"

for dir in */; do
    repo="${dir%/}"
    
    # Skip if not a git repo
    if [[ ! -d "$repo/.git" ]]; then
        echo "⏭️  Skipping $repo (not a git repository)"
        echo ""
        continue
    fi
    
    echo "📦 Processing: $repo"
    echo "────────────────────────────────"
    
    cd "$repo"
    
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
    
    # Ask about creating fresh initial commit
    if git remote get-url origin &> /dev/null; then
        BRANCH=$(git branch --show-current)
        COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
        
        echo "Current branch: $BRANCH"
        echo "Commit count: $COMMIT_COUNT"
        echo ""
        
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
        else
            # Just push current branch
            read -p "Push current branch ($BRANCH)? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin "$BRANCH" --force
                echo "✓ Pushed to GitHub"
            fi
        fi
    fi
    
    cd "$PARENT_DIR"
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
        cd "$PARENT_DIR"
    fi
done
