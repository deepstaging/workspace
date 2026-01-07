# Git Hooks

Centralized git hooks for all repositories in the workspace.

## Overview

This directory contains shared git hooks that can be installed into any repository using the `workspace-hooks-install` command. Hooks are symlinked, so updates to the hooks in the workspace automatically apply to all repositories.

## Available Hooks

### pre-commit

Runs before each commit to enforce code quality and consistency:
- Prevents commits to protected branches (main, master)
- Validates commit message format (optional)
- Runs linters/formatters (if configured in repository)

### commit-msg

Validates commit message format after editing:
- Ensures conventional commit format (optional)
- Checks for issue references (optional)

### pre-push

Runs before pushing to remote:
- Validates tests pass (if configured in repository)
- Checks for security issues (if configured)

## Installation

### Install hooks in a single repository:

```bash
cd repositories/my-repo
workspace-hooks-install
```

### Install hooks in all repositories:

```bash
workspace-hooks-install --all
```

### Uninstall hooks:

```bash
cd repositories/my-repo
workspace-hooks-install --uninstall
```

## Hook Execution

Hooks are executed via `prek` which provides:
- Per-repository hook configuration
- Hook execution management
- Easy enable/disable per repository

## Customization

Repositories can customize hook behavior using `.prekrc` in the repository root:

```json
{
  "pre-commit": {
    "enabled": true,
    "commands": ["npm run lint", "npm test"]
  },
  "pre-push": {
    "enabled": true,
    "commands": ["npm run build"]
  }
}
```

## Creating New Hooks

1. Create a new executable script in this directory (e.g., `pre-commit`)
2. Make it executable: `chmod +x hooks/pre-commit`
3. Document it in this README
4. Run `workspace-hooks-install --all` to deploy to all repositories
