# Multi-Package Build & Pack Strategy

**Date:** 2026-01-04  
**Status:** Design Clarification  
**Related:** unified-package-architecture-plan.md

## Your Proposed Structure (Clarified)

```
my-roslyn-tools-repo/                         # Git repository root
├── .template.config/
│   └── template.json
├── packages/                                  # 📦 PACKAGES DIRECTORY
│   ├── MyRoslynTool/                         # Package 1
│   │   ├── MyRoslynTool.NugetPackage/        # 🎯 META-PACKAGE (packs this package)
│   │   ├── MyRoslynTool.Contracts/
│   │   ├── MyRoslynTool.Queries/
│   │   ├── MyRoslynTool.Generators/
│   │   ├── MyRoslynTool.Analyzers/
│   │   ├── MyRoslynTool.CodeFixes/
│   │   ├── MyRoslynTool/
│   │   ├── MyRoslynTool.Tests/
│   │   ├── MyRoslynTool.Sample/
│   │   ├── README.md
│   │   ├── GETTING_STARTED.md
│   │   ├── PACKAGING.md
│   │   └── LICENSE
│   └── MyOtherTool/                          # Package 2 (added later)
│       ├── MyOtherTool.NugetPackage/         # 🎯 META-PACKAGE
│       ├── MyOtherTool.Contracts/
│       └── ...
├── MyRoslynTool.slnx                         # Solution 1
├── MyOtherTool.slnx                          # Solution 2 (added later)
├── Directory.Build.props                     # Shared build config
├── Directory.Packages.props                  # CPM (shared versions)
├── scripts/
│   ├── pack-all.sh                           # 🎯 NEW: Pack ALL packages
│   ├── pack-package.sh <name>                # 🎯 NEW: Pack ONE package
│   ├── new-package.sh                        # Create new package
│   └── new-project.sh                        # Add project to package
└── .gitignore
```

## Key Insight: `.NugetPackage` Project

You're proposing to **rename** `MyRoslynTool.Generators` → `MyRoslynTool.NugetPackage` to make its purpose explicit!

### Current Naming (Deepstaging core)
```
Deepstaging.Generators     # 🤔 Confusing - sounds like just generators
  ├── Generators/          # Contains actual generator code
  └── csproj               # But ALSO packs everything!
```

### Proposed Naming (Your structure)
```
MyRoslynTool.NugetPackage  # ✅ Clear - this is the packaging project!
  ├── Generators/          # Still contains generator code
  └── csproj               # AND packs everything (obvious now!)
```

**Benefit:** Makes it crystal clear which project produces the NuGet package.

## Packing Strategy

### Option 1: Individual Pack Scripts (Your Original Question)

Each package has its own pack script:

```
packages/
├── MyRoslynTool/
│   ├── pack.sh                               # Packs MyRoslynTool
│   └── MyRoslynTool.NugetPackage/
│       └── MyRoslynTool.NugetPackage.csproj
└── MyOtherTool/
    ├── pack.sh                               # Packs MyOtherTool
    └── MyOtherTool.NugetPackage/
        └── MyOtherTool.NugetPackage.csproj
```

**`packages/MyRoslynTool/pack.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔨 Building MyRoslynTool..."
dotnet build "$REPO_ROOT/MyRoslynTool.slnx" --configuration Release

echo "📦 Packing MyRoslynTool..."
dotnet pack "$SCRIPT_DIR/MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj" \
  --configuration Release \
  --no-build \
  --output "$REPO_ROOT/artifacts"

echo "✅ Package created: artifacts/MyRoslynTool.*.nupkg"
```

**`scripts/pack-all.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"

echo "📦 Packing all packages..."
echo ""

# Discover all pack.sh scripts in packages/
for pack_script in "$PACKAGES_DIR"/*/pack.sh; do
  if [ -f "$pack_script" ]; then
    package_dir=$(dirname "$pack_script")
    package_name=$(basename "$package_dir")
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Packing: $package_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$package_dir"
    ./pack.sh
    echo ""
  fi
done

echo "✅ All packages packed!"
echo ""
echo "Artifacts:"
ls -lh "$REPO_ROOT/artifacts"/*.nupkg
```

**Pros:**
- ✅ Each package self-contained
- ✅ Easy to pack individual packages
- ✅ Template can include pack.sh
- ✅ Works for standalone repos

**Cons:**
- ❌ Duplication (each pack.sh similar)
- ❌ Harder to maintain consistency

---

### Option 2: Centralized Pack Script (Recommended)

Convention-based discovery:

**`scripts/pack-package.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Pack a single package
# Usage: ./scripts/pack-package.sh MyRoslynTool

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"

PACKAGE_NAME="${1:-}"

if [ -z "$PACKAGE_NAME" ]; then
  echo "Usage: $0 <PackageName>"
  echo ""
  echo "Available packages:"
  find "$PACKAGES_DIR" -name "*.NugetPackage.csproj" | while read -r csproj; do
    package_dir=$(dirname "$(dirname "$csproj")")
    echo "  - $(basename "$package_dir")"
  done
  exit 1
fi

PACKAGE_DIR="$PACKAGES_DIR/$PACKAGE_NAME"
NUGET_PACKAGE_PROJECT="$PACKAGE_DIR/$PACKAGE_NAME.NugetPackage/$PACKAGE_NAME.NugetPackage.csproj"
SOLUTION_FILE="$REPO_ROOT/$PACKAGE_NAME.slnx"

if [ ! -f "$NUGET_PACKAGE_PROJECT" ]; then
  echo "❌ Package not found: $PACKAGE_NAME"
  echo "   Expected: $NUGET_PACKAGE_PROJECT"
  exit 1
fi

echo "🔨 Building $PACKAGE_NAME..."
dotnet build "$SOLUTION_FILE" --configuration Release

echo "📦 Packing $PACKAGE_NAME..."
dotnet pack "$NUGET_PACKAGE_PROJECT" \
  --configuration Release \
  --no-build \
  --output "$REPO_ROOT/artifacts"

echo "✅ Package created: artifacts/$PACKAGE_NAME.*.nupkg"
```

**`scripts/pack-all.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"

echo "📦 Packing all packages..."
echo ""

# Discover all .NugetPackage projects
find "$PACKAGES_DIR" -name "*.NugetPackage.csproj" | while read -r csproj; do
  # Extract package name
  # packages/MyRoslynTool/MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj
  # → MyRoslynTool
  package_dir=$(dirname "$(dirname "$csproj")")
  package_name=$(basename "$package_dir")
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Packing: $package_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  "$SCRIPT_DIR/pack-package.sh" "$package_name"
  echo ""
done

echo "✅ All packages packed!"
echo ""
echo "📦 Artifacts:"
ls -lh "$REPO_ROOT/artifacts"/*.nupkg
```

**Pros:**
- ✅ Single source of truth (DRY)
- ✅ Convention-based (no config needed)
- ✅ Easy to maintain
- ✅ Consistent behavior

**Cons:**
- ❌ Requires convention (`.NugetPackage` naming)
- ❌ Less obvious for beginners

---

### Option 3: Hybrid (Best of Both)

Each package has a simple pack.sh that calls the centralized script:

**`packages/MyRoslynTool/pack.sh`:**
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_NAME=$(basename "$SCRIPT_DIR")

# Delegate to centralized script
"$SCRIPT_DIR/../../scripts/pack-package.sh" "$PACKAGE_NAME"
```

**Benefits:**
- ✅ Each package self-contained (has pack.sh)
- ✅ No duplication (delegates to central script)
- ✅ Easy to use (`cd packages/MyTool && ./pack.sh`)
- ✅ Template can include pack.sh
- ✅ Consistent behavior (central logic)

**Recommended!** This gives you local convenience with centralized consistency.

## Template Structure

### What Template Generates (Standalone Use)

```
dotnet new deepstaging-roslyn -n MyRoslynTool
```

Creates:
```
MyRoslynTool/                                  # Git repo root (user creates)
├── packages/
│   └── MyRoslynTool/                         # Package folder
│       ├── MyRoslynTool.NugetPackage/        # META-PACKAGE
│       ├── MyRoslynTool.Contracts/
│       ├── MyRoslynTool.Queries/
│       ├── MyRoslynTool.Generators/
│       ├── MyRoslynTool.Analyzers/
│       ├── MyRoslynTool.CodeFixes/
│       ├── MyRoslynTool/
│       ├── MyRoslynTool.Tests/
│       ├── MyRoslynTool.Sample/
│       ├── pack.sh                           # Local pack script
│       ├── README.md
│       └── LICENSE
├── scripts/
│   ├── pack-all.sh                           # Pack all packages
│   ├── pack-package.sh <name>                # Pack one package
│   ├── new-package.sh                        # Add another package
│   └── new-project.sh                        # Add project to package
├── MyRoslynTool.slnx                         # Solution
├── Directory.Build.props
├── Directory.Packages.props
└── .gitignore
```

### Generated Pack Scripts

**`packages/MyRoslynTool/pack.sh`** (simple):
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_NAME=$(basename "$SCRIPT_DIR")
"$SCRIPT_DIR/../../scripts/pack-package.sh" "$PACKAGE_NAME"
```

**`scripts/pack-package.sh`** (full script above)

**`scripts/pack-all.sh`** (full script above)

**`scripts/new-package.sh`:**
```bash
#!/usr/bin/env bash
# Creates another package in packages/ directory
# Usage: ./scripts/new-package.sh MyOtherTool
```

**`scripts/new-project.sh`:**
```bash
#!/usr/bin/env bash
# Adds a project to an existing package
# Usage: ./scripts/new-project.sh MyRoslynTool Extensions --type runtime
```

## Developer Workflows

### Workflow 1: Pack Single Package

```bash
# Option A: From package directory
cd packages/MyRoslynTool
./pack.sh

# Option B: From repo root
./scripts/pack-package.sh MyRoslynTool
```

### Workflow 2: Pack All Packages

```bash
# From repo root
./scripts/pack-all.sh

# Output:
# 📦 Packing all packages...
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Packing: MyRoslynTool
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔨 Building MyRoslynTool...
# 📦 Packing MyRoslynTool...
# ✅ Package created: artifacts/MyRoslynTool.1.0.0.nupkg
# 
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Packing: MyOtherTool
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔨 Building MyOtherTool...
# 📦 Packing MyOtherTool...
# ✅ Package created: artifacts/MyOtherTool.1.0.0.nupkg
# 
# ✅ All packages packed!
```

### Workflow 3: Create New Package

```bash
./scripts/new-package.sh MyOtherTool

# Creates:
# - packages/MyOtherTool/ (full structure)
# - MyOtherTool.slnx
# - packages/MyOtherTool/pack.sh
```

### Workflow 4: Add Project to Package

```bash
./scripts/new-project.sh MyRoslynTool Extensions --type runtime

# Creates:
# - packages/MyRoslynTool/MyRoslynTool.Extensions/
# - Updates MyRoslynTool.slnx
# - Optionally updates MyRoslynTool.NugetPackage.csproj
```

## Monorepo Adaptation (Deepstaging Core)

When `new-package.sh` creates a package in the Deepstaging monorepo:

1. **Remove standalone scripts:**
   ```bash
   rm -rf packages/$PACKAGE_NAME/pack.sh
   rm -rf scripts/  # Don't include template scripts
   ```

2. **Adapt to monorepo structure:**
   - Keep: `packages/` directory with nested packages
   - Remove: Standalone Directory.Build.props (use monorepo's)
   - Update: Solution file location (packages/$PACKAGE_NAME.slnx)

3. **Monorepo uses manual pack commands:**
   ```bash
   # As documented in PUBLISHING.md
   cd packages
   dotnet pack Deepstaging.Validation/Deepstaging.Validation.NugetPackage/Deepstaging.Validation.NugetPackage.csproj \
     -c Release -o ../artifacts
   ```

## Summary

### Recommended Approach: **Hybrid (Option 3)**

1. **Template generates:**
   - `packages/MyRoslynTool/pack.sh` (delegates to central script)
   - `scripts/pack-package.sh` (convention-based discovery)
   - `scripts/pack-all.sh` (discovers all `.NugetPackage` projects)

2. **Convention:**
   - Meta-package named `PackageName.NugetPackage`
   - Located at `packages/PackageName/PackageName.NugetPackage/`

3. **Discovery:**
   - `pack-all.sh` finds all `*.NugetPackage.csproj` files
   - Extracts package name from directory structure
   - Calls `pack-package.sh` for each

4. **Flexibility:**
   - Works standalone (new repos like Effects)
   - Adapts to monorepo (Deepstaging core)
   - Easy to add more packages

### Key Decision: Naming

**Old:** `MyRoslynTool.Generators` (ambiguous)  
**New:** `MyRoslynTool.NugetPackage` (explicit) ✅

This makes it obvious which project produces the NuGet package and enables convention-based discovery.

## Next Steps

1. Decide on naming: `.Generators` vs `.NugetPackage`
2. Implement template restructure with new naming
3. Create centralized pack scripts
4. Generate local pack.sh delegates in template
5. Update documentation
6. Test both standalone and monorepo scenarios
