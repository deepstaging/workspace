#!/usr/bin/env bash
# UI Helper Functions for interactive menus and selections

# Interactive checkbox selection using fzf if available, otherwise fallback
select_repos() {
    local -n repos_array=$1
    local -n info_array=$2
    
    # Check if fzf is available
    if command -v fzf &> /dev/null; then
        # Use fzf for nice multi-select with all items pre-selected
        local selected=$(printf '%s\n' "${info_array[@]}" | \
            fzf --multi \
                --height=~50% \
                --border \
                --header="Repositories to push (Tab=toggle, Ctrl-A=all, Ctrl-D=none, Enter=confirm)" \
                --prompt="❯ " \
                --pointer="▶" \
                --marker="✓ " \
                --reverse \
                --bind 'ctrl-a:select-all,ctrl-d:deselect-all,ctrl-t:toggle-all' \
                --bind 'start:select-all')
        
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
        echo "Select repositories to push (space-separated numbers, or 'all' for all):"
        read -p "Numbers (default: all): " -r SELECTIONS
        echo ""
        
        SELECTED_REPOS=()
        if [[ -z "$SELECTIONS" ]] || [[ "$SELECTIONS" == "all" ]]; then
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

# Select commit message method (AI, custom, or default)
select_commit_message_method() {
    # Create menu options
    if command -v fzf &> /dev/null; then
        # Use fzf for nice selection
        local CHOICE=$(printf "🤖 Generate with AI (GitHub Copilot CLI)\n✏️  Enter custom message\n📅 Use default message (Sync changes from date)" | \
            fzf --height=8 \
                --border \
                --header="Select commit message method:" \
                --prompt="❯ " \
                --pointer="▶" \
                --reverse \
                --select-1)
        
        echo ""
        
        # Parse selection
        if [[ "$CHOICE" == *"Generate with AI"* ]]; then
            echo "ai"
        elif [[ "$CHOICE" == *"Enter custom"* ]]; then
            echo "custom"
        else
            echo "default"
        fi
    else
        # Fallback to numbered menu
        echo "Commit message options:"
        echo "  1) Enter custom message"
        echo "  2) Generate with AI (GitHub Copilot CLI)"
        echo "  3) Use default message"
        echo ""
        read -p "Choice (1/2/3, default: 2): " -n 1 -r COMMIT_CHOICE_NUM
        echo
        echo ""
        
        # Default to AI if empty
        if [[ -z "$COMMIT_CHOICE_NUM" ]] || [[ "$COMMIT_CHOICE_NUM" == "2" ]]; then
            echo "ai"
        elif [[ "$COMMIT_CHOICE_NUM" == "1" ]]; then
            echo "custom"
        else
            echo "default"
        fi
    fi
}

# Display repository status table
display_repo_status() {
    local -n repos=$1
    local -n info=$2
    
    if [[ ${#repos[@]} -eq 0 ]]; then
        echo "No git repositories found in $ORG_ROOT"
        return 1
    fi
    
    echo "Repository Status:"
    echo "════════════════════════════════════════════════════════════"
    for i in "${!info[@]}"; do
        printf "%2d. %s\n" $((i+1)) "${info[$i]}"
    done
    echo "════════════════════════════════════════════════════════════"
    echo ""
    return 0
}

# Show progress indicator for a running process
# Usage: show_progress "message" & PID=$!; your_command; kill $PID 2>/dev/null
show_progress() {
    local message="${1:-Working}"
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    
    while true; do
        i=$(( (i+1) % 10 ))
        printf "\r${message}... ${spin:$i:1} " >&2
        sleep 0.1
    done
}
