# Workspace Specification - Clarifications Needed

**Created:** 2026-01-05  
**Purpose:** Define sections needed to turn "Workspace Specification.md" into an actionable design document

## Key Insight

**We don't need to migrate anything!** This can be a new repository that implements the vision from scratch. The current workspace setup is already very close to the target.

## Sections to Add to Workspace Specification

### **1. Architecture Overview**

**What's needed:** High-level component relationships

```
Workspace Repository (new/standalone)
├── scripts/ & scripts-ts/        → Cross-repo automation  
├── .envrc                         → Auto-loads environment
├── bootstrap.sh                   → Setup process
└── .docs/                         → Conventions & guides

Template Packages (consumed via NuGet)
├── Deepstaging.Templates          → Roslyn-focused templates
├── YourOrg.Templates              → Custom organizational templates
└── Any.Templates                  → Any dotnet template package

Generated Repositories (siblings to workspace)
├── Created via: `workspace-create-repository`
├── Follow: Standard conventions (src/, tests/, *.sln at root)
└── Integrate: Auto-discovered by .envrc on next load
```

All of this is pretty good. I think `workspace-create-repository` should have the optional of installing templates. If not installing from a template, follow our conventions.

### **2. Template Discovery System**

**What's needed:** How workspace finds available templates

```typescript
// Approach: Use dotnet CLI template system directly
async function discoverTemplates() {
  // 1. List installed dotnet templates
  const output = await exec('dotnet new list --columns Type,Short Name,Language,Tags');
  
  // 2. Filter to project templates (not item templates)
  const projectTemplates = output.filter(t => t.type === 'Project');
  
  // 3. Present to user
  return projectTemplates.map(t => ({
    name: t.shortName,
    description: t.description,
    tags: t.tags
  }));
}

// Users install templates beforehand:
// dotnet new install Deepstaging.Templates
// dotnet new install YourOrg.Templates
```

I think we install Deepstaging.Templates automatically, maybe a small opt-in somewhere.

And list with `dotnet new list`


**No custom template registry needed - leverage dotnet's built-in system!**

### **3. workspace-create-repository Command Specification**

**What's needed:** Complete command behavior

```typescript
// scripts-ts/create-repository.ts

interface CreateRepositoryOptions {
  template?: string;      // optional Template short name
  name: string;          // Repository name
  noGit?: boolean;       // Skip git initialization
  withDocs?: boolean;    // Include DocFX site
}

async function createRepository(options: CreateRepositoryOptions) {
  // 1. Discover available templates (if template not specified, "deepstaging-roslyn" will be our default to test functionality, default should be configurable)
  if (!options.template) {
    const templates = await discoverTemplates();
    options.template = await promptSelect('Choose template:', templates);
  }
  
  // 2. Get repository name (if not provided)
  if (!options.name) {
    options.name = await promptInput('Repository name:');
  }
  
  // 3. Calculate target path (sibling to workspace)
  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve('../');
  const repoDir = path.join(orgRoot, kebabCase(options.name));
  
  // 4. Check if directory exists
  if (fs.existsSync(repoDir)) {
    throw new Error(`Directory already exists: ${repoDir}`);
  }
  
  // 5. Execute dotnet new with template
  await exec(`dotnet new ${options.template} -n ${options.name} -o ${repoDir}`);
  
  // 6. Initialize git repository
  if (!options.noGit) {
    await exec(`git init ${repoDir}`);
    await exec(`git -C ${repoDir} add -A`);
    await exec(`git -C ${repoDir} commit -m "feat: initialize from ${options.template} template"`);
  }
  
  // 7. Success message with next steps
  console.log(`✅ Repository created: ${repoDir}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${path.basename(repoDir)}`);
  console.log(`  dotnet build`);
  console.log(`  dotnet test`);
  
  // 8. .envrc will auto-discover on next directory entry (DRY loop handles it!)
}
```

I think we can keep the DEEPSTAGING_* variables! It is a deepstaging project after all.

**Usage:**
```bash
# Interactive mode
workspace-create-repository

# Direct mode
workspace-create-repository --template deepstaging-roslyn --name MyAwesomeTool

# From package.json:
npm run create-repository -- --template deepstaging-roslyn --name MyTool
```

### **4. Bootstrap Process Detailed**

**What's needed:** Expand current bootstrap.sh behavior

```bash
# bootstrap.sh responsibilities:

# Stage 1: Dependencies
- Check Homebrew installed
- Install from Brewfile (gh, direnv, jq, node, fzf, etc.)

# Stage 2: Node/TypeScript Setup
- npm install (installs tsx, inquirer, ora, chalk, etc.)
- Verify TypeScript scripts can run

# Stage 3: .envrc Generation
- Copy .envrc template to parent directory
- Configure auto-discovery loop (unified bash/TypeScript)
- Set environment variables (ORG_ROOT, DEEPSTAGING_DIR, etc.)

# Stage 4: Repository Options
Option A: Clone existing repos (current behavior)
  - Use gh CLI to list org or personal repos (authentication is a future feature)
  - Interactive selection (fzf)
  - Clone to sibling directories

Option B: Skip cloning (workspace-only setup)
  - Just setup workspace environment
  - User creates repos later via workspace-create-repository

Option C: Create new repo immediately (future)
  - Run workspace-create-repository as part of bootstrap
  - Get user started with a working repo

# Stage 5: NuGet Feed Setup
- Create ~/.nuget/local-feed/ directory
- Add LocalFeed source to dotnet
- Verify configuration

# Stage 6: Shell Hook Integration
- Add direnv hook to shell config (~/.bashrc or ~/.zshrc)
- Instructions for manual addition if needed
- Test direnv loading

# Stage 7: Template Installation (optional)
- Prompt: "Install Deepstaging.Templates?"
- If yes: dotnet new install Deepstaging.Templates
- List available templates: dotnet new list
```


### **5. Multi-Org Configuration**

**What's needed:** How to make workspace org-agnostic

**Current state (Deepstaging-specific):**
```bash
# .envrc hardcodes Deepstaging
DEEPSTAGING_ORG_ROOT="/Users/chris/code/org/deepstaging"
DEEPSTAGING_GITHUB_ORG="deepstaging"
```

**Target state (org-agnostic):**
```bash
# .envrc template (copied to parent directory during bootstrap)

# Auto-detect organization root (parent of workspace)
export DEEPSTAGING_ORG_ROOT="${PWD}"
export DEEPSTAGING_DIR="${PWD}/workspace"

# Configurable organization name (default: directory name)
export DEEPSTAGING_ORG_NAME="${DEEPSTAGING_ORG_NAME:-$(basename "$PWD")}"

# Configurable GitHub organization (for gh CLI operations)
export DEEPSTAGING_GITHUB_ORG="${DEEPSTAGING_GITHUB_ORG:-$DEEPSTAGING_ORG_NAME}"

# Standard paths
export DEEPSTAGING_LOCAL_NUGET_FEED="$HOME/.nuget/local-feed"

# Add workspace scripts to PATH via unified loop
source "$DEEPSTAGING_DIR/.envrc.d/script-discovery.sh"
```

**User configuration (optional .env file):**
```bash
# ~/code/org/mycompany/.env (gitignored)
export DEEPSTAGING_ORG_NAME="MyCompany"
export DEEPSTAGING_GITHUB_ORG="mycompany-oss"
```

**Result:** Any team can fork workspace, run bootstrap, and it "just works" with their org name.

### **6. Convention Requirements**

**What's needed:** Minimum standards for auto-discovery to work

**Required Structure (for workspace scripts to work):**
```
repo-name/                      # Lowercase kebab-case
├── src/                        # All source projects
├── tests/                      # All test projects  
├── RepoName.sln               # Solution at root (PascalCase)
├── Directory.Packages.props    # For dependency discovery
└── README.md
```

**Why these requirements:**
- `*.sln at root` → publish scripts find solution predictably
- `Directory.Packages.props` → discover-dependents.ts finds dependencies
- `src/` and `tests/` → Industry standard, tooling compatibility
- Naming convention → Consistent script behavior

**Optional but recommended:**
```
├── samples/                    # Example projects
├── docs/                       # Documentation site
├── .docs/                      # Development documentation
└── scripts/                    # Repo-specific automation
```

**Templates must generate this structure** for seamless integration.

### **7. Template Package Requirements**

**What's needed:** What makes a valid template package

**For package authors:**
```
Template Package Checklist:
✅ Installable via: dotnet new install <package-name>
✅ Outputs: Standard repo structure (src/, tests/, *.sln at root)
✅ Provides: Template metadata (short name, description, tags)
✅ Supports: Standard dotnet template parameters (-n name, -o output)
✅ Optional: Custom parameters specific to template

Example: Deepstaging.Templates
- Short name: "deepstaging-roslyn"
- Generates: Complete Roslyn analyzer/generator project
- Structure: src/, tests/, samples/, docs/
- Custom options: --no-sample, --with-docs
```

**Template discovery is automatic:**
```bash
# Install template package
dotnet new install Deepstaging.Templates

# Now available to workspace-create-repository
workspace-create-repository
# Shows "deepstaging-roslyn" in the list!
```

**No workspace configuration needed - dotnet template system handles discovery.**

### **8. Workspace Commands Reference**

**What's needed:** Complete command list with descriptions

**After bootstrap, these commands are available anywhere in the org directory tree:**

```bash
# Repository Creation
workspace-create-repository           # Interactive: choose template, name repo
workspace-create-repository --help    # Show all options

# Repository Synchronization  
workspace-sync                        # AI-powered commit across all repos
workspace-sync --help                 # Show options

# Publishing & Dependencies
workspace-publish <repo-name>         # Publish package to local NuGet
workspace-publish-local               # Publish with automatic dependent restore
workspace-discover-dependents <pkg>   # Find repos that depend on package

# Future commands (as TypeScript scripts are added):
workspace-list-templates              # Show installed dotnet templates
workspace-health-check                # Verify all repos buildable
workspace-update-conventions          # Apply convention updates across repos
```

**How commands work:**
- Defined in `package.json` scripts section
- Auto-wrapped by `.envrc` unified loop (DRY!)
- Call TypeScript via `tsx` (no compilation step)
- Work from any directory (environment variables provide context)

### **9. Relationship to Existing Deepstaging Workspace**

**What's needed:** Clarify coexistence strategy

**Option A: Evolve Current Workspace (Minimal Change)**
- Add `create-repository.ts` to existing workspace
- Keep Deepstaging-specific variables for backward compatibility
- Add org-agnostic variables alongside
- Templates already published separately

**Option B: New Workspace Repository (Clean Slate)**
- Create `workspace-toolkit` or similar repo
- Implement vision from scratch
- Current workspace continues for Deepstaging projects
- New workspace is the "product" others can fork

**Recommendation: Option A (Evolution)**

Why:
- You're 90% there already!
- Bootstrap.sh exists ✅
- TypeScript infrastructure exists ✅
- Unified .envrc loop exists ✅
- Just need to add create-repository.ts ✅
- Make variables org-agnostic ✅

**What's left to implement:**
1. Create `scripts-ts/create-repository.ts`
2. Add to `package.json`: `"create-repository": "tsx scripts-ts/create-repository.ts"`
3. Update `.envrc` to use `DEEPSTAGING_*` variables (keep `DEEPSTAGING_*` as aliases)
4. Update bootstrap.sh to prompt for org name
5. Document: "Fork this workspace for your organization"

**That's it! Maybe 2-3 hours of work.**

### **10. Implementation Roadmap**

**What's needed:** Concrete next steps

**Phase 1: Core Command (1-2 hours)**
```bash
✅ Create scripts-ts/create-repository.ts
✅ Implement template discovery (dotnet new list)
✅ Implement interactive prompts (inquirer)
✅ Execute dotnet new with proper paths
✅ Git initialization
✅ Success message with next steps
✅ Add to package.json scripts
```

**Phase 2: Org-Agnostic Variables (30 min)**
```bash
✅ Update .envrc template
✅ Add DEEPSTAGING_* variables
✅ Keep DEEPSTAGING_* as aliases for compatibility
✅ Update scripts to use new variables
```

**Phase 3: Bootstrap Enhancement (30 min)**
```bash
✅ Prompt for organization name during bootstrap
✅ Optional: Prompt to install Deepstaging.Templates
✅ Optional: Create first repository
✅ Show available commands at end
```

**Phase 4: Documentation (1 hour)**
```bash
✅ Update README.md with create-repository examples
✅ Document template requirements for package authors
✅ Add "Fork this for your org" section
✅ Create TEMPLATE_AUTHOR_GUIDE.md
```

**Total time: ~4-5 hours to production-ready!**

### **11. Success Criteria**

**What's needed:** How do we know it's done?

**Must have:**
- ✅ User can fork workspace to new org directory
- ✅ Run bootstrap.sh, configure org name
- ✅ Install template package: `dotnet new install SomeOrg.Templates`
- ✅ Run `workspace-create-repository`, select template, name repo
- ✅ New repository appears as sibling with standard structure
- ✅ `cd new-repo` and environment auto-loads (direnv)
- ✅ All workspace-* commands work in new repo
- ✅ Can publish new repo's packages to local NuGet
- ✅ Dependency discovery works across repos

**Documentation complete:**
- ✅ README explains workspace concept
- ✅ Example showing "fork for your org"
- ✅ Template author guide
- ✅ Video/GIF showing create-repository workflow

**Polish:**
- ✅ Beautiful terminal UI (chalk colors, ora spinners)
- ✅ Helpful error messages
- ✅ Validation (directory exists, template installed, etc.)
- ✅ Next-steps guidance after creation

---

## Key Simplifications

### ~~Convention Detection~~ - Not Needed!
The original spec mentioned "detect that a project does not adhere to our conventions and could safely attempt to adapt it."

**Skip this!** Reasons:
- Templates generate correct structure from the start
- No existing projects to migrate
- Adds complexity for little value
- If someone makes a non-standard repo, they can manually adjust

### Template Registry - Not Needed!
No custom template discovery system.

**Use dotnet's built-in template system:**
- Users install: `dotnet new install <package>`
- Workspace discovers: `dotnet new list`
- Zero maintenance

### Multi-Template Support - Already Works!
As long as templates follow dotnet conventions, they work automatically.

**Any template package works:**
```bash
dotnet new install Deepstaging.Templates
dotnet new install MicroserviceKit.Templates  
dotnet new install FunctionalCSharp.Templates

workspace-create-repository
# Shows all three! 🎉
```

---

## Summary

The Workspace Specification describes a vision that's **90% implemented**. What's missing:

1. **create-repository.ts command** (~2 hours coding)
2. **Org-agnostic variables** (~30 min refactoring)
3. **Documentation updates** (~1 hour writing)

**Total: Half a day of work to ship the vision.**

The key insight: **Templates are consumed, not managed.** Use dotnet's template system, generate repos as siblings, let .envrc auto-discover them. Simple, scalable, zero special cases.

This workspace becomes a **toolkit any organization can fork** and immediately use to bootstrap their multi-repo .NET development environment with intelligent scripting, TypeScript tooling, and AI-powered workflows.

---

## Next Steps

1. Review this document
2. Add these sections to "Workspace Specification.md"
3. Create `scripts-ts/create-repository.ts`
4. Test the workflow
5. Ship it! 🚀
