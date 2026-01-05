#!/usr/bin/env bash
# Git Operations Helper Functions

# Get the GitHub repo name (handles special mappings)
get_github_repo_name() {
    local repo="$1"
    if [[ "$repo" == "github-profile" ]]; then
        echo ".github"
    else
        echo "$repo"
    fi
}

# Scan all repositories and gather status information
scan_repositories() {
    local root_dir="$1"
    
    REPOS=()
    REPO_INFO=()
    REPO_UNPUSHED=()
    REPO_UNCOMMITTED=()
    
    cd "$root_dir"
    
    # Count total git repos first
    local total_repos=0
    for dir in */; do
        [[ -d "${dir%/}/.git" ]] && total_repos=$((total_repos + 1))
    done
    
    # Start spinner in background
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local spin_i=0
    
    # Function to update spinner
    update_spinner() {
        while true; do
            spin_i=$(( (spin_i + 1) % 10 ))
            printf "\r${spin:$spin_i:1} " >&2
            sleep 0.1
        done
    }
    
    # Start spinner
    update_spinner &
    local spinner_pid=$!
    
    local current=0
    for dir in */; do
        local repo="${dir%/}"
        
        # Skip if not a git repo
        if [[ ! -d "$repo/.git" ]]; then
            continue
        fi
        
        current=$((current + 1))
        
        # Update progress line (spinner on first line, status on second)
        printf "\r\033[K${spin:$spin_i:1} Scanning repositories... [%d/%d]\n\033[K  → %s\033[A" "$current" "$total_repos" "$repo" >&2
        
        cd "$repo"
        
        # Get repo status
        local BRANCH=$(git branch --show-current 2>/dev/null || echo "")
        if [[ -z "$BRANCH" ]]; then
            cd "$root_dir"
            continue
        fi
        
        local COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
        
        # Check for uncommitted changes
        local UNCOMMITTED=false
        if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
            UNCOMMITTED=true
        fi
        
        # Check if remote exists and get unpushed commits
        local UNPUSHED=0
        local STATUS_MSG=""
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
        
        cd "$root_dir"
    done
    
    # Stop spinner
    kill $spinner_pid 2>/dev/null || true
    wait $spinner_pid 2>/dev/null || true
    
    printf "\r\033[K\n\033[K\033[A" >&2  # Clear both lines
    echo "✓ Scanned ${#REPOS[@]} repositories"
    echo ""
}

# Ensure repository exists on GitHub
ensure_github_repo_exists() {
    local repo="$1"
    local root_dir="$2"
    local github_org="$3"
    local existing_repos="$4"
    
    local github_repo_name=$(get_github_repo_name "$repo")
    
    cd "$root_dir/$repo"
    
    # Check if repo exists on GitHub
    if echo "$existing_repos" | grep -q "^$github_repo_name$"; then
        echo "✓ Repository exists on GitHub: $github_repo_name"
        return 0
    fi
    
    echo "❌ Repository does not exist on GitHub: $github_repo_name"
    echo ""
    read -p "   Create repository on GitHub? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    
    # Get description from README if it exists
    local DESCRIPTION=""
    if [[ -f "README.md" ]]; then
        DESCRIPTION=$(head -5 README.md | grep -v "^#" | grep -v "^$" | head -1 | cut -c1-80)
    fi
    
    echo "📝 Creating repository: $github_repo_name"
    gh repo create "$github_org/$github_repo_name" \
        --private \
        --description "$DESCRIPTION" \
        --source=. \
        --remote=origin \
        || echo "⚠️  Failed to create repository"
    
    if git remote get-url origin &> /dev/null; then
        echo "✓ Repository created and remote configured"
        return 0
    fi
    
    return 1
}

# Configure remote for repository
configure_repo_remote() {
    local repo="$1"
    local root_dir="$2"
    local github_org="$3"
    
    local github_repo_name=$(get_github_repo_name "$repo")
    
    cd "$root_dir/$repo"
    
    local CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    local EXPECTED_REMOTE="git@github.com:$github_org/$github_repo_name.git"
    
    if [[ "$CURRENT_REMOTE" == "$EXPECTED_REMOTE" ]]; then
        echo "✓ Remote already configured correctly"
        return 0
    elif [[ -z "$CURRENT_REMOTE" ]]; then
        echo "📝 Adding remote origin..."
        git remote add origin "$EXPECTED_REMOTE"
        echo "✓ Remote added"
        return 0
    else
        echo "⚠️  Current remote: $CURRENT_REMOTE"
        echo "   Expected remote: $EXPECTED_REMOTE"
        read -p "   Update remote? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git remote set-url origin "$EXPECTED_REMOTE"
            echo "✓ Remote updated"
            return 0
        fi
    fi
    
    return 1
}

# Create fresh git history (dangerous operation)
create_fresh_history() {
    local repo="$1"
    local root_dir="$2"
    
    cd "$root_dir/$repo"
    
    local BRANCH=$(git branch --show-current)
    
    read -p "Create fresh initial commit and force push? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    
    echo ""
    echo "🔄 Creating fresh history..."
    
    # Create orphan branch
    local TEMP_BRANCH="temp-initial-$(date +%s)"
    git checkout --orphan "$TEMP_BRANCH"
    
    # Stage everything
    git add -A
    
    # Create initial commit
    local REPO_TITLE=$(echo "$repo" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
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
        return 0
    else
        echo "⏭️  Skipped push"
        return 1
    fi
}

# Push repository to GitHub
push_repository() {
    local repo="$1"
    local root_dir="$2"
    local allow_fresh_history="$3"
    
    cd "$root_dir/$repo"
    
    local BRANCH=$(git branch --show-current)
    local COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    
    echo "Current branch: $BRANCH"
    echo "Commit count: $COMMIT_COUNT"
    echo ""
    
    # Fresh history option (only if flag enabled)
    if [[ "$allow_fresh_history" == "true" ]]; then
        if create_fresh_history "$repo" "$root_dir"; then
            return 0
        fi
    fi
    
    # Normal push
    echo "Pushing current branch: $BRANCH"
    git push origin "$BRANCH" && echo "✓ Pushed to GitHub" || echo "⚠️  Push failed"
}
