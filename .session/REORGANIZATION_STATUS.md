# Convention Migration - Reorganization Status

**Date:** 2026-01-04  
**Status:** ✅ STRUCTURAL REORGANIZATION COMPLETE - Code fixes needed

---

## ✅ Repository Structure Corrected

All repositories now follow the standard convention:
- `src/` at repository root (not nested in packages/)
- Each package is a separate directory in `src/`
- No special "packages/" wrapper directory

### Deepstaging Repository Structure
```
deepstaging/
├── src/
│   ├── Deepstaging/                    # Core package
│   │   ├── Deepstaging.Roslyn/
│   │   ├── Deepstaging.Generators/
│   │   ├── Deepstaging.Nuget/
│   │   ├── Deepstaging.Tests/
│   │   ├── Directory.Build.props
│   │   ├── Directory.Packages.props
│   │   └── Deepstaging.slnx
│   ├── Deepstaging.Testing/            # Separate package
│   │   ├── Deepstaging.Testing/
│   │   ├── Directory.Build.props
│   │   ├── Directory.Packages.props
│   │   └── Deepstaging.Testing.slnx
│   └── Deepstaging.Templates/          # Separate package
│       ├── deepstaging-roslyn/
│       ├── Deepstaging.Templates.csproj
│       └── Directory.Build.props
├── docs/                               # Renamed from docs-site
└── workspace/
```

## ✅ Completed Work

### Phase 1: Template (Deepstaging.Templates/deepstaging-roslyn)
- ✅ Restructured to `src/MyRoslynTool/` grouped package structure
- ✅ Renamed `MyRoslynTool.NugetPackage` → `MyRoslynTool.Nuget`
- ✅ Updated all project references to use `../src/MyRoslynTool/` paths
- ✅ Updated `Directory.Packages.props` to use Deepstaging 0.1.0
- ✅ Added `IsPackable=false` default to `Directory.Build.props`
- ✅ Updated solution file with src/ paths
- ✅ **Committed to `convention-migration` branch**

**Blocked on:** Deepstaging.Testing package (needs ModuleInitializerAttribute fix)

---

### Phase 2: Effects
- ✅ **FULLY COMPLETE** - All work finished
- ✅ Moved all projects to `src/Deepstaging.Effects/`
- ✅ Created `Deepstaging.Effects.Nuget` meta-package with proper bundling
- ✅ Added `Directory.Build.props` with `IsPackable=false` default
- ✅ Added `Directory.Packages.props` for centralized package management
- ✅ Removed SourceGenerator.Foundations completely
- ✅ Converted EffectsGenerator to standard `IIncrementalGenerator`
- ✅ **Build succeeds:** 0 errors (only documentation warnings)
- ✅ **Package created:** `Deepstaging.Effects.0.1.0.nupkg` in local NuGet feed
- ✅ **Committed to `convention-migration` branch**

**Blocked on:** Deepstaging.Testing for running tests

---

### Phase 3: Deepstaging
- ✅ **COMPLETE** - Structure fully reorganized
- ✅ Created `convention-migration` branch
- ✅ Moved `packages/src/` to `src/` (repository root level)
- ✅ Deepstaging.Testing separated to `src/Deepstaging.Testing/` (own package)
- ✅ Deepstaging.Templates separated to `src/Deepstaging.Templates/` (own package)
- ✅ Renamed `docs-site/` to `docs/`
- ✅ Removed `packages/` directory completely
- ✅ Renamed `Deepstaging.Roslyn.Tests` → `Deepstaging.Tests` (single test project)
- ✅ Renamed `Deepstaging/` → `Deepstaging.Nuget/` (meta-package)
- ✅ Updated all solution files with correct relative paths
- ✅ Added Directory.Build.props per package with IsPackable=false default
- ✅ Added Directory.Packages.props to Deepstaging.Testing
- ✅ Updated all project references
- ✅ Updated `InternalsVisibleTo` to reference `Deepstaging.Tests`
- ✅ Added `PolySharpIncludeRuntimeSupportedAttributes=false` to Directory.Build.props
- ✅ **Build succeeds:** Deepstaging.slnx builds with 0 errors
- ✅ **Package created:** `Deepstaging.0.1.0.nupkg` in local NuGet feed
- ✅ **Committed to `convention-migration` branch**

**Blocked on:** ModuleInitializerAttribute conflict (see below)

---

## 🔧 Remaining Code Fix

### ModuleInitializerAttribute Conflict

**Problem:**
- PolySharp generates `ModuleInitializerAttribute` in `Deepstaging.Generators.dll`
- This conflicts with .NET 10 runtime which includes this attribute natively
- Causes build errors in `Deepstaging.Testing` (Release mode) and any consuming projects

**Current State:**
- Property `PolySharpIncludeRuntimeSupportedAttributes=false` is set in:
  - `deepstaging/src/Deepstaging/Directory.Build.props` (line 8) - global for package
  - `deepstaging/src/Deepstaging/Deepstaging.Generators/Deepstaging.Generators.csproj` (line 10) - local override
- Property is not fully effective - attribute still generated
- Property is not fully effective - attribute still generated

**Build Error Example:**
```
error CS0433: The type 'ModuleInitializerAttribute' exists in both 
  'Deepstaging.Generators, Version=0.1.0.0, Culture=neutral, PublicKeyToken=null' and 
  'System.Runtime, Version=10.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
```

**Solution Options:**

1. **Option A: Exclude generated file** (Recommended)
   Add to `Deepstaging.Generators.csproj`:
   ```xml
   <ItemGroup>
     <Compile Remove="obj/**/*.g.cs" />
   </ItemGroup>
   ```
   Or use CompilerVisibleProperty to control PolySharp more precisely.

2. **Option B: Use extern alias**
   Already implemented in `Deepstaging.Testing.csproj` for Release mode:
   ```xml
   <PackageReference Include="Deepstaging" Aliases="dsg" Condition="'$(Configuration)' == 'Release'" />
   ```
   May need to extend this pattern to other referencing projects.

3. **Option C: Remove PolySharp dependency**
   If the polyfills aren't needed for netstandard2.0, remove the package entirely.

**Files Affected:**
- `deepstaging/src/Deepstaging/Deepstaging.Generators/Deepstaging.Generators.csproj`
- `deepstaging/src/Deepstaging.Testing/Deepstaging.Testing/Deepstaging.Testing.csproj`

---

## 📦 Package Status

### Local NuGet Feed (~/.nuget/local-feed/)
- ✅ `Deepstaging.0.1.0.nupkg` - Latest build (includes ModuleInitializerAttribute)
- ✅ `Deepstaging.Effects.0.1.0.nupkg` - Latest build (working)
- ❌ `Deepstaging.Testing.0.1.0-preview.nupkg` - NOT built (blocked on ModuleInitializerAttribute)

### Build Status
| Package | Build | Tests | Package |
|---------|-------|-------|---------|
| Deepstaging | ✅ Success | ⚠️ Blocked | ✅ Created |
| Deepstaging.Effects | ✅ Success | ⚠️ Blocked | ✅ Created |
| Template | ⚠️ Not tested | ⚠️ Blocked | ⚠️ Not tested |

---

## 🎯 Next Steps (For Code Fixes)

### 1. Fix ModuleInitializerAttribute in Deepstaging.Generators
```bash
cd deepstaging/src/Deepstaging
# Edit Deepstaging.Generators/Deepstaging.Generators.csproj
# Apply one of the solutions above
```

### 2. Clean rebuild and verify
```bash
rm -rf Deepstaging.Generators/obj Deepstaging.Generators/bin
dotnet build Deepstaging.Generators/Deepstaging.Generators.csproj -c Release
# Verify attribute is gone:
strings Deepstaging.Generators/bin/Release/netstandard2.0/Deepstaging.Generators.dll | grep ModuleInitializer
# Should return empty
```

### 3. Rebuild and pack everything
```bash
# Build and pack Deepstaging
dotnet build Deepstaging.slnx -c Release
dotnet pack Deepstaging.Nuget/Deepstaging.Nuget.csproj -c Release --no-build -o ~/.nuget/local-feed/

# Build and pack Deepstaging.Testing
cd ../Deepstaging.Testing
dotnet build Deepstaging.Testing/Deepstaging.Testing.csproj -c Release
dotnet pack Deepstaging.Testing/Deepstaging.Testing.csproj -c Release --no-build -o ~/.nuget/local-feed/
```

### 4. Test Effects with updated packages
```bash
cd ../../effects
rm -rf ~/.nuget/packages/deepstaging/0.1.0
rm -rf ~/.nuget/packages/deepstaging.testing/0.1.0-preview
dotnet restore --force-evaluate
dotnet build Deepstaging.Effects.slnx -c Release
dotnet test Deepstaging.Effects.slnx -c Release
```

### 5. Test template
```bash
cd ../deepstaging/src/Deepstaging.Templates/deepstaging-roslyn
rm -rf ~/.nuget/packages/deepstaging/0.1.0
rm -rf ~/.nuget/packages/deepstaging.testing/0.1.0-preview
dotnet restore --force-evaluate
dotnet build MyRoslynTool.slnx
dotnet test MyRoslynTool.slnx
```

### 6. Final validation
All three repos should:
- ✅ Build with 0 errors
- ✅ Run tests successfully
- ✅ Create packages correctly

### 7. Merge branches
```bash
# In each repo:
git checkout main
git merge convention-migration
git push origin main
git branch -d convention-migration
```

---

## 📋 Success Criteria

- [ ] Deepstaging.Generators.dll does NOT contain ModuleInitializerAttribute
- [ ] Deepstaging builds and tests pass
- [ ] Deepstaging.Testing builds and packages successfully
- [ ] Effects tests pass with updated Deepstaging packages
- [ ] Template builds and tests pass
- [ ] All packages can be created and published
- [ ] No special-case logic needed in scripts

---

## 🗂️ Repository Structure (Final)

### Deepstaging (deepstaging/)
```
deepstaging/
├── src/
│   ├── Deepstaging/                    # Core package
│   │   ├── Deepstaging.Nuget/          # Meta-package (IsPackable=true)
│   │   ├── Deepstaging.Roslyn/         # Core library
│   │   ├── Deepstaging.Generators/     # Source generators
│   │   ├── Deepstaging.Tests/          # Tests for all components
│   │   ├── Directory.Build.props       # IsPackable=false default
│   │   ├── Directory.Packages.props    # Centralized package versions
│   │   └── Deepstaging.slnx
│   ├── Deepstaging.Testing/            # Separate package
│   │   ├── Deepstaging.Testing/        # Testing framework library
│   │   ├── Directory.Build.props
│   │   ├── Directory.Packages.props
│   │   └── Deepstaging.Testing.slnx
│   └── Deepstaging.Templates/          # Separate package
│       ├── deepstaging-roslyn/         # Template content
│       ├── Deepstaging.Templates.csproj
│       └── Directory.Build.props
├── docs/                               # Documentation site
└── workspace/              # Workspace docs
```

### Effects (effects/)
```
effects/
├── src/
│   └── Deepstaging.Effects/            # Package group
│       ├── Deepstaging.Effects.Nuget/  # Meta-package (IsPackable=true)
│       ├── Deepstaging.Effects/        # Core library
│       ├── Deepstaging.Effects.Analyzers/
│       ├── Deepstaging.Effects.Generators/
│       ├── Deepstaging.Effects.CodeFixes/
│       ├── Deepstaging.Effects.Contracts/
│       ├── Deepstaging.Effects.Queries/
│       └── Deepstaging.Effects.Tests/  # Tests for all components
├── Directory.Build.props                # IsPackable=false default
├── Directory.Packages.props             # Centralized package versions
└── Deepstaging.Effects.slnx
```

### Template (deepstaging/packages/Deepstaging.Templates/deepstaging-roslyn/)
```
deepstaging-roslyn/
├── src/
│   └── MyRoslynTool/                   # Package group
│       ├── MyRoslynTool.Nuget/         # Meta-package (IsPackable=true)
│       ├── MyRoslynTool.Queries/
│       ├── MyRoslynTool.Analyzers/
│       ├── MyRoslynTool.Generators/
│       ├── MyRoslynTool.CodeFixes/
│       ├── MyRoslynTool.Tests/         # Tests for all components
│       ├── README.md
│       └── LICENSE
├── MyRoslynTool.Sample/                # Sample project
├── Directory.Build.props                # IsPackable=false default
├── Directory.Packages.props             # Centralized package versions
└── MyRoslynTool.slnx
```

---

## 📝 Convention Summary

1. **Package Groups:** All related projects in `src/PackageName/` directory
2. **Meta-packages:** `PackageName.Nuget/` with `IsPackable=true`, bundles all components
3. **Single Test Project:** `PackageName.Tests/` tests all components in the group
4. **IsPackable Default:** `false` in `Directory.Build.props`, explicit `true` only in meta-packages
5. **Target Frameworks:**
   - netstandard2.0: Meta-packages, Queries, Contracts, Analyzers, Generators, CodeFixes
   - net10.0: Runtime libraries, Tests, Samples
6. **Centralized Versions:** Use `Directory.Packages.props` for package version management

---

## 🔗 Related Documentation

- Implementation plan: `workspace/docs/IMPLEMENTATION_PLAN.md`
- Convention decisions: `workspace/docs/CONVENTION_DECISIONS.md`
- Target framework strategy: `workspace/docs/TARGET_FRAMEWORK_STRATEGY.md`
