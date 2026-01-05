#!/usr/bin/env bash
# AI Commit Message Generation using GitHub Copilot CLI

# Generate AI commit message for a single repository
generate_repo_commit_message() {
    local repo="$1"
    local root_dir="$2"
    
    cd "$root_dir/$repo"
    
    # Get detailed diff
    local files=$(git diff --name-status 2>/dev/null)
    local stats=$(git diff --stat 2>/dev/null | tail -1)
    
    # Use copilot to generate commit message with body
    local PROMPT="Generate a git commit message for these changes in repository '$repo':

Files changed:
$files

$stats

Provide:
1. A concise subject line (max 50 chars, conventional commit format: type(scope): description)
2. An optional body with bullet points explaining key changes (if substantial changes)

Format exactly as:
subject line here

- bullet point 1
- bullet point 2
(etc)

If changes are minor, just provide the subject line."
    
    local FULL_MSG=$(copilot -p "$PROMPT" --allow-all-tools 2>/dev/null)
    
    # Extract just the commit message (remove any preamble/postamble)
    local CLEAN_MSG=$(echo "$FULL_MSG" | sed -n '/^[a-z]*([^)]*):.*$/,/^$/p' | sed '/^$/q')
    
    if [[ -n "$CLEAN_MSG" ]]; then
        echo "$CLEAN_MSG"
    else
        echo "chore($repo): sync changes"
    fi
}

# Generate per-repo AI commit messages
generate_per_repo_messages() {
    local root_dir="$1"
    declare -g -A REPO_COMMIT_MSGS
    
    for i in "${!REPOS[@]}"; do
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
            local repo="${REPOS[$i]}"
            echo "Analyzing $repo..."
            
            local MSG=$(generate_repo_commit_message "$repo" "$root_dir")
            REPO_COMMIT_MSGS[$repo]="$MSG"
            
            local subject=$(echo "$MSG" | head -1)
            echo "  ✓ $repo: $subject"
        fi
    done
    echo ""
}

# Generate single AI commit message for all repos
generate_single_message() {
    local root_dir="$1"
    
    local ALL_CHANGES=""
    for i in "${!REPOS[@]}"; do
        if [[ "${REPO_UNCOMMITTED[$i]}" == "true" ]]; then
            local repo="${REPOS[$i]}"
            cd "$root_dir/$repo"
            
            local files=$(git diff --name-status 2>/dev/null | head -15)
            if [[ -n "$files" ]]; then
                ALL_CHANGES+="Repository: $repo"$'\n'
                ALL_CHANGES+="$files"$'\n\n'
            fi
        fi
    done
    
    cd "$root_dir"
    
    local PROMPT="Generate only a concise conventional commit message (max 50 chars, format: type(scope): description) for these multi-repo changes:

$ALL_CHANGES

Reply with ONLY the commit message, nothing else."
    
    echo "Analyzing changes..."
    local SUGGESTED_MSG=$(copilot -p "$PROMPT" --allow-all-tools 2>/dev/null | grep -E "^(feat|fix|docs|chore|refactor|test|style|perf|build|ci)" | head -1 | sed 's/^[`]*//;s/[`]*$//')
    
    if [[ -z "$SUGGESTED_MSG" ]]; then
        return 1
    fi
    
    echo ""
    echo "Suggested message: $SUGGESTED_MSG"
    echo ""
    read -p "Use this message? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        return 1
    fi
    
    COMMIT_MSG="$SUGGESTED_MSG"
    return 0
}

# Main AI commit message generation workflow
generate_ai_commit_messages() {
    local root_dir="$1"
    
    if ! command -v copilot &> /dev/null; then
        echo "⚠️  GitHub Copilot CLI not available"
        echo ""
        echo "Install with: brew install --cask copilot-cli"
        echo ""
        return 1
    fi
    
    echo "🤖 Generating commit messages with GitHub Copilot..."
    echo ""
    echo "Options:"
    echo "  1) One message for all repos (same message)"
    echo "  2) Per-repo messages (custom for each)"
    echo ""
    read -p "Choice (1/2, default: 2): " -n 1 -r MSG_STRATEGY
    echo
    echo ""
    
    if [[ -z "$MSG_STRATEGY" ]] || [[ "$MSG_STRATEGY" == "2" ]]; then
        # Generate per-repo messages
        USE_PER_REPO=true
        generate_per_repo_messages "$root_dir"
    else
        # Single message for all repos
        USE_PER_REPO=false
        if ! generate_single_message "$root_dir"; then
            return 1
        fi
    fi
    
    return 0
}
