# Auto-Discovery Publishing System

## Overview

The workspace now features a **fully auto-discovering** package publishing system. No manual configuration needed - just create your repo with standard .NET structure and the scripts handle the rest!

## Key Features

### ✅ Zero Configuration
- No hardcoded repo lists
- No manual package name registration
- No dependency mapping files

### ✅ Auto-Discovery
- Scans for solution files (`.slnx`, `.sln`)
- Extracts package names from `<PackageId>` tags
- Finds dependents by scanning `<PackageReference>` tags
- Traverses entire org directory automatically

### ✅ Smart Restoration
- Discovers which repos depend on a package
- Restores only affected repositories
- Shows exactly which projects reference each package

## Scripts

### `publish.sh` - Smart Publishing

The main workhorse. Publishes any repository to local NuGet feed.

```bash
# Usage
./scripts/publish.sh <repo-name> [--restore-deps]

# Examples
./scripts/publish.sh deepstaging
./scripts/publish.sh effects --restore-deps
./scripts/publish.sh my-new-feature --restore-deps
```

**Auto-discovers:**
- Repository location in org directory
- Solution files to build
- Package names to publish
- Dependent repositories to restore

### `discover-dependents.sh` - Dependency Discovery

Shows what depends on a package, optionally restores them.

```bash
# Usage
./scripts/discover-dependents.sh <package-name> [--restore]

# Examples
./scripts/discover-dependents.sh Deepstaging
./scripts/discover-dependents.sh Deepstaging --restore
./scripts/discover-dependents.sh Deepstaging.Effects --restore
```

**Output example:**
```
🔍 Discovering repositories that depend on: Deepstaging
==================================================

✅ Found: effects
   Projects:
     - Deepstaging.Effects.Analyzers.csproj
     - Deepstaging.Effects.CodeFixes.csproj
     - Deepstaging.Effects.Generators.csproj
     - Deepstaging.Effects.Queries.csproj

==================================================
📊 Summary: Found 1 dependent repository(ies)

💡 Run with --restore to automatically restore these repositories
```

### `publish-to-local-nuget.sh` - Deepstaging Specific

Specialized script for Deepstaging core. Handles the Testing package specially.

```bash
# Usage
./scripts/publish-to-local-nuget.sh [--restore-deps]
```

Now uses `discover-dependents.sh` internally for auto-restoration!

## How It Works

### Discovery Process

1. **Repository Discovery**
   - Scans org directory for folders with `.git`
   - Excludes the package's own repo and workspace

2. **Package Name Discovery**
   - Parses `.csproj` files for `<PackageId>` tags
   - Falls back to solution file name if no PackageId

3. **Dependency Discovery**
   - Recursively searches for `<PackageReference Include="PackageName">`
   - Shows exactly which projects depend on the package

4. **Solution Discovery**
   - Finds all `.slnx` and `.sln` files
   - Uses first one found for building

### Restoration Process

When `--restore` or `--restore-deps` is used:

1. Build and pack the package
2. Discover all dependent repositories
3. For each dependent:
   - Navigate to repo directory
   - Run `dotnet restore --force-evaluate`
   - Report success or skip if no solution

## Adding New Packages

**Literally zero configuration required!**

Just create your repo with standard structure:

```
my-new-feature/
├── .git/
├── MyNewFeature.slnx
├── MyNewFeature/
│   └── MyNewFeature.csproj  (with <PackageId>MyNewFeature</PackageId>)
└── MyNewFeature.Tests/
    └── MyNewFeature.Tests.csproj
```

Reference your dependencies normally:

```xml
<ItemGroup>
  <PackageReference Include="Deepstaging.Effects" />
</ItemGroup>
```

Then just publish:

```bash
cd workspace
./scripts/publish.sh my-new-feature --restore-deps
```

**Done!** The script:
- ✅ Finds your repo
- ✅ Discovers your solution
- ✅ Extracts package names
- ✅ Builds and publishes
- ✅ Finds who depends on Effects
- ✅ Restores those repos automatically

## Performance

Typical full workflow:
- **Build:** ~2-3 seconds
- **Pack:** ~0.5-1 second
- **Discovery:** ~0.1 second per repo
- **Restore per dependent:** ~1-2 seconds

**Total: ~5-10 seconds for full publish + restore cycle**

## Benefits Over Manual Configuration

### Before (Manual Config)
```bash
# Edit publish-package.sh
effects)
    REPO_DIR="$ORG_DIR/effects"
    SOLUTION_FILE="$REPO_DIR/Deepstaging.Effects.slnx"
    DEPENDENT_REPOS=(
        "$ORG_DIR/my-feature"    # Have to manually add this
        "$ORG_DIR/other-feature" # And this
    )
    ;;
```

### After (Auto-Discovery)
```bash
# Nothing to edit!
# Just run:
./scripts/publish.sh effects --restore-deps
```

- ❌ No config files to maintain
- ❌ No forgetting to add new dependents
- ❌ No out-of-sync documentation
- ✅ Always accurate
- ✅ Self-documenting
- ✅ Zero maintenance

## Future-Proof

As you build more packages:

```
Deepstaging
  └─> Effects
       ├─> Feature A
       │    └─> Feature A.Extensions
       └─> Feature B
            └─> Feature C (depends on A and B)
```

**Every dependency automatically discovered.**

Just keep using `<PackageReference>` normally, and the scripts handle the rest!

## Edge Cases Handled

### Multiple Packages in One Repo
- Discovers all `<PackageId>` tags
- Publishes all packages
- Restores dependents of any/all packages

### No PackageId Tag
- Falls back to solution file name
- Still works correctly

### Mixed Dependencies
- Some repos depend on different packages
- Discovery finds exactly who needs what
- Restoration only affects relevant repos

### New Repos Added
- Automatically included in discovery
- No script updates needed
- Just works

## Commands Cheat Sheet

```bash
# Publish with full automation
./scripts/publish.sh <repo-name> --restore-deps

# Discover dependencies only
./scripts/discover-dependents.sh <package-name>

# Publish Deepstaging specifically
./scripts/publish-to-local-nuget.sh --restore-deps

# Check what's in local feed
ls -lh ~/.nuget/local-feed/*.nupkg

# Manual restore if needed
cd ../some-repo
dotnet restore --force-evaluate
```

---

**Key Takeaway:** Create standard .NET repos, use PackageReferences, run publish script. That's it!
