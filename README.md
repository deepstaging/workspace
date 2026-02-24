# Deepstaging Workspace

Developer tooling for the Deepstaging multi-repo ecosystem.

## Quick Start

```bash
# Clone the workspace repo:
git clone git@github.com:deepstaging/workspace.git
cd workspace

# Bootstrap (installs tools, clones repos, sets up hooks & NuGet feed):
./bootstrap.sh
```

### Directory Layout

```
workspace/                ← this repo (org root)
├── repos/                ← cloned by init.sh (.gitignored)
│   ├── roslyn/
│   ├── deepstaging/
│   ├── deepstaging-web/
│   ├── assets/
│   └── .github/
├── scripts/
├── hooks/
├── packages/             ← local NuGet feed
├── init.sh
├── bootstrap.sh
├── .envrc
└── Brewfile
```

## Scripts

All scripts are in `scripts/` and added to `PATH` via direnv.

| Script | Purpose |
|--------|---------|
| `build-all.sh` | Cascading build: roslyn → deepstaging → web |
| `pack-local.sh` | Pack NuGet packages to local feed |
| `repack-consumer.sh` | Pack deps + clean-rebuild a consumer project |
| `purge-caches.sh` | Remove bin/obj from all repos |
| `sync-icons.sh` | Build & distribute package icons from assets repo |
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

### repack-consumer.sh

Pack Deepstaging dependencies and clean-rebuild a consumer project in one step.
Consumer projects are registered in `consumers.conf` at the workspace root.

```bash
repack-consumer.sh                # Interactive menu (MRU-ordered)
repack-consumer.sh SharedNotes    # By name
repack-consumer.sh --list         # Show consumers + resolved pack chains
repack-consumer.sh --pack-only    # Pack deps without rebuilding
repack-consumer.sh --no-pack      # Just clean + rebuild (packages already fresh)
repack-consumer.sh --purge        # Also remove bin/obj (full clean rebuild)
```

See [Consumer Projects](docs/consumer-projects.md) for details on registering
and managing consumer projects.

## Init & Cloning

`init.sh` clones all repositories into `repos/`. It is called automatically
by `bootstrap.sh`, but you can run it standalone:

```bash
./init.sh              # Clone via SSH (default)
./init.sh --https      # Clone via HTTPS
```

## Git Hooks

Shared hooks are installed into all cloned repos by `bootstrap.sh`.

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
| `DEEPSTAGING_ORG_ROOT` | This directory (workspace root) |
| `DEEPSTAGING_WORKSPACE_DIR` | Same as `ORG_ROOT` |
| `DEEPSTAGING_LOCAL_NUGET_FEED` | `$ORG_ROOT/packages` — local NuGet source |

## Dependency Graph

```
roslyn → deepstaging → deepstaging-web
```

Build and pack scripts follow this order automatically.
