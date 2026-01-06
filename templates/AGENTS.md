# AI Agent Instructions - Deepstaging Workspace

This document provides comprehensive guidance for AI agents (GitHub Copilot, Cursor, Claude, etc.) working in the Deepstaging multi-repository workspace.

---

## 🏗️ Workspace Architecture

This is a **multi-repository workspace** with a control plane design:

```
~/org/my-org/                    # Organization root (DEEPSTAGING_ORG_ROOT)
├── .envrc                        # Environment configuration (direnv)
├── .copilot/                     # GitHub Copilot context/state
├── .cursor/                      # Cursor AI context/state
├── .claude/                      # Claude context/state
├── workspace/                    # Control plane (this repo)
│   ├── scripts/                  # Automation scripts (TypeScript)
│   ├── templates/                # Bootstrap templates
│   └── .docs/                    # Design documents
├── repositories/                 # Your product repositories
│   ├── my-library/              # Example: a library project
│   ├── my-service/              # Example: a service project
│   └── [other-repos]/           # Additional repos
├── artifacts/                    # Build outputs
└── packages/                     # Local NuGet feed
```

### Key Principles

1. **Workspace is the control plane** - All orchestration, automation, and tooling lives here
2. **Repositories are portable** - Product repos should not depend on workspace structure
3. **Agent context is workspace-scoped** - Shared knowledge across all repositories
4. **Scripts are generated** - Wrapper commands auto-generated for each repository

---

## 📂 Directory Guide

### Workspace Directories

| Path | Purpose |
|------|---------|
| `workspace/scripts/` | TypeScript automation scripts |
| `workspace/scripts/lib/` | Shared library code |
| `workspace/scripts/bootstrap/` | Bootstrap entry point |
| `workspace/templates/` | Bootstrap templates (agent dirs, script wrappers) |
| `workspace/.docs/` | Design documents and notes |
| `workspace/docs/` | User-facing documentation |

### Generated/Runtime Directories

| Path | Purpose |
|------|---------|
| `repositories/` | Cloned product repositories |
| `artifacts/` | Build outputs from all repositories |
| `packages/` | Local NuGet feed for testing |
| `.direnv/bin/` | Generated script aliases |

---

## 🎯 Common Tasks

### Creating a New Repository

```bash
workspace-repository-create
```

This interactive command:
1. Prompts for repository name
2. Selects a template (e.g., `deepstaging-roslyn`)
3. Generates complete repository structure
4. Initializes git
5. Creates wrapper scripts
6. Publishes initial packages to local feed

**Key Files:**
- `scripts/repository-create.ts` - Main implementation
- `templates/script-wrappers/*.template` - Script wrapper templates

### Publishing Packages

Each repository gets auto-generated wrapper commands:

```bash
my-library-publish         # Publish my-library repo packages
my-service-publish         # Publish my-service repo packages
```

These are bash scripts in `.direnv/bin/` generated from templates.

### Syncing Repositories

```bash
workspace-repositories-sync
```

Commits and pushes changes across all repositories with:
- Uncommitted changes detection
- AI-generated commit messages (via GitHub Copilot CLI)
- Interactive repository selection
- Batch push operations

**Key Files:**
- `scripts/repositories-sync.ts` - Main implementation
- `scripts/lib/ai.ts` - AI commit message generation
- `scripts/lib/git.ts` - Git operations

### Environment Check

```bash
workspace-environment-check
```

Validates the entire workspace setup:
- Environment variables
- Directory structure
- Required tools
- direnv configuration
- PATH setup

**Key Files:**
- `scripts/environment-check.ts` - Validation logic

---

## 🔧 Key Scripts & Libraries

### Main Scripts

| Script | Purpose |
|--------|---------|
| `scripts/bootstrap/index.ts` | Initial workspace setup |
| `scripts/repository-create.ts` | Create new repositories |
| `scripts/repositories-sync.ts` | Sync all repos to GitHub |
| `scripts/environment-check.ts` | Validate workspace |
| `scripts/script-aliases-generate.ts` | Generate wrapper commands |

### Library Modules

| Module | Purpose |
|--------|---------|
| `scripts/lib/bootstrap/` | Bootstrap functionality (env, deps, dirs, repos, finalize) |
| `scripts/lib/ai.ts` | AI integration (commit messages) |
| `scripts/lib/dotnet.ts` | .NET operations (build, test, pack) |
| `scripts/lib/git.ts` | Git operations |
| `scripts/lib/github.ts` | GitHub API operations |
| `scripts/lib/nuget.ts` | NuGet operations |
| `scripts/lib/types.ts` | TypeScript type definitions |
| `scripts/lib/ui.ts` | Terminal UI utilities |

---

## 🌍 Environment Variables

All set in `.envrc` at org root:

| Variable | Purpose |
|----------|---------|
| `DEEPSTAGING_ORG_ROOT` | Organization root directory |
| `DEEPSTAGING_WORKSPACE_DIR` | Workspace directory path |
| `DEEPSTAGING_REPOSITORIES_DIR` | Product repositories directory |
| `DEEPSTAGING_ARTIFACTS_DIR` | Build outputs directory |
| `DEEPSTAGING_LOCAL_NUGET_FEED` | Local NuGet packages directory |
| `DEEPSTAGING_GITHUB_ORG` | GitHub organization name |

---

## 🤖 Agent-Specific Guidelines

### When Making Changes

1. **Read before writing** - Understand existing patterns
2. **Use existing libraries** - Reuse code in `scripts/lib/`
3. **Follow TypeScript conventions** - Type-safe, modular code
4. **Update documentation** - Keep README and docs in sync
5. **Test thoroughly** - Run scripts to verify changes
6. **Small, surgical changes** - Minimize modifications

### Navigation Tips

- **Start with README.md** - High-level overview
- **Check scripts/lib/** - Existing utilities before creating new ones
- **Look at templates/** - Understanding bootstrap and generation patterns
- **Review .docs/** - Design decisions and architecture notes

### Code Style

- **Modular functions** - Small, focused, single-responsibility
- **Clear naming** - Intention-revealing names
- **Minimal comments** - Self-documenting code preferred
- **Error handling** - Try-catch with clear error messages
- **Chalk for output** - Color-coded terminal messages

### Common Patterns

**Script Structure:**
```typescript
#!/usr/bin/env tsx
import { someUtil } from './lib/utils.js';

async function main() {
  // Implementation
}

main().catch(error => {
  console.error(chalk.red('❌ Failed:'), error.message);
  process.exit(1);
});
```

**Terminal UI:**
```typescript
import { confirm, select, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';

console.log(chalk.blue('📋 Task name...\n'));
const choice = await select({
  message: 'Select option:',
  choices: [...]
});
console.log(chalk.green('✓ Success'));
```

---

## 📋 Workflow Examples

### Adding a New Workspace Command

1. Create script in `scripts/my-command.ts`
2. Add shebang: `#!/usr/bin/env tsx`
3. Import from `scripts/lib/` as needed
4. Make executable: `chmod +x scripts/my-command.ts`
5. Add to `package.json` scripts (optional)
6. Document in README.md

### Adding a New Repository Wrapper Command

1. Create template in `templates/script-wrappers/my-command.sh.template`
2. Use placeholders: `{{REPO_NAME}}`, `{{REPO_PATH}}`
3. Document in `templates/script-wrappers/README.md`
4. Run `workspace-script-aliases-generate` to regenerate

### Modifying Bootstrap Process

1. Identify the concern (env, deps, dirs, repos, finalize)
2. Edit appropriate module in `scripts/lib/bootstrap/`
3. Update main `scripts/bootstrap/index.ts` if needed
4. Test with: `./scripts/bootstrap/index.ts --yes`

---

## 🚨 Important Constraints

### Do NOT Do

- ❌ Add agent-specific files (`.copilot`, `.cursor`, `.claude`) to product repositories
- ❌ Make product repositories dependent on workspace structure
- ❌ Hardcode paths - use environment variables
- ❌ Create global state - keep scripts stateless
- ❌ Modify generated files - they'll be overwritten

### Always Do

- ✅ Keep repositories portable and standalone
- ✅ Use workspace scripts for orchestration
- ✅ Leverage existing library functions
- ✅ Maintain type safety in TypeScript
- ✅ Test changes thoroughly before committing

---

## 📚 Key Documentation

- `README.md` - Workspace overview and quick start
- `ENVIRONMENT.md` - Environment setup details
- `docs/WRAPPER_SCRIPTS.md` - Wrapper script system
- `templates/README.md` - Template structure
- `.docs/*.md` - Design documents and decisions

---

## 🎓 Learning the Codebase

**Recommended Reading Order:**
1. `README.md` - Understand the workspace purpose
2. `ENVIRONMENT.md` - Environment setup
3. `scripts/bootstrap/index.ts` - Entry point for workspace setup
4. `scripts/lib/bootstrap/*.ts` - Bootstrap modules
5. `scripts/repository-create.ts` - Repository generation
6. `scripts/lib/*.ts` - Utility libraries

**Key Concepts:**
- Multi-repository orchestration
- Template-driven code generation
- TypeScript-based automation
- direnv for environment management
- Local NuGet feed workflow

---

## 💡 Agent Best Practices

1. **Context is cumulative** - You have workspace-scoped memory in your agent directory
2. **Ask before large changes** - Confirm architectural decisions with user
3. **Leverage existing patterns** - Look for similar implementations first
4. **Preserve functionality** - Don't break working code
5. **Document as you go** - Update docs when making changes

---

*This file is automatically deployed during bootstrap to establish workspace-scoped agent context.*
