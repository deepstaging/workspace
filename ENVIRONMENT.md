# Deepstaging Environment Configuration

This document describes the environment variables, directory structure, and requirements for repositories in the Deepstaging ecosystem.

## Overview

The Deepstaging workspace uses environment variables and direnv to provide a consistent development environment across all repositories. This enables:

- 🔧 Shared tooling and automation scripts
- 📦 Centralized NuGet package management
- 🏗️ Common build and publish workflows
- 🚀 Cross-repository integration

## Environment Variables

### Required Variables

These environment variables are automatically set by direnv when you're in the Deepstaging org root:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DEEPSTAGING_ORG_ROOT` | Root directory containing workspace and repositories | `/Users/chris/code/org/deepstaging` |
| `DEEPSTAGING_WORKSPACE_DIR` | Path to the workspace repository | `$DEEPSTAGING_ORG_ROOT/workspace` |
| `DEEPSTAGING_REPOSITORIES_DIR` | Path to repositories directory | `$DEEPSTAGING_ORG_ROOT/repositories` |
| `DEEPSTAGING_LOCAL_NUGET_FEED` | Local NuGet feed directory | `$HOME/.nuget/local-feed` |
| `DEEPSTAGING_GITHUB_ORG` | GitHub organization name | `deepstaging` |

### PATH Extensions

When direnv is active, the following directories are added to `PATH`:

1. **`$DEEPSTAGING_WORKSPACE_DIR/scripts`** - Workspace automation scripts
2. **`$DEEPSTAGING_WORKSPACE_DIR/node_modules/.bin`** - TypeScript tools (tsx, etc.)
3. **`$DEEPSTAGING_ORG_ROOT/.direnv/bin`** - Repository script aliases

## Directory Structure

### Standard Layout

```
~/code/org/deepstaging/              # DEEPSTAGING_ORG_ROOT
├── .envrc                          # Loaded by direnv
├── .direnv/                        # Generated script aliases
│   └── bin/                        # Repository script symlinks
├── packages/                       # DEEPSTAGING_LOCAL_NUGET_FEED
├── workspace/                      # DEEPSTAGING_WORKSPACE_DIR
│   ├── scripts/                    # Shared automation
│   │   ├── bootstrap.sh
│   │   ├── packages-publish.ts
│   │   ├── repository-create.ts
│   │   └── ...
│   └── .envrc                      # Template (copied to parent)
└── repositories/                   # DEEPSTAGING_REPOSITORIES_DIR
    ├── deepstaging/
    ├── effects/
    └── my-roslyn-tool/
```

## Repository Requirements

### For Full Integration

To participate in the Deepstaging ecosystem features, a repository should:

#### 1. Script Structure

Include a `scripts/` directory with standard scripts:

```
my-repository/
├── scripts/
│   ├── build.sh         # Build the project
│   ├── test.sh          # Run tests
│   ├── publish.sh       # Publish packages to local feed
│   └── clean.sh         # Clean build artifacts (optional)
└── src/
```

#### 2. Environment Variable Usage

Scripts should use environment variables when available:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Check for required environment variable
if [ -z "${DEEPSTAGING_WORKSPACE_DIR:-}" ]; then
  echo "Error: DEEPSTAGING_WORKSPACE_DIR not set."
  echo "Please run 'direnv allow' in the org root: $DEEPSTAGING_ORG_ROOT"
  exit 1
fi

# Use environment variables for paths
WORKSPACE_SCRIPTS="$DEEPSTAGING_WORKSPACE_DIR/scripts"
ARTIFACTS_DIR="$REPO_DIR/artifacts"
```

#### 3. Publish Script Pattern

The `scripts/publish.sh` should delegate to the workspace publish script:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Use DEEPSTAGING_WORKSPACE_DIR if set
if [ -z "${DEEPSTAGING_WORKSPACE_DIR:-}" ]; then
  echo "Error: DEEPSTAGING_WORKSPACE_DIR not set. Please run 'direnv allow' in the org root."
  exit 1
fi

# Artifacts output controlled by Directory.Build.props (defaults to ./artifacts)
ARTIFACTS_ARG="--artifacts $REPO_DIR/artifacts"

# Extract project name from directory
PROJECT_NAME=$(basename "$REPO_DIR")

exec tsx "$DEEPSTAGING_WORKSPACE_DIR/scripts/packages-publish.ts" "$PROJECT_NAME" $ARTIFACTS_ARG "$@"
```

### For Standalone Use

Repositories can still work independently without the environment:

- Scripts should check if environment variables are set
- Provide sensible defaults when running standalone
- Document any required setup in repository README

## Features Enabled by Environment

### 1. Shared Artifacts Directory

**Purpose**: Test packages locally before publishing to public feeds

### 2. Build Artifacts

Each repository manages its own build artifacts in a local `./artifacts/` directory (gitignored). This follows standard .NET practices and keeps repositories self-contained.

**How it works**:
- Packages published to `$DEEPSTAGING_LOCAL_NUGET_FEED`
- Configure in `NuGet.Config`:
  ```xml
  <add key="deepstaging-local" value="/Users/chris/.nuget/local-feed" />
  ```
- Workspace script handles versioning and cleanup

### 3. Script Aliases

**Purpose**: Run repository scripts from anywhere

**How it works**:
- Workspace `refresh` script generates aliases in `.direnv/bin/`
- Example: `deepstaging_build` runs `repositories/deepstaging/scripts/build.sh`
- All aliases available when direnv is active

### 4. Workspace Automation

**Purpose**: Cross-repository operations and code generation

**How it works**:
- TypeScript scripts in `workspace/scripts/`
- Use shared libraries for common operations
- Examples:
  - `packages-publish.ts` - Build and publish to local feed
  - `repository-create.ts` - Create new repo from template
  - `repositories-sync.ts` - Sync all repos with AI commits

## Setup Instructions

### For New Developers

1. **Clone workspace** and run bootstrap:
   ```bash
   mkdir -p ~/code/org/deepstaging
   cd ~/code/org/deepstaging
   git clone git@github.com:deepstaging/workspace.git
   cd workspace
   ./scripts/bootstrap.sh
   ```

2. **Reload shell** to activate direnv:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc if not present:
   eval "$(direnv hook bash)"  # or zsh
   
   source ~/.bashrc  # or ~/.zshrc
   ```

3. **Allow direnv** in org root:
   ```bash
   cd ~/code/org/deepstaging
   direnv allow
   ```

4. **Verify setup** with environment check:
   ```bash
   cd workspace
   npm run environment-check
   ```

### For New Repositories

When creating a repository from a template:

1. **Use the workspace creation script**:
   ```bash
   cd workspace
   npm run create-repository
   ```

2. **Or manually ensure**:
   - Scripts use `DEEPSTAGING_WORKSPACE_DIR` environment variable
   - Include standard `scripts/` directory
   - Document any special requirements

## Troubleshooting

### Environment Check Utility

Run the environment check utility anytime to verify your setup:

```bash
cd workspace
npm run environment-check
# or if direnv is loaded:
environment-check
```

This read-only script checks:
- ✅ All required environment variables are set
- ✅ Directory structure exists
- ✅ Required and optional tools are installed
- ✅ direnv is configured and active
- ✅ PATH includes workspace scripts and aliases

The script does not modify anything - it only validates your configuration.

### Environment Variables Not Set

**Symptom**: Scripts fail with "DEEPSTAGING_WORKSPACE_DIR not set"

**Solution**: 
```bash
cd ~/code/org/deepstaging  # Go to org root
direnv allow               # Allow .envrc to load
```

### Scripts Not Found in PATH

**Symptom**: Repository script aliases don't work

**Solution**:
```bash
cd ~/code/org/deepstaging
refresh  # Regenerate script aliases
```

### Wrong Workspace Path

**Symptom**: Environment points to wrong directory

**Solution**:
```bash
cd ~/code/org/deepstaging  # Ensure you're in correct org root
direnv reload              # Reload environment
```

## Best Practices

### ✅ DO

- Check for `DEEPSTAGING_WORKSPACE_DIR` before using it
- Provide helpful error messages when environment is not set
- Use environment variables for all cross-repository paths
- Keep scripts portable (work with or without environment)
- Document any special environment requirements

### ❌ DON'T

- Hardcode absolute paths to workspace or repositories
- Assume environment variables are always set
- Use complex path calculations when env vars are available
- Modify the `.envrc` file without updating this documentation

## Related Documentation

- **[README.md](./README.md)** - Getting started and workspace overview
- **[.envrc](./.envrc)** - Environment variable definitions
- **[scripts/README.md](./scripts/README.md)** - Automation scripts documentation
