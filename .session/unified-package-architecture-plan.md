# Unified Package Architecture Plan

**Date:** 2026-01-04  
**Status:** Design Proposal  
**Supersedes:** multi-package-template-support.md

## Philosophy Change

**OLD:** Support both standalone and monorepo structures  
**NEW:** Only support the nested package structure - it's the superior architecture

### Why Nested Packages?

1. **Natural Organization:** Related projects grouped under one package folder
2. **Single Meta-Package:** One `.Generators` project bundles everything
3. **Flexible Growth:** Easy to add/remove projects within a package
4. **Clear Publishing:** One package publishes multiple assemblies as a cohesive unit
5. **Proven Pattern:** This is how Deepstaging core and Effects work successfully

## Current State Analysis

### Deepstaging Core (`packages/`)
```
packages/
├── Deepstaging/                              # Package folder
│   ├── Deepstaging/                          # Runtime library
│   ├── Deepstaging.Roslyn/                   # Core Roslyn tooling
│   ├── Deepstaging.Generators/               # 🎯 META-PACKAGE (bundles all)
│   └── Deepstaging.Roslyn.Tests/             # Tests
├── Deepstaging.slnx                          # Solution at packages level
├── Deepstaging.Testing/                      # Another package
│   └── Deepstaging.Testing/                  # Single project
└── Deepstaging.Testing.slnx
```

### Effects Repository (separate repo)
```
effects/
├── Deepstaging.Effects/                      # Package folder
│   ├── Deepstaging.Effects/                  # Runtime library
│   ├── Deepstaging.Effects.Contracts/        # Attributes/interfaces
│   ├── Deepstaging.Effects.Queries/          # Query layer
│   ├── Deepstaging.Effects.Generators/       # 🎯 META-PACKAGE
│   ├── Deepstaging.Effects.Analyzers/        # Analyzers
│   ├── Deepstaging.Effects.CodeFixes/        # Code fixes
│   └── Deepstaging.Effects.Tests/            # Tests
├── Deepstaging.Effects.slnx                  # Solution at root
└── (references Deepstaging packages via NuGet)
```

### Key Insight: The `.Generators` Project IS the Meta-Package

From `MyRoslynTool.Generators.csproj`:
```xml
<PropertyGroup>
  <IsPackable>true</IsPackable>
  <IncludeBuildOutput>false</IncludeBuildOutput>
  <PackageId>MyRoslynTool</PackageId>
</PropertyGroup>

<!-- Bundles all assemblies into one NuGet package -->
<ItemGroup>
  <!-- Generator itself -->
  <None Include="$(OutputPath)$(AssemblyName).dll" Pack="true" PackagePath="analyzers/dotnet/cs" />
  
  <!-- Analyzers -->
  <None Include="../MyRoslynTool.Analyzers/$(OutputPath)MyRoslynTool.Analyzers.dll" 
        Pack="true" PackagePath="analyzers/dotnet/cs" />
  
  <!-- CodeFixes -->
  <None Include="../MyRoslynTool.CodeFixes/$(OutputPath)MyRoslynTool.CodeFixes.dll" 
        Pack="true" PackagePath="analyzers/dotnet/cs" />
  
  <!-- Contracts (attributes) -->
  <None Include="$(OutputPath)\MyRoslynTool.Contracts.dll" 
        Pack="true" PackagePath="lib/netstandard2.0" />
  
  <!-- Runtime library -->
  <None Include="../MyRoslynTool/bin/$(Configuration)/net10.0/MyRoslynTool.dll" 
        Pack="true" PackagePath="lib/net10.0" />
</ItemGroup>
```

**Result:** One `dotnet pack` command produces ONE NuGet package containing all assemblies.

## Proposed Architecture

### Template Structure (nested by default)

```
deepstaging-roslyn/
├── .template.config/
│   └── template.json
├── MyRoslynTool/                             # 📦 PACKAGE FOLDER
│   ├── MyRoslynTool.Contracts/               # Attributes/interfaces
│   ├── MyRoslynTool.Queries/                 # Query layer (isolated, testable)
│   ├── MyRoslynTool.Generators/              # 🎯 META-PACKAGE
│   ├── MyRoslynTool.Analyzers/               # Roslyn analyzers
│   ├── MyRoslynTool.CodeFixes/               # Code fix providers
│   ├── MyRoslynTool/                         # Runtime library
│   ├── MyRoslynTool.Tests/                   # Test suite
│   ├── MyRoslynTool.Sample/                  # Sample consumer (optional)
│   ├── README.md                             # Package documentation
│   ├── GETTING_STARTED.md
│   ├── PACKAGING.md
│   └── LICENSE
├── MyRoslynTool.slnx                         # Solution at template root
├── Directory.Build.props                     # Build configuration
├── Directory.Packages.props                  # CPM configuration
├── pack.sh / pack.cmd                        # Pack the meta-package
└── .gitignore
```

### Key Changes from Current Template

1. **All projects nested inside `MyRoslynTool/` folder**
2. **Solution at template root** (one level up from package folder)
3. **This mirrors the monorepo structure** exactly

### Developer Experience

#### Scenario 1: Create New Package (Monorepo - Deepstaging core)

```bash
# From deepstaging repo root
./scripts/new-package.sh Validation

# Creates:
packages/
├── Deepstaging.Validation/                   # Package folder
│   ├── Deepstaging.Validation.Contracts/
│   ├── Deepstaging.Validation.Queries/
│   ├── Deepstaging.Validation.Generators/    # META-PACKAGE
│   ├── Deepstaging.Validation.Analyzers/
│   ├── Deepstaging.Validation.CodeFixes/
│   ├── Deepstaging.Validation/
│   └── Deepstaging.Validation.Tests/
└── Deepstaging.Validation.slnx               # Solution at packages level

# Build it
cd packages
dotnet build Deepstaging.Validation.slnx

# Pack it (publishes ONE package with all assemblies)
cd Deepstaging.Validation/Deepstaging.Validation.Generators
dotnet pack
```

#### Scenario 2: Standalone Package (New repo - like Effects)

```bash
# Create new repository
mkdir my-roslyn-tool
cd my-roslyn-tool
git init

# Generate from template
dotnet new deepstaging-roslyn -n MyRoslynTool

# Creates:
my-roslyn-tool/
├── MyRoslynTool/                             # Package folder
│   ├── MyRoslynTool.Contracts/
│   ├── MyRoslynTool.Queries/
│   ├── MyRoslynTool.Generators/              # META-PACKAGE
│   ├── MyRoslynTool.Analyzers/
│   ├── MyRoslynTool.CodeFixes/
│   ├── MyRoslynTool/
│   └── MyRoslynTool.Tests/
├── MyRoslynTool.slnx                         # Solution at root
├── Directory.Build.props
├── Directory.Packages.props
├── pack.sh
└── .gitignore

# Build it
dotnet build MyRoslynTool.slnx

# Pack it
./pack.sh
# or: cd MyRoslynTool/MyRoslynTool.Generators && dotnet pack
```

#### Scenario 3: Add Project to Existing Package (NEW SCRIPT)

```bash
# From deepstaging repo root
./scripts/add-project.sh Validation Extensions

# Interactive prompts:
# Which package? [List existing packages]
# → Deepstaging.Validation
# 
# What type of project?
# → [1] Runtime Library (net10.0)
#   [2] Roslyn Analyzer (netstandard2.0)
#   [3] Code Fix Provider (netstandard2.0)
#   [4] Contracts/Attributes (netstandard2.0)
#   [5] Test Project (net10.0)
#   [6] Query Library (netstandard2.0)

# Creates:
packages/Deepstaging.Validation/Deepstaging.Validation.Extensions/
  └── Deepstaging.Validation.Extensions.csproj

# Updates:
# - Adds to solution file
# - Updates meta-package to bundle it (if appropriate)
# - Updates references as needed
```

## Implementation Plan

### Phase 1: Reorganize Template Structure ✨

**Goal:** Make template generate nested structure by default

**Tasks:**

1. **Restructure template directory:**
   ```bash
   cd packages/Deepstaging.Templates/deepstaging-roslyn/
   
   # Create package folder
   mkdir -p MyRoslynTool.Package
   
   # Move all project folders INTO package folder
   mv MyRoslynTool MyRoslynTool.Package/
   mv MyRoslynTool.Analyzers MyRoslynTool.Package/
   mv MyRoslynTool.CodeFixes MyRoslynTool.Package/
   mv MyRoslynTool.Contracts MyRoslynTool.Package/
   mv MyRoslynTool.Generators MyRoslynTool.Package/
   mv MyRoslynTool.Queries MyRoslynTool.Package/
   mv MyRoslynTool.Tests MyRoslynTool.Package/
   mv MyRoslynTool.Sample MyRoslynTool.Package/
   
   # Move package docs INTO package folder
   mv README.md MyRoslynTool.Package/
   mv GETTING_STARTED.md MyRoslynTool.Package/
   mv PACKAGING.md MyRoslynTool.Package/
   mv LICENSE MyRoslynTool.Package/
   
   # Keep at template root:
   # - MyRoslynTool.slnx (solution)
   # - Directory.Build.props
   # - Directory.Packages.props
   # - pack.sh / pack.cmd
   # - .gitignore
   ```

2. **Update `.template.config/template.json`:**
   ```json
   {
     "sourceName": "MyRoslynTool",
     "symbols": {
       "IncludeSample": {
         "type": "parameter",
         "datatype": "bool",
         "defaultValue": "true",
         "description": "Include sample consumer project"
       }
     },
     "sources": [
       {
         "source": "./",
         "target": "./",
         "modifiers": [
           {
             "condition": "(!IncludeSample)",
             "exclude": [
               "MyRoslynTool/MyRoslynTool.Sample/**/*"
             ]
           }
         ],
         "rename": {
           "MyRoslynTool.Package": "MyRoslynTool"
         }
       }
     ]
   }
   ```

3. **Update solution file** (`MyRoslynTool.slnx`):
   ```xml
   <Solution>
     <Folder Name="/MyRoslynTool/">
       <File Path="MyRoslynTool/README.md" />
       <File Path="MyRoslynTool/GETTING_STARTED.md" />
       <File Path="MyRoslynTool/PACKAGING.md" />
       <File Path="MyRoslynTool/LICENSE" />
     </Folder>
     <Project Path="MyRoslynTool/MyRoslynTool.Contracts/MyRoslynTool.Contracts.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Queries/MyRoslynTool.Queries.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Generators/MyRoslynTool.Generators.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Analyzers/MyRoslynTool.Analyzers.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.CodeFixes/MyRoslynTool.CodeFixes.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool/MyRoslynTool.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Tests/MyRoslynTool.Tests.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Sample/MyRoslynTool.Sample.csproj" 
              Condition="Exists('MyRoslynTool/MyRoslynTool.Sample/MyRoslynTool.Sample.csproj')" />
   </Solution>
   ```

4. **Update `pack.sh` / `pack.cmd`:**
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   
   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   
   echo "Packing MyRoslynTool..."
   dotnet pack "$SCRIPT_DIR/MyRoslynTool/MyRoslynTool.Generators/MyRoslynTool.Generators.csproj" \
     --configuration Release \
     --output "$SCRIPT_DIR/artifacts"
   
   echo "✓ Package created in artifacts/"
   ```

5. **Test template generation:**
   ```bash
   # Test default (with sample)
   dotnet new deepstaging-roslyn -n TestTool1
   cd TestTool1
   dotnet build
   dotnet test
   ./pack.sh
   
   # Test without sample
   dotnet new deepstaging-roslyn -n TestTool2 --IncludeSample false
   cd TestTool2
   dotnet build
   ```

### Phase 2: Simplify `new-package.sh` Script 🎯

**Goal:** Script becomes trivial - template already has correct structure

**Old Script (complex):**
- Generate template
- Move/rename directories
- Delete standalone files
- Rewrite Directory.Build.props
- Update project references
- Create solution file manually
- 289 lines of bash

**New Script (simple):**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Create a new Deepstaging package from template
# Usage: ./scripts/new-package.sh PackageName

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"

# [... validation code stays the same ...]

info "Creating new Deepstaging package: $PACKAGE_NAME"

# Step 1: Generate from template (already has nested structure!)
info "Generating from template..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cd "$TEMP_DIR"
dotnet new deepstaging-roslyn -n "$PACKAGE_NAME" --IncludeSample false

# Step 2: Move to packages directory
info "Moving to packages directory..."
mv "$TEMP_DIR/$PACKAGE_NAME" "$PACKAGES_DIR/"
success "Moved to $PACKAGES_DIR/$PACKAGE_NAME"

# Step 3: Move solution file to packages level
mv "$PACKAGES_DIR/$PACKAGE_NAME/$PACKAGE_NAME.slnx" "$PACKAGES_DIR/"
success "Solution file at packages/$PACKAGE_NAME.slnx"

# Step 4: Replace standalone configs with monorepo imports
cat > "$PACKAGES_DIR/$PACKAGE_NAME/Directory.Build.props" << 'EOF'
<Project>
    <Import Project="../build/build.props"/>
</Project>
EOF

rm -f "$PACKAGES_DIR/$PACKAGE_NAME/Directory.Packages.props"
rm -f "$PACKAGES_DIR/$PACKAGE_NAME/pack.sh"
rm -f "$PACKAGES_DIR/$PACKAGE_NAME/pack.cmd"
rm -f "$PACKAGES_DIR/$PACKAGE_NAME/.gitignore"

# Step 5: Update PackageReference → ProjectReference
find "$PACKAGES_DIR/$PACKAGE_NAME" -name "*.csproj" -exec sed -i.bak \
  's|<PackageReference Include="Deepstaging\.Roslyn" />|<ProjectReference Include="../../Deepstaging/Deepstaging.Roslyn/Deepstaging.Roslyn.csproj" Private="true" />|g' {} \;

# [... more sed replacements ...]

# Done!
success "Package created: $PACKAGE_NAME"
echo "Build: cd packages && dotnet build $PACKAGE_NAME.slnx"
```

**Benefits:**
- 80% less code
- No directory restructuring
- Fewer error-prone operations
- Template is single source of truth

### Phase 3: Create `add-project.sh` Script 🆕

**Goal:** Add new projects to existing packages

**Usage:**
```bash
./scripts/add-project.sh <PackageName> <ProjectName> [--type <type>]
```

**Example:**
```bash
# Interactive mode
./scripts/add-project.sh Validation Extensions

# Which package?
# → Deepstaging.Validation (found at packages/Deepstaging.Validation)

# Project type?
# 1. Runtime Library (net10.0)
# 2. Roslyn Analyzer (netstandard2.0)
# 3. Code Fix Provider (netstandard2.0)
# 4. Contracts/Attributes (netstandard2.0)
# 5. Test Project (net10.0)
# 6. Query Library (netstandard2.0)
# → 1

# Creates: packages/Deepstaging.Validation/Deepstaging.Validation.Extensions/
# Updates: packages/Deepstaging.Validation.slnx
# Prompts: "Add to meta-package? (Deepstaging.Validation.Generators)"
```

**Script Structure:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Validation
validate_package_exists() { ... }
prompt_project_type() { ... }

# Project creation
create_runtime_library() { ... }
create_analyzer() { ... }
create_contracts() { ... }
create_test_project() { ... }
create_query_library() { ... }

# Integration
add_to_solution() { ... }
prompt_add_to_metapackage() { ... }
update_metapackage() { ... }

# Main flow
main() {
  PACKAGE_NAME="$1"
  PROJECT_NAME="$2"
  
  validate_package_exists "$PACKAGE_NAME"
  PROJECT_TYPE=$(prompt_project_type)
  
  create_project "$PACKAGE_NAME" "$PROJECT_NAME" "$PROJECT_TYPE"
  add_to_solution "$PACKAGE_NAME" "$PROJECT_NAME"
  
  if should_bundle_in_metapackage "$PROJECT_TYPE"; then
    if prompt_add_to_metapackage; then
      update_metapackage "$PACKAGE_NAME" "$PROJECT_NAME" "$PROJECT_TYPE"
    fi
  fi
  
  success "Project created!"
}
```

### Phase 4: Update Documentation 📚

**Files to update:**

1. **Template README** (`packages/Deepstaging.Templates/deepstaging-roslyn/MyRoslynTool/README.md`)
   - Explain nested structure
   - Document meta-package concept
   - Show how to add projects manually

2. **PACKAGING.md**
   - Emphasize one package = one NuGet package
   - Document what gets bundled
   - Explain `PackagePath` in `.Generators` project

3. **Monorepo docs** (`deepstaging/packages/PACKAGE_DEVELOPMENT.md`)
   - Update workflow for new structure
   - Document `new-package.sh` simplified
   - Document `add-project.sh` usage

4. **Effects setup** (`effects/SETUP.md`)
   - Update to reflect new template structure
   - No changes needed to workflow

## Testing Strategy

### Template Tests

```bash
# Test 1: Standalone generation
dotnet new deepstaging-roslyn -n TestStandalone
cd TestStandalone
dotnet build TestStandalone.slnx
dotnet test TestStandalone.slnx
./pack.sh
ls artifacts/*.nupkg

# Verify structure
test -d TestStandalone/
test -f TestStandalone.slnx
test -f TestStandalone/TestStandalone/TestStandalone.csproj
test -f TestStandalone/TestStandalone.Generators/TestStandalone.Generators.csproj

# Test 2: Without sample
dotnet new deepstaging-roslyn -n TestNoSample --IncludeSample false
cd TestNoSample
! test -d TestNoSample/TestNoSample.Sample  # Should NOT exist
dotnet build
```

### Monorepo Integration Tests

```bash
# Test 1: Create package
cd deepstaging
./scripts/new-package.sh TestPackage
test -d packages/Deepstaging.TestPackage/
test -f packages/Deepstaging.TestPackage.slnx

cd packages
dotnet build Deepstaging.TestPackage.slnx
dotnet test Deepstaging.TestPackage.slnx

# Test 2: Add project to package
./scripts/add-project.sh TestPackage Extensions --type runtime
test -d packages/Deepstaging.TestPackage/Deepstaging.TestPackage.Extensions/
dotnet build Deepstaging.TestPackage.slnx

# Test 3: Pack the package
cd packages/Deepstaging.TestPackage/Deepstaging.TestPackage.Generators
dotnet pack --configuration Release
```

### Effects Repository Test

```bash
# Verify existing Effects package still works
cd effects
dotnet build Deepstaging.Effects.slnx
dotnet test Deepstaging.Effects.slnx

# Test adding new project
# (would need to adapt add-project.sh to work in standalone repos)
```

## Migration Strategy

### For Template

1. ✅ Create backup branch
2. ✅ Reorganize directory structure
3. ✅ Update template.json
4. ✅ Test generation in isolation
5. ✅ Update pack scripts
6. ✅ Reinstall template: `dotnet new uninstall` → `dotnet new install`

### For Scripts

1. ✅ Simplify `new-package.sh` (keep old version as `.bak`)
2. ✅ Test with real package creation
3. ✅ Create `add-project.sh`
4. ✅ Test adding projects

### For Existing Packages

**No changes needed!** Existing packages already have correct structure:
- `packages/Deepstaging/` ✅
- `packages/Deepstaging.Testing/` ✅

New packages will be cleaner (less script magic).

## Benefits Summary

### For Developers

✅ **Single Structure:** One way to organize packages (no confusion)  
✅ **Natural Grouping:** Related projects live together  
✅ **Easy Growth:** Add projects to package with simple script  
✅ **Clear Publishing:** One meta-package bundles everything  
✅ **Proven Pattern:** Same as Effects and core Deepstaging

### For Maintainers

✅ **Simpler Scripts:** Template does the work, not bash  
✅ **Single Source of Truth:** Structure defined in template  
✅ **Easier Testing:** Test template independently  
✅ **Better Documentation:** Structure is self-evident  
✅ **Less Magic:** Fewer post-processing transformations

### For Template Users

✅ **Standalone Use:** Works great for new repos (like Effects)  
✅ **Monorepo Use:** Integrates cleanly with simple script  
✅ **Flexible:** Can add/remove projects as needed  
✅ **Standard:** Follows .NET conventions  

## Open Questions

1. **Naming:** Should we rename `MyRoslynTool.Package` → `MyRoslynTool` during generation?
   - ✅ YES (via template.json rename)

2. **Sample Project:** Keep enabled by default?
   - ✅ YES for standalone, NO for monorepo

3. **add-project.sh:** Support both monorepo and standalone?
   - 🤔 Start with monorepo, extend later if needed

4. **Documentation:** Where to put "how to add projects manually"?
   - ✅ In package README.md (generated by template)

5. **pack.sh:** Include in template root for standalone use?
   - ✅ YES (removed by new-package.sh for monorepo)

## Next Steps

1. ✅ Review this plan
2. ✅ Get feedback on approach
3. ✅ Implement Phase 1 (template restructure)
4. ✅ Test thoroughly
5. ✅ Implement Phase 2 (simplify script)
6. ✅ Implement Phase 3 (add-project.sh)
7. ✅ Update documentation
8. ✅ Publish updated template
