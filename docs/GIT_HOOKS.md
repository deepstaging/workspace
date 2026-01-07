# Git Hooks System

Documentation for the centralized git hooks system in the Deepstaging workspace.

## Overview

The workspace provides a centralized git hooks system that allows you to:
- Define hooks once in the workspace
- Install them into repositories via symlinks
- Update hooks once and apply to all repositories automatically
- Per-repository customization via `prek` configuration

## Quick Start

### Install hooks in your current repository:

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
workspace-hooks-install --uninstall        # Current repo
workspace-hooks-install --all --uninstall  # All repos
```

## Available Hooks

### pre-commit

**What it does:**
- Prevents direct commits to protected branches (main, master, production, prod)
- Executes repository-specific pre-commit commands (via prek)

**Example error:**
```
❌ Direct commits to 'main' are not allowed.
   Please create a feature branch and submit a pull request.
   
   To create a branch:
   git checkout -b feature/your-feature-name
```

### commit-msg

**What it does:**
- Validates commit message length (minimum 10 characters)
- Skips validation for merge commits
- Optional: Conventional commit format (commented out by default)
- Executes repository-specific commit-msg commands (via prek)

**Example error:**
```
❌ Commit message too short (minimum 10 characters).
   Your message: fix bug
```

### pre-push

**What it does:**
- Executes repository-specific pre-push commands (via prek)
- Useful for running tests before pushing

## How It Works

### 1. Centralized Hooks

All hooks live in `workspace/hooks/`:
```
workspace/
└── hooks/
    ├── README.md
    ├── pre-commit
    ├── commit-msg
    └── pre-push
```

### 2. Symlinks to Repositories

When you run `workspace-hooks-install`, symlinks are created:

```
repositories/my-repo/.git/hooks/
├── pre-commit -> ../../../workspace/hooks/pre-commit
├── commit-msg -> ../../../workspace/hooks/commit-msg
└── pre-push -> ../../../workspace/hooks/pre-push
```

### 3. Automatic Updates

Because hooks are symlinked, updates to `workspace/hooks/*` automatically apply to all repositories with installed hooks. No need to re-install!

## Per-Repository Customization

Use `prek` to customize hook behavior per repository.

### Example: .prekrc in repository root

```json
{
  "pre-commit": {
    "enabled": true,
    "commands": [
      "dotnet build",
      "dotnet test --no-build"
    ]
  },
  "pre-push": {
    "enabled": true,
    "commands": [
      "dotnet test"
    ]
  }
}
```

### Example: .prekrc for Node.js project

```json
{
  "pre-commit": {
    "enabled": true,
    "commands": [
      "npm run lint",
      "npm run test"
    ]
  },
  "pre-push": {
    "enabled": true,
    "commands": [
      "npm run build",
      "npm run test"
    ]
  }
}
```

### Disabling Hooks

To disable hooks for a specific repository without uninstalling:

```json
{
  "pre-commit": {
    "enabled": false
  }
}
```

Or temporarily bypass during commit:

```bash
git commit --no-verify -m "Emergency fix"
```

## Creating Custom Hooks

### 1. Create the hook script

```bash
cd workspace/hooks
touch my-custom-hook
chmod +x my-custom-hook
```

### 2. Add hook logic

```bash
#!/usr/bin/env bash
set -e

echo "Running my custom hook..."

# Your hook logic here

# Optional: Run prek commands
if command -v prek &> /dev/null; then
  prek run my-custom-hook 2>/dev/null || true
fi

exit 0
```

### 3. Install in repositories

```bash
workspace-hooks-install --all
```

Git will automatically execute hooks based on their name (e.g., `pre-commit`, `post-checkout`, `pre-push`, etc.).

## Troubleshooting

### Hooks not executing?

1. **Check if hooks are installed:**
   ```bash
   ls -la .git/hooks/pre-commit
   ```
   Should show a symlink: `pre-commit -> ../../hooks/pre-commit`

2. **Check if hooks are executable:**
   ```bash
   ls -l workspace/hooks/pre-commit
   ```
   Should show `-rwxr-xr-x`

3. **Test hook manually:**
   ```bash
   .git/hooks/pre-commit
   ```

### Existing hooks conflict?

If a repository already has hooks, `workspace-hooks-install` will skip them and show a warning:

```
⚠ my-repo
  pre-commit: File exists (not a symlink, skipping)
```

To replace existing hooks:
1. Backup existing hooks
2. Remove them: `rm .git/hooks/pre-commit`
3. Re-run: `workspace-hooks-install`

### Bypassing hooks temporarily

For emergency fixes:
```bash
git commit --no-verify -m "Emergency fix"
git push --no-verify
```

**Note:** Use sparingly! Hooks exist to prevent issues.

## Best Practices

### 1. Keep hooks fast
Hooks run on every commit/push. Keep them under 1-2 seconds when possible.

### 2. Use prek for expensive operations
Let developers configure what runs via `.prekrc` rather than forcing it in the hook.

### 3. Provide clear error messages
Include remediation steps in error messages:
```bash
echo "❌ Tests failed."
echo "   Fix tests and try again, or skip with: git commit --no-verify"
```

### 4. Don't block on warnings
Reserve `exit 1` for critical issues. Use informational messages for warnings.

### 5. Document your hooks
Update `workspace/hooks/README.md` when adding new hooks.

## Integration with Repository Creation

When creating repositories via `workspace-repository-create`, consider adding a post-creation step to install hooks automatically:

```typescript
// In repository-create.ts after repo creation:
execSync('workspace-hooks-install', { 
  cwd: repoPath,
  stdio: 'inherit' 
});
```

This ensures new repositories start with hooks enabled by default.

## Related Commands

```bash
# Environment check (verifies prek is installed)
workspace-environment-check

# Install dependencies (includes prek)
brew bundle install

# View hooks in a repository
ls -la .git/hooks/

# Test a hook manually
.git/hooks/pre-commit
```

## References

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [prek - Git Hooks Manager](https://github.com/your-org/prek)
- Hooks source: `workspace/hooks/`
- Installation script: `workspace/scripts/hooks-install.ts`
