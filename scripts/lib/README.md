# Script Utilities Library

This directory contains utility functions and helper scripts that are sourced by the main scripts.

Files in this directory:
- Are **NOT** auto-discovered or aliased by `.envrc`
- Should be sourced/imported by main scripts
- Contain reusable functions and common functionality

## Why a separate `lib` directory?

The workspace `.envrc` scans for `*/scripts/` directories and creates aliases for all executable files. By placing utilities in `*/scripts/lib/`, they remain available for sourcing but don't clutter the command namespace with internal helper functions.

## Usage Example

```bash
#!/usr/bin/env bash

# Source utilities from lib directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/git-utils.sh"
source "$SCRIPT_DIR/lib/ui-helpers.sh"

# Now use functions from those files
validate_git_repo
show_spinner "Processing..."
```

## Guidelines

- Keep utility files focused on a single concern
- Use clear, descriptive function names
- Document functions with comments
- Make utilities testable and reusable

## Comment Standard for Sourced Functions

When calling functions from library files, use the special comment marker `#⮕` to indicate sourced functions:

```bash
#⮕ ui-helpers.sh: Display fzf menu to choose commit strategy
local method=$(select_commit_message_method)

#⮕ git-utils.sh: Create repository on GitHub if it doesn't exist
if ! ensure_github_repo_exists "$repo" "$ORG_ROOT" "$GITHUB_ORG" "$EXISTING_REPOS"; then
    return 1
fi
```

**Format:** `#⮕ <library-file>: <brief description>`

The bold arrow `⮕` makes it immediately clear that:
- This is a sourced function call (not defined locally)
- Which library file contains the function
- What the function does

This helps with code navigation and understanding dependencies at a glance.
