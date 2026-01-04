# Repository Convention Summary

**Last Updated:** 2026-01-04

## The Problem

We had inconsistent repo structures that required special-case logic in scripts:
- Deepstaging: Solutions in `packages/` subdirectory
- Effects: Solution at root, but projects nested in subdirectory
- No clear convention for new repositories

## The Solution

**Adopt industry-standard convention: Root-Level Solution with src/tests/ separation**

## The Standard

```
repo-name/                      # Lowercase kebab-case (GitHub URL friendly)
├── src/                        # All source code
│   ├── RepoName/               # Main package
│   ├── RepoName.Analyzers/
│   ├── RepoName.Generators/
│   └── RepoName.Contracts/
├── tests/                      # All tests
│   └── RepoName.Tests/
├── samples/                    # Demos (optional)
├── docs/                       # Doc site (optional)
├── RepoName.sln               # Solution at root, PascalCase
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
└── LICENSE
```

## Why This Convention?

### Industry Standard
- Used by: .NET Runtime, Roslyn, ASP.NET Core, EF Core
- Familiar to all .NET developers
- Works with all tooling

### Benefits
- ✅ **Predictable**: Same structure everywhere
- ✅ **Simple**: No special cases in scripts
- ✅ **Clear**: src/ vs tests/ is obvious
- ✅ **Tooling**: IDEs auto-discover everything
- ✅ **Scalable**: Add projects easily

### Eliminates Special Cases

**Before:**
```bash
# publish.sh needs 30+ lines to find solutions
# Check root, check packages/, check for naming variations...
```

**After:**
```bash
# publish.sh: 3 lines
SOLUTION="$REPO_DIR/$(RepoName).sln"
```

## Current Status

### New Repos
✅ **Must** follow the standard convention
✅ `new-roslyn-project.sh` generates standard structure

### Existing Repos
⏰ **Will migrate** when convenient (no urgency)
- Deepstaging: Needs `packages/` → root restructure
- Effects: Already close, minor adjustments needed

### Scripts
✅ **Handle both** current and future structures
✅ Will simplify after migrations complete

## Quick Reference

### Creating New Repo

```bash
cd /Users/chris/code/org/deepstaging
mkdir my-feature && cd my-feature

# Create standard structure
mkdir -p src tests
dotnet new sln -n MyFeature

# Add projects in standard locations
dotnet new classlib -n MyFeature -o src/MyFeature
dotnet new xunit -n MyFeature.Tests -o tests/MyFeature.Tests

dotnet sln add src/MyFeature/MyFeature.csproj
dotnet sln add tests/MyFeature.Tests/MyFeature.Tests.csproj
```

Or use the template:
```bash
cd workspace
./scripts/new-roslyn-project.sh MyFeature
```

### Publishing

```bash
cd workspace

# Works regardless of repo structure
./scripts/publish.sh my-feature --restore-deps
```

### Discovering Dependencies

```bash
./scripts/discover-dependents.sh MyPackage --restore
```

## Documentation

- **Full Details:** `REPO_STRUCTURE_CONVENTION.md`
- **Migration Guide:** `MIGRATION_GUIDE.md`
- **This Summary:** `CONVENTION_SUMMARY.md`

## Key Principle

**Convention over Configuration**

One standard way → Zero special cases → Everything just works™

---

## TL;DR

**Standard structure:**
- Solution at root: `RepoName.sln`
- Source in: `src/`
- Tests in: `tests/`

**Result:** 
- No script special cases
- Predictable for developers
- Works with all tooling

**Status:**
- ✅ New repos use standard
- ⏰ Old repos migrate when convenient
- ✅ Scripts handle both (for now)
