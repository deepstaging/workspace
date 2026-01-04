# Repository Structure Convention - Decision Review

**Date:** 2026-01-04

This document summarizes all decisions made about repository structure conventions for the Deepstaging ecosystem.

## Core Structure Decisions

### ✅ Q1.1: Package Organization Pattern

**CHOSEN: Grouped with Meta-package Pattern**

```
src/
└── MyPackage/                          # Package group (clear ownership)
    ├── MyPackage.Nuget/                # Meta-package (bundles everything)
    │   └── MyPackage.Nuget.csproj      # PackageId: "MyPackage"
    ├── MyPackage/                      # Runtime library (actual implementation)
    │   └── MyPackage.csproj            # <IsPackable>false</IsPackable>
    ├── MyPackage.Generators/           # Source generators
    │   └── MyPackage.Generators.csproj # <IsPackable>false</IsPackable>
    └── MyPackage.Analyzers/            # Analyzers
        └── MyPackage.Analyzers.csproj  # <IsPackable>false</IsPackable>
```

**Benefits:**
- ✅ Clear package grouping under `MyPackage/` directory
- ✅ Meta-package explicit with `.Nuget` suffix
- ✅ Runtime library has clean name: `MyPackage.dll`
- ✅ Users install clean package: `<PackageReference Include="MyPackage" />`
- ✅ Scalable: Easy to add more packages as sibling directories

---

### ✅ Q1.2: Meta-package Content

**CHOSEN: Empty "bundle" project (only <ProjectReference>, no code)**

**Rationale:**
- Meta-package (`MyPackage.Nuget`) is purely for packaging/distribution
- All actual implementation lives in `MyPackage/` (runtime library)
- Clear separation: packaging infrastructure vs. runtime code
- `<IncludeBuildOutput>false</IncludeBuildOutput>` in meta-package

**Example:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <IsPackable>true</IsPackable>
    <PackageId>MyPackage</PackageId>
    <IncludeBuildOutput>false</IncludeBuildOutput>
  </PropertyGroup>
  
  <ItemGroup>
    <ProjectReference Include="../MyPackage/MyPackage.csproj" 
                      PrivateAssets="none" />
    <ProjectReference Include="../MyPackage.Analyzers/MyPackage.Analyzers.csproj" 
                      ReferenceOutputAssembly="false" 
                      OutputItemType="Analyzer" />
  </ItemGroup>
</Project>
```

---

### ✅ Q1.3: Naming Convention

**CHOSEN: `.Nuget` suffix for meta-package project**

**Naming pattern:**
- Package group directory: `MyPackage/`
- Meta-package project: `MyPackage.Nuget/MyPackage.Nuget.csproj`
- Meta-package PackageId: `MyPackage` (no suffix in NuGet)
- Runtime library: `MyPackage/MyPackage.csproj` → produces `MyPackage.dll`

**Examples:**
- `Deepstaging.Nuget` → packages `Deepstaging`
- `Deepstaging.Testing.Nuget` → packages `Deepstaging.Testing`
- `MyTool.Nuget` → packages `MyTool`

---

### ✅ Q2.3: IsPackable Markers

**CHOSEN: Default to false in Directory.Build.props, explicit true in .Nuget projects**

**Rationale:**
- Safe by default - projects aren't accidentally packaged
- Only meta-packages (`.Nuget` projects) need packaging
- Clear and explicit - `.Nuget` projects opt-in with `<IsPackable>true</IsPackable>`
- Less repetition - don't need to mark every project as false

**Directory.Build.props:**
```xml
<Project>
  <PropertyGroup>
    <!-- Default: projects are not packable -->
    <IsPackable>false</IsPackable>
  </PropertyGroup>
</Project>
```

**Meta-package project (MyPackage.Nuget.csproj):**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IsPackable>true</IsPackable>  <!-- ← Explicit opt-in -->
    <PackageId>MyPackage</PackageId>
    <IncludeBuildOutput>false</IncludeBuildOutput>
  </PropertyGroup>
  
  <ItemGroup>
    <ProjectReference Include="../MyPackage/MyPackage.csproj" 
                      PrivateAssets="none" />
  </ItemGroup>
</Project>
```

**Runtime/component projects:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <!-- IsPackable inherited as false - no need to specify -->
  </PropertyGroup>
</Project>
```

**Note:** Runtime libraries, analyzers, generators, and other components use `net10.0` for modern .NET features.

**Test projects:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <IsTestProject>true</IsTestProject>
    <!-- IsPackable inherited as false - no need to specify -->
  </PropertyGroup>
</Project>
```

---

### ✅ Q3.1: Where Packable Projects Live

**CHOSEN: (Implied by Q1.1) - Already answered**

Packable projects live within package group directories:
```
src/
├── MyPackage/              # Package group
│   └── MyPackage.Nuget/    # Packable project
└── MyOtherPackage/         # Another package group
    └── MyOtherPackage.Nuget/
```

---

### ✅ Q3.2: Multi-project Package Grouping

**CHOSEN: Option A - Grouped under package name**

```
src/
└── MyPackage/                  # Package directory
    ├── MyPackage.Nuget/        # Meta-package project (bundle)
    ├── MyPackage/              # Runtime library
    ├── MyPackage.Roslyn/       # Bundled component
    └── MyPackage.Generators/   # Bundled component
```

**Rationale:**
- Clear ownership - all related projects together
- Easy to see what's part of a package
- Matches the chosen structure from Q1.1

---

### ✅ Q4.2: Deepstaging.Testing Location

**CHOSEN: Yes, keep in Deepstaging repo**

**Rationale:**
- It's part of the core Deepstaging offering
- Testing infrastructure is foundational
- Users expect it to be available
- Simplifies distribution

---

### ✅ Q5.1: Effects Package Structure

**CHOSEN: Single bundle package**

**Package:** `Deepstaging.Effects` (includes everything)

**Rationale:**
- Simpler for users - one package to install
- All components work together
- Easier to version (single version number)
- Clear offering

---

### ✅ Q5.2: Effects Directory Structure

**CHOSEN: Grouped**

```
src/
└── Deepstaging.Effects/        # Package group
    ├── Deepstaging.Effects.Nuget/
    ├── Deepstaging.Effects/    # Runtime
    ├── Deepstaging.Effects.Analyzers/
    ├── Deepstaging.Effects.Generators/
    ├── Deepstaging.Effects.CodeFixes/
    ├── Deepstaging.Effects.Contracts/
    └── Deepstaging.Effects.Queries/
```

---

## Complete Standard Structure

### Repository Root Structure

```
repo-name/                      # Lowercase kebab-case (e.g., deepstaging, effects)
├── src/                        # All source code
│   └── PackageName/            # Package group directory
│       ├── PackageName.Nuget/  # Meta-package (PackageId: "PackageName")
│       ├── PackageName/        # Runtime library
│       ├── PackageName.Tests/  # Single test project for all components
│       ├── PackageName.Generators/
│       ├── PackageName.Analyzers/
│       └── PackageName.CodeFixes/
├── samples/                    # Demo projects (optional)
├── docs/                       # Documentation site (optional)
├── PackageName.slnx           # Solution at root, PascalCase, XML format
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
└── LICENSE
```

**Note:** Single test project (`PackageName.Tests`) tests all components within the package group.

---

## Deepstaging Restructure Plan

### Current Structure
```
deepstaging/
└── packages/
    ├── Deepstaging.slnx
    ├── Deepstaging/
    │   ├── Deepstaging/
    │   ├── Deepstaging.Roslyn/
    │   ├── Deepstaging.Generators/
    │   └── Deepstaging.Roslyn.Tests/
    └── Deepstaging.Testing/
        └── Deepstaging.Testing/
```

### Target Structure
```
deepstaging/
├── src/
│   ├── Deepstaging/                    # Package group
│   │   ├── Deepstaging.Nuget/          # Meta-package (PackageId: "Deepstaging")
│   │   ├── Deepstaging.Roslyn/         # Runtime/queries
│   │   ├── Deepstaging.Generators/     # Source generators
│   │   └── Deepstaging.Tests/          # Single test project for Deepstaging package
│   └── Deepstaging.Testing/            # Separate package group
│       ├── Deepstaging.Testing.Nuget/  # Meta-package
│       ├── Deepstaging.Testing/        # Testing infrastructure
│       └── Deepstaging.Testing.Tests/  # Tests for Testing package
├── samples/
├── docs/                                # Rename from docs-site
├── Deepstaging.slnx                     # Move from packages/
├── Directory.Build.props
├── Directory.Packages.props
└── README.md
```

**Key Changes:**
1. Move `packages/` → `src/`
2. Create package groups: `Deepstaging/` and `Deepstaging.Testing/`
3. Add `.Nuget` meta-package projects
4. Move solution to root (keep .slnx format)
5. Single test project per package group
6. Rename `docs-site/` → `docs/`

---

## Effects Restructure Plan

### Current Structure
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
└── Deepstaging.Effects.slnxx
```

### Target Structure
```
effects/
├── src/
│   └── Deepstaging.Effects/            # Package group
│       ├── Deepstaging.Effects.Nuget/  # Meta-package (PackageId: "Deepstaging.Effects")
│       ├── Deepstaging.Effects/        # Runtime
│       ├── Deepstaging.Effects.Tests/  # Tests next to runtime
│       ├── Deepstaging.Effects.Analyzers/
│       ├── Deepstaging.Effects.Analyzers.Tests/
│       ├── Deepstaging.Effects.Generators/
│       ├── Deepstaging.Effects.Generators.Tests/
│       ├── Deepstaging.Effects.CodeFixes/
│       ├── Deepstaging.Effects.Contracts/
│       └── Deepstaging.Effects.Queries/
├── Deepstaging.Effects.slnx            # Rename from .slnx
├── Directory.Build.props
└── Directory.Packages.props
```

**Key Changes:**
1. Create `src/` directory
2. Keep `Deepstaging.Effects/` as package group
3. Add `Deepstaging.Effects.Nuget/` meta-package project
4. Test projects live next to their respective projects
5. Keep .slnx format (already in use)

---

## Template Structure

Based on decisions, the `new-roslyn-project.sh MyTool` should generate:

```
my-tool/
├── src/
│   └── MyTool/                         # Package group
│       ├── MyTool.Nuget/               # Meta-package (empty bundle)
│       │   └── MyTool.Nuget.csproj     # PackageId: "MyTool"
│       ├── MyTool/                     # Runtime library
│       │   └── MyTool.csproj           # Queries, core logic
│       ├── MyTool.Tests/               # Single test project for all components
│       │   └── MyTool.Tests.csproj     # Tests runtime, generators, analyzers
│       ├── MyTool.Generators/          # Source generators
│       │   └── MyTool.Generators.csproj
│       ├── MyTool.Analyzers/           # Analyzers
│       │   └── MyTool.Analyzers.csproj
│       └── MyTool.Contracts/           # Public contracts
│           └── MyTool.Contracts.csproj
├── samples/
│   └── MyTool.Sample/
│       └── MyTool.Sample.csproj
├── MyTool.slnx
├── Directory.Build.props
├── Directory.Packages.props
├── .gitignore
├── README.md
└── LICENSE
```

**Note:** Single `MyTool.Tests` project tests all components (runtime, generators, analyzers, etc.).

---

## Naming Conventions

### Repository Names
- Lowercase with hyphens: `deepstaging`, `deepstaging-effects`
- GitHub URL friendly

### Solution Names
- PascalCase: `Deepstaging.slnx`, `Deepstaging.Effects.slnxx`
- Always at repository root
- Extension: `.slnx` (modern XML-based format)

### Package Group Directories
- PascalCase: `Deepstaging/`, `Deepstaging.Effects/`, `MyTool/`
- Under `src/`

### Project Names
**Meta-package:**
- `PackageName.Nuget/PackageName.Nuget.csproj`
- PackageId: `PackageName` (no suffix)

**Runtime:**
- `PackageName/PackageName.csproj` → `PackageName.dll`

**Components:**
- `PackageName.Generators/`
- `PackageName.Analyzers/`
- `PackageName.CodeFixes/`
- `PackageName.Contracts/`
- `PackageName.Queries/`

**Tests:**
- `PackageName.Tests/` (single test project per package group)
- Tests all components: runtime, generators, analyzers, etc.
- Pattern: One `ProjectName.Tests/` per package group

---

## Next Steps

### Phase 1: Documentation & Template
1. ✅ Document finalized convention
2. ⏰ Update `new-roslyn-project.sh` template
3. ⏰ Create example `.Nuget` project templates
4. ⏰ Update all convention docs with final decisions

### Phase 2: Effects Migration (Simpler)
1. ⏰ Create `src/` and `tests/` directories
2. ⏰ Create `Deepstaging.Effects.Nuget/` meta-package
3. ⏰ Move projects to new locations
4. ⏰ Update solution file
5. ⏰ Test build and package

### Phase 3: Deepstaging Migration (More Complex)
1. ⏰ Create `src/` and `tests/` directories
2. ⏰ Create package groups: `Deepstaging/`, `Deepstaging.Testing/`
3. ⏰ Create meta-packages: `Deepstaging.Nuget/`, `Deepstaging.Testing.Nuget/`
4. ⏰ Move projects to new locations
5. ⏰ Update solution file
6. ⏰ Test build and package

### Phase 4: Script Simplification
1. ⏰ Update `publish.sh` to assume convention
2. ⏰ Remove special-case logic
3. ⏰ Add structure validation
4. ⏰ Update documentation

---

## Questions Still Open

Need clarification on:
- **Q2.1:** How many packages per repo? (Seems answered: one main + optional extras)
- **Q2.2:** Separate packages for analyzers/generators? (Implied: bundled by default)
- **Q6.1, Q6.2:** Template generation details
- **Q7.2:** Component naming (already consistent: `.Generators`, `.Analyzers`, `.CodeFixes`)
- **Q8.1:** Directory.Build.props defaults
- **Q9.1, Q9.2:** Documentation structure
- **Q10.1, Q10.2:** Migration timing
- **Q11.1, Q11.2:** Script behavior

Most of these are minor details that can be decided during implementation.

---

## Summary

**Core Pattern:**
```
src/PackageName/
├── PackageName.Nuget/    # Empty meta-package (PackageId: "PackageName")
├── PackageName/          # Runtime library
├── PackageName.Tests/    # Single test project for all components
└── PackageName.*/        # Components (bundled: Generators, Analyzers, etc.)
```

**Key Principles:**
- ✅ Grouped package structure
- ✅ Explicit `.Nuget` meta-packages
- ✅ Clean runtime library names
- ✅ Explicit `<IsPackable>` markers
- ✅ Solution at root (.slnx format)
- ✅ src/ for all code (including tests)
- ✅ Single test project per package group

**Ready to implement!** 🚀
