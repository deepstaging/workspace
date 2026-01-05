# Deepstaging Environment Variables

When working in the Deepstaging workspace, the `.envrc` file automatically exports standard environment variables for use in scripts.

## Available Variables

### `DEEPSTAGING_ORG_ROOT`
**Type:** Directory path  
**Example:** `/Users/username/code/org/deepstaging`  
**Description:** Root directory containing all Deepstaging repositories (deepstaging, effects, workspace, etc.)

### `DEEPSTAGING_WORKSPACE_DIR`
**Type:** Directory path  
**Example:** `/Users/username/code/org/deepstaging/workspace`  
**Description:** Location of the workspace repository containing shared scripts and configuration

### `DEEPSTAGING_GITHUB_ORG`
**Type:** String  
**Value:** `deepstaging`  
**Description:** GitHub organization name for all Deepstaging repositories

### `DEEPSTAGING_LOCAL_NUGET_FEED`
**Type:** Directory path  
**Value:** `$HOME/.nuget/local-feed`  
**Description:** Local NuGet package feed for development and testing

## Usage in Scripts

Scripts should use these variables with fallback values for standalone execution:

```bash
#!/bin/bash

# Use environment variables if available (from .envrc), otherwise calculate
ORG_ROOT="${DEEPSTAGING_ORG_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
WORKSPACE_DIR="${DEEPSTAGING_WORKSPACE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCAL_NUGET_FEED="${DEEPSTAGING_LOCAL_NUGET_FEED:-$HOME/.nuget/local-feed}"
GITHUB_ORG="${DEEPSTAGING_GITHUB_ORG:-deepstaging}"
```

This pattern:
- ✅ Uses environment variables when available (via direnv)
- ✅ Falls back to calculating paths when run standalone
- ✅ Works both inside and outside the workspace

## Important Notes

⚠️ **These variables are ONLY for scripts**

- Do NOT rely on these in application code
- Do NOT use these in CI/CD pipelines
- Do NOT use these in build configurations

They exist solely to simplify workspace scripts and provide consistency across the multi-repository setup.

## Debugging

Enable verbose direnv output to see variable values:

```bash
export DEBUG_ENVRC=1
direnv allow
cd deepstaging  # or any repo
```

This will show:
```
[direnv debug] Environment variables set:
[direnv debug]   DEEPSTAGING_ORG_ROOT=/Users/username/code/org/deepstaging
[direnv debug]   DEEPSTAGING_WORKSPACE_DIR=/Users/username/code/org/deepstaging/workspace
[direnv debug]   DEEPSTAGING_GITHUB_ORG=deepstaging
[direnv debug]   DEEPSTAGING_LOCAL_NUGET_FEED=/Users/username/.nuget/local-feed
```
