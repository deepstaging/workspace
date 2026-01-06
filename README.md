# Deepstaging Workspace

**A powerful control plane for multi-repository .NET development.**

Create production-ready repositories from templates, orchestrate builds, manage dependencies, and automate workflows—all from a single command center.

---

## 🚀 Why Use This Workspace?

### 1. **Template-Driven Repository Creation**

Create complete, production-ready repositories in seconds:

```bash
workspace-repository-create
```

**Available Templates:**
- 🔧 **deepstaging-roslyn** - Complete Roslyn tooling suite (analyzers, generators, code fixes, tests)
- 🎯 More templates coming soon

Each template generates:
- ✅ Full project structure with best practices
- ✅ Pre-configured analyzers and source generators
- ✅ Test projects with examples
- ✅ NuGet packaging setup
- ✅ Git repository initialized
- ✅ Documentation scaffolding
- ✅ Workspace integration scripts (generated from templates)

### 2. **Zero-Config Development Environment**

Bootstrap once, work anywhere:
- **direnv** auto-loads tools and commands
- **TypeScript automation** with type safety
- **Local NuGet feed** for testing packages
- **Interactive CLI** with beautiful terminal UI

### 3. **Multi-Repository Orchestration**

Manage multiple repositories from one place:
- Build, test, and publish across all repos
- Track package dependencies
- AI-powered commit messages
- Batch operations with interactive selection

---

## Quick Start

### Prerequisites

**Homebrew** (macOS/Linux):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Installation

```bash
# 1. Clone workspace
mkdir -p ~/code/org/deepstaging
cd ~/code/org/deepstaging
git clone git@github.com:deepstaging/workspace.git
cd workspace

# 2. Run bootstrap (installs everything)
./bootstrap.sh

# 3. Activate direnv
eval "$(direnv hook zsh)"  # Add to ~/.zshrc
source ~/.zshrc
direnv allow
```

**What bootstrap installs:**
- Required CLI tools (`gh`, `direnv`, `node`, `jq`, `ripgrep`, `fzf`)
- Deepstaging.Templates for scaffolding
- npm packages for TypeScript automation
- Local NuGet feed configuration

### Create Your First Repository

```bash
# Interactive - choose template and configure
workspace-repository-create

# Direct - specify template and name
workspace-repository-create -t deepstaging-roslyn -n MyAwesomeTool
```

This generates a complete repository at `../MyAwesomeTool/` with:
- Analyzer project (diagnostics and rules)
- Generator project (source generation)
- CodeFixes project (quick fixes)
- Test project (unit tests with examples)
- Contracts project (attributes/interfaces)
- NuGet packaging configured

### Build & Publish

```bash
cd ../MyAwesomeTool

# Build and test
dotnet build
dotnet test

# Publish to local NuGet feed (for testing)
workspace-packages-publish MyAwesomeTool

# Publish to NuGet.org (manual - use dotnet CLI)
dotnet nuget push ./artifacts/**/*.nupkg --source https://api.nuget.org/v3/index.json --api-key YOUR_KEY
```

---

## Core Commands

All commands available after direnv activation:

### Repository Management

```bash
# Create new repository from template
workspace-repository-create                    # Interactive
workspace-repository-create -t deepstaging-roslyn -n MyTool

# Sync repositories with GitHub
workspace-repositories-sync                    # Pull latest changes
workspace-repositories-sync --push            # Commit and push all

# Show package dependency graph
workspace-dependents-discover
```

### Package Management

```bash
# Publish packages to local feed (for testing)
workspace-packages-publish MyAwesomeTool

# Scan licenses
workspace-nuget-licenses-scan
```

**Note:** Publishing to NuGet.org should be done via CI/CD or manually with `dotnet nuget push`.

### Project Management

```bash
# Add new project to existing repository
workspace-project-create

# Generate .slnx solution files in workspace root
workspace-solutions-symlink
```

### Maintenance

```bash
# Clear build artifacts
workspace-caches-purge

# Check environment health
workspace-environment-check

# Re-run bootstrap
workspace-refresh
```

---

## Templates

### deepstaging-roslyn

Complete Roslyn tooling project with everything you need:

**Generated Structure:**
```
MyAwesomeTool/
├── src/
│   └── MyAwesomeTool/
│       ├── MyAwesomeTool.Analyzers/      # Diagnostic rules
│       ├── MyAwesomeTool.Generators/     # Source generators
│       ├── MyAwesomeTool.CodeFixes/      # Quick fixes
│       ├── MyAwesomeTool.Contracts/      # Public API
│       └── MyAwesomeTool.Nuget/          # Package bundling
├── tests/
│   └── MyAwesomeTool.Tests/              # Unit tests
├── .gitignore
└── README.md
```

**Features:**
- Pre-configured analyzer diagnostics
- Source generator scaffolding
- Code fix provider templates
- Test helpers and examples
- NuGet packaging with analyzers bundle
- Following Deepstaging conventions

### Installing Templates Manually

Templates are installed during bootstrap, but you can update them:

```bash
cd [path-to-templates-repo]
dotnet pack
dotnet new install ./bin/Deepstaging.Templates.*.nupkg
```

---

## Architecture

### Directory Structure

```
~/code/org/deepstaging/
├── workspace/                       # This repo (control plane)
│   ├── .docs/                      # Permanent knowledge base
│   ├── scripts/                    # TypeScript automation
│   ├── .envrc                      # Direnv configuration
│   └── package.json                # npm dependencies
│
└── [your-repositories]/             # Created via workspace-repository-create
    ├── MyAwesomeTool/
    ├── AnotherProject/
    └── ...
```

### Key Concepts

**Workspace = Control Plane**
- Centralized automation and tooling
- Template-driven repository scaffolding
- AI agent state (`.claude/`, `.copilot/`, `.cursor/`)
- Knowledge base (`.docs/`)

**Generated Repositories = Independent & Portable**
- Complete, standalone projects
- Production-ready code
- Can be cloned and used independently
- Follow Deepstaging conventions

**Templates = Battle-Tested Scaffolding**
- Proven project structures
- Best practices built-in
- Pre-configured tooling
- Instant productivity

---

## TypeScript Automation

All workspace scripts use TypeScript for:
- ✅ Type safety - Catch errors before runtime
- ✅ Rich libraries - Professional terminal UI
- ✅ Async/await - Clean asynchronous code
- ✅ Familiar syntax - Like C# with interfaces, classes, generics

**Run scripts via npm:**
```bash
npm run repository-create
npm run packages-publish
npm run repositories-sync
```

**Or use direnv aliases:**
```bash
workspace-repository-create
workspace-packages-publish
workspace-repositories-sync
```

---

## Documentation

### Core Documentation
- **[WRAPPER_SCRIPTS.md](docs/WRAPPER_SCRIPTS.md)** - How wrapper scripts are generated for new repositories
- **Workspace Docs**: `.docs/` - Architecture, conventions, guides
- **Session Notes**: `.session/` - Temporary working notes (gitignored)
- **Generated Repos**: Each repo has its own user-facing documentation

---

## AI Agent Configuration

See `.copilot-instructions.md` for agent behavior and workspace conventions.

All AI agents (Claude, Copilot, Cursor) share workspace context for consistency.

---

## Contributing

To add new templates or improve automation:

1. Create templates in a separate repository
2. Package as `dotnet new` templates
3. Update bootstrap to install them
4. Add TypeScript scripts to `scripts/`
5. Document in `.docs/`

---

## License

All Deepstaging projects are licensed under GPL-v3. Here's what that means in plain English:

**You can:**
- Use this workspace and all generated code for anything (personal projects, work, commercial products)
- Modify it however you want
- Share it with others

**But if you distribute your code that uses this:**
- You must share your source code too
- Your code must also be GPL-v3
- You can't add restrictions that GPL-v3 doesn't have

**Why GPL-v3?** We want this to stay open source. If you build something cool with it, others should be able to learn from and improve your work too.

**Internal use is fine:** If you're using this at work and not distributing your software outside your company, you don't have to share anything.

See the [LICENSE](../LICENSE) file for the full legal text.
