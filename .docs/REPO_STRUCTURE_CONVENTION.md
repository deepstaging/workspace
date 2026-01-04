# Repository Structure Convention Proposal

## Current Issues

### Inconsistencies
1. **Deepstaging**: Solutions in `packages/` subdirectory, projects nested deeper
2. **Effects**: Solution at root, projects in `Deepstaging.Effects/` subdirectory
3. **Mixed naming**: `deepstaging` (repo) vs `Deepstaging` (projects)
4. Scripts need special cases to handle these differences

### Problems This Causes
- ❌ Scripts need special-case logic
- ❌ Harder to discover solutions programmatically
- ❌ No clear convention for new repos
- ❌ Cognitive overhead when switching between repos

## Recommended Convention

### Option 1: Root-Level Solution (Microsoft Style)
**Used by:** .NET runtime, Roslyn, ASP.NET Core, most Microsoft projects

```
repo-name/                          # Git repo root
├── .git/
├── .github/
│   └── workflows/
├── .docs/                          # Project-specific documentation
├── src/                            # Source code
│   ├── RepoName/                   # Main project
│   ├── RepoName.Analyzers/
│   ├── RepoName.Generators/
│   ├── RepoName.Contracts/
│   └── RepoName.Queries/
├── tests/                          # Test projects
│   ├── RepoName.Tests/
│   └── RepoName.Integration.Tests/
├── samples/                        # Sample/demo projects (optional)
│   └── SampleConsumer/
├── docs/                           # Documentation site (optional)
├── artifacts/                      # Build outputs
├── RepoName.sln                    # Solution at root
├── Directory.Build.props           # Shared build config
├── Directory.Packages.props        # Central package versions
├── .gitignore
├── README.md
└── LICENSE
```

**Pros:**
- ✅ Industry standard
- ✅ Clear separation: src/ vs tests/ vs samples/
- ✅ Solution easy to find (always at root)
- ✅ Works with all tooling (VS, Rider, VS Code)
- ✅ No special cases needed in scripts

**Cons:**
- ⚠️ Migration effort for existing repos

### Option 2: Flat Structure (Simple Projects)
**Used by:** Smaller libraries, single-purpose packages

```
repo-name/
├── .git/
├── src/
│   └── RepoName/               # Single main project
├── tests/
│   └── RepoName.Tests/
├── RepoName.sln
├── Directory.Packages.props
├── README.md
└── LICENSE
```

**When to use:**
- Single library package
- No analyzers/generators
- Minimal complexity

### Option 3: Monorepo Style (Not Recommended for Us)
```
repo-name/
├── packages/
│   ├── package1/
│   │   ├── src/
│   │   └── Package1.sln
│   └── package2/
│       ├── src/
│       └── Package2.sln
```

**Why not:**
- ❌ Multiple solutions = unclear which to build
- ❌ Complicates discovery
- ❌ Only useful for truly independent packages

## Proposed Standard

### For All New Repos: Use Option 1 (Root-Level Solution)

#### Required Structure
```
repo-name/                      # Lowercase, kebab-case for repo name
├── src/                        # All source code here
│   └── RepoName.*/            # PascalCase for project names
├── tests/                      # All test projects here
│   └── RepoName.*.Tests/
├── RepoName.sln               # Solution named exactly like main package
├── Directory.Build.props
├── Directory.Packages.props
└── README.md
```

#### Optional Directories
```
├── samples/                    # Demo/example projects
├── docs/                       # Documentation site (DocFX, etc.)
├── .docs/                      # Development docs (not for site)
├── .github/workflows/          # CI/CD
└── artifacts/                  # Build outputs (in .gitignore)
```

### Naming Conventions

#### Repository Names
- Lowercase with hyphens: `deepstaging`, `deepstaging-effects`
- Match organization structure
- GitHub URL friendly

#### Solution Names  
- PascalCase, matches main package: `Deepstaging.sln`, `Deepstaging.Effects.sln`
- Always at repository root
- Single solution per repo

#### Project Names
- PascalCase with namespace: `Deepstaging.Roslyn`, `Deepstaging.Effects.Analyzers`
- Descriptive suffixes: `.Tests`, `.Analyzers`, `.Generators`, `.Contracts`

#### Directory Names
- Source code: `src/`
- Tests: `tests/` (not `test/` or `Tests/`)
- Samples: `samples/` (not `sample/` or `Samples/`)
- Lowercase, plural

## Migration Strategy

### Phase 1: Standardize New Repos
✅ All new repositories follow Option 1
✅ Update `new-roslyn-project.sh` to generate standard structure
✅ Document convention in workspace

### Phase 2: Migrate Existing Repos (When Convenient)
⏰ **Deepstaging**: Move solution from `packages/` to root, restructure as `src/`
⏰ **Effects**: Flatten structure, move projects from `Deepstaging.Effects/` to `src/`
⏰ Do migrations during natural refactoring opportunities

### Phase 3: Simplify Scripts
✅ Remove special cases from `publish.sh`
✅ Remove solution discovery complexity
✅ Assume convention: solution at root, always named `RepoName.sln`

## Detailed Example: Restructured Deepstaging

### Before (Current)
```
deepstaging/
├── packages/
│   ├── Deepstaging.slnx
│   ├── Deepstaging.Effects.slnx        # Shouldn't be here
│   ├── Deepstaging.Testing.slnx
│   ├── Deepstaging/
│   │   ├── Deepstaging/
│   │   ├── Deepstaging.Roslyn/
│   │   ├── Deepstaging.Generators/
│   │   └── Deepstaging.Roslyn.Tests/
│   └── Deepstaging.Testing/
│       └── Deepstaging.Testing/
├── samples/
├── docs-site/
└── scripts/
```

### After (Proposed)
```
deepstaging/
├── src/
│   ├── Deepstaging/                    # Bundle package
│   ├── Deepstaging.Roslyn/
│   ├── Deepstaging.Generators/
│   └── Deepstaging.Testing/            # Part of core offering
├── tests/
│   ├── Deepstaging.Roslyn.Tests/
│   └── Deepstaging.Testing.Tests/
├── samples/
│   └── QuickStart/
├── docs/                                # Renamed from docs-site
├── .docs/                               # Development documentation
├── Deepstaging.sln                      # At root!
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
└── LICENSE
```

## Detailed Example: Restructured Effects

### Before (Current)
```
effects/
├── Deepstaging.Effects/
│   ├── Deepstaging.Effects/
│   ├── Deepstaging.Effects.Analyzers/
│   ├── Deepstaging.Effects.Generators/
│   ├── Deepstaging.Effects.CodeFixes/
│   ├── Deepstaging.Effects.Contracts/
│   ├── Deepstaging.Effects.Queries/
│   └── Deepstaging.Effects.Tests/
├── Deepstaging.Effects.slnx
├── Directory.Build.props
└── Directory.Packages.props
```

### After (Proposed)
```
effects/
├── src/
│   ├── Deepstaging.Effects/
│   ├── Deepstaging.Effects.Analyzers/
│   ├── Deepstaging.Effects.Generators/
│   ├── Deepstaging.Effects.CodeFixes/
│   ├── Deepstaging.Effects.Contracts/
│   └── Deepstaging.Effects.Queries/
├── tests/
│   └── Deepstaging.Effects.Tests/
├── samples/                             # Future
│   └── EffectsDemo/
├── Deepstaging.Effects.sln              # .sln instead of .slnx
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
└── LICENSE
```

## Script Simplifications After Convention

### Current publish.sh (Complex)
```bash
# Find solution file(s) - check root first, then packages/ subdirectory
cd "$REPO_DIR"
SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))

# Special case: Deepstaging has solutions in packages/ subdirectory
if [ ${#SOLUTION_FILES[@]} -eq 0 ] && [ -d "packages" ]; then
    cd "packages"
    SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))
    if [ ${#SOLUTION_FILES[@]} -gt 0 ]; then
        REPO_DIR="$REPO_DIR/packages"
    fi
fi

# Prefer solution named after the repo
# ... complex matching logic ...
```

### Future publish.sh (Simple)
```bash
# Solution is always at root, named after repo
REPO_NAME_PASCAL=$(echo "$REPO_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1' | sed 's/ //g')
SOLUTION_FILE="$REPO_DIR/$REPO_NAME_PASCAL.sln"

if [ ! -f "$SOLUTION_FILE" ]; then
    echo "❌ Solution not found: $SOLUTION_FILE"
    echo "   (Expected solution at repo root named after repo)"
    exit 1
fi
```

**Lines of code: Reduced by 80%**

## Benefits of Convention

### For Scripts
- ✅ No special cases
- ✅ Predictable paths
- ✅ Simple discovery logic
- ✅ Easier to maintain

### For Developers
- ✅ Same structure everywhere
- ✅ Muscle memory works across repos
- ✅ Clear where to add new projects
- ✅ Tooling "just works"

### For Tooling
- ✅ IDE auto-discovers solutions
- ✅ CLI commands work consistently
- ✅ CI/CD templates reusable
- ✅ No surprises

## Recommendation

**Adopt Option 1 (Root-Level Solution) as the standard.**

### Immediate Actions
1. ✅ Document this convention in workspace
2. ✅ Update `new-roslyn-project.sh` to generate standard structure
3. ✅ Apply to all new repositories

### Future Actions (Non-Urgent)
1. ⏰ Migrate Deepstaging during next major refactor
2. ⏰ Migrate Effects when convenient (low priority - it's close to standard)
3. ✅ Simplify scripts once migrations complete

### Why Not Migrate Now?
- Working code is valuable
- Migration has no functional benefit (only structural)
- Scripts handle current structure fine
- Do it when touching code anyway

---

**Key Principle: Convention over Configuration**

One way to structure repos → Zero special cases → Simpler everything.
