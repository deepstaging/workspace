# Deepstaging Workspace

This repository contains workspace configuration and tooling for the Deepstaging ecosystem.

## Purpose

This is the **control plane** for multi-repository development. Clone this repo, run bootstrap scripts, and work across all Deepstaging repositories with shared context.

## Directory Structure

**After bootstrap:**
```
~/code/org/deepstaging/              # Parent directory (not a git repo)
├── workspace/           # This repository (git)
│   ├── .claude/                     # Claude agent state (gitignored)
│   ├── .copilot/                    # GitHub Copilot state (gitignored)  
│   ├── .cursor/                     # Cursor editor state (gitignored)
│   ├── .docs/                       # Permanent workspace knowledge (tracked)
│   ├── .session/                    # Temporary session notes (gitignored)
│   ├── .copilot-instructions.md     # Agent instructions
│   ├── scripts/                     # Cross-repo automation
│   │   └── bootstrap.sh             # Setup script
│   └── README.md                    # This file
├── deepstaging/                     # Core infrastructure (git)
├── effects/                         # Effects framework (git)
└── github-profile/                  # GitHub org profile (git)
```

## Getting Started

### Prerequisites

**Homebrew** (macOS/Linux package manager):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1. Clone this workspace repository

```bash
mkdir -p ~/code/org/deepstaging
cd ~/code/org/deepstaging
git clone git@github.com:yourorg/workspace.git
cd workspace
```

### 2. Run bootstrap script

```bash
./scripts/bootstrap.sh
```

This will:
- Check for required dependencies (installs via `Brewfile` if missing)
- **Install Node.js and npm packages for TypeScript scripts**
- Copy `.envrc` to parent directory (enables cross-repo script aliases via direnv)
- Discover all Deepstaging repositories via GitHub CLI
- Let you clone all or select individual repos
- Set up local NuGet feed directory
- Configure direnv for automatic environment loading

**What gets installed (via Brewfile):**
- `gh` - GitHub CLI for repository operations
- `direnv` - Auto-loads environment/scripts per directory
- `jq` - JSON parsing for automation
- `ripgrep` - Fast code search
- `node` - JavaScript runtime for TypeScript scripts
- `fzf` - Interactive selection menus
- Optional: `copilot-cli` - AI-powered commit messages

### 3. Reload your shell

The bootstrap script sets up direnv, but you need to ensure the hook is loaded:

```bash
# Add to your shell config (~/.bashrc or ~/.zshrc) if not already there:
eval "$(direnv hook bash)"  # or zsh

# Then reload:
source ~/.bashrc  # or ~/.zshrc
```

### 4. Start developing

Navigate to any repository and direnv automatically loads the environment:

```bash
cd ../deepstaging
# Scripts are now available as commands!
```

**Use TypeScript scripts for AI-powered workflows:**
```bash
cd workspace
npm run sync              # Repository sync with AI commits
npm run sync -- --help    # Show help

# Or use the wrapper (after direnv loads):
ts-sync                   # Direct command
```

**Benefits of direnv integration:**
- 🚀 Automatic Homebrew environment loading
- 📝 Script commands from all repositories
- 🔧 TypeScript workspace scripts in PATH
- 🤖 AI-powered commit messages via GitHub Copilot
- 🔄 Environment loads/unloads as you navigate directories

## TypeScript Scripts 🆕

The workspace now uses **TypeScript for scripting** instead of bash, providing:

### Why TypeScript?

- ✅ **Type safety** - Catch errors at compile time
- ✅ **Better async** - Clean async/await syntax (familiar to C# devs)
- ✅ **Rich libraries** - Professional terminal UI (inquirer, ora, chalk)
- ✅ **No stdin/tty issues** - Interactive prompts work reliably
- ✅ **Familiar syntax** - Interfaces, classes, generics like C#

### Available Scripts

**sync-repos** - AI-powered repository synchronization:
```bash
cd workspace
npm run sync              # Run with AI commit messages
npm run sync -- --help    # Show options
```

Features:
- Scans all repositories for changes
- Interactive commit strategy selection
- **AI-generated commit messages** via GitHub Copilot CLI
- Beautiful terminal UI with spinners and prompts
- Type-safe git operations

### Development

**Run TypeScript directly** (no compilation needed):
```bash
npm run sync
```

**Compile to JavaScript**:
```bash
npm run build
./scripts/sync-repos.js
```

**Add new scripts**:
1. Create `.ts` file in `scripts-ts/`
2. Use shared libraries from `scripts-ts/lib/`
3. Add npm script to `package.json`

See `scripts-ts/README.md` and `.docs/TYPESCRIPT_MIGRATION.md` for details.

## Key Concepts

### Parent Directory is NOT a Git Repo

The parent directory (`~/code/org/deepstaging/`) is just a container. Only the workspace and individual repos are git repositories.

### Workspace Repository = Control Plane

This repository (`workspace/`) contains:
- **`.docs/`** - Permanent workspace knowledge (conventions, guides, architecture)
- **`.session/`** - Temporary working notes (gitignored)
- **Agent directories** - Centralized AI agent state and memory
- **`scripts/`** - Bootstrap, build, test, publish automation

### Individual Repositories = Clean and Portable

Each repo (`deepstaging/`, `effects/`, etc.):
- Can be cloned and used independently
- Contains only production code and configuration
- Has its own `docs/` for user-facing documentation
- Does **not** contain agent state (`.claude/`, etc.)

## Repositories in Ecosystem

- **deepstaging** - Core Roslyn infrastructure (queries, generators, testing)
- **effects** - Effects analysis framework
- **github-profile** - GitHub organization profile and documentation

## Documentation

- **Workspace knowledge**: `.docs/` - Conventions, guides, architecture (git tracked)
- **Session notes**: `.session/` - Temporary working notes (gitignored)
- **Package docs**: `../deepstaging/docs/`, `../effects/docs/` - User-facing documentation

## Agent Configuration

See `.copilot-instructions.md` for agent behavior and conventions.
All agents should use the workspace-level configuration to maintain context across repositories.
test change
