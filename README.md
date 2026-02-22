# Deepstaging Workspace

Developer tooling for the Deepstaging multi-repo ecosystem.

## Quick Start

```bash
# Clone all repos side-by-side:
#   ~/org/deepstaging/
#   ├── roslyn/
#   ├── deepstaging/
#   ├── deepstaging-web/
#   ├── assets/
#   ├── .github/
#   └── workspace/        ← you are here

# Bootstrap (installs tools, hooks, local NuGet feed):
./bootstrap.sh
```

## Scripts

All scripts are in `scripts/` and added to `PATH` via direnv.

| Script | Purpose |
|--------|---------|
| `build-all.sh` | Cascading build: roslyn → deepstaging → web |
| `pack-local.sh` | Pack NuGet packages to local feed |
| `purge-caches.sh` | Remove bin/obj from all repos |
| `check-env.sh` | Validate tools and environment |

### build-all.sh

```bash
build-all.sh              # Build all (Release)
build-all.sh --test       # Build + run tests
build-all.sh --skip web   # Skip deepstaging-web
build-all.sh --debug      # Debug configuration
```

### pack-local.sh

```bash
pack-local.sh                           # Pack all to local feed
pack-local.sh --version-suffix dev.42   # Custom version suffix
pack-local.sh --skip web                # Skip a repo
```

## Git Hooks

Shared hooks are installed into all sibling repos by `bootstrap.sh`.

| Hook | Behavior |
|------|----------|
| `pre-commit` | Blocks direct commits to main/master |
| `commit-msg` | Enforces minimum 10-char commit messages |

```bash
# Reinstall hooks manually:
./hooks/install.sh

# Remove hooks:
./hooks/install.sh --remove
```

## Environment

Uses [direnv](https://direnv.net/) for automatic environment setup. Key variables:

| Variable | Value |
|----------|-------|
| `DEEPSTAGING_ORG_ROOT` | Parent directory containing all repos |
| `DEEPSTAGING_WORKSPACE_DIR` | This directory |
| `DEEPSTAGING_LOCAL_NUGET_FEED` | `$ORG_ROOT/packages` — local NuGet source |

## Dependency Graph

```
roslyn → deepstaging → deepstaging-web
```

Build and pack scripts follow this order automatically.
