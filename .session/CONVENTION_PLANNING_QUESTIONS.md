# Repository Structure Convention - Planning Questions

## Package Structure Questions

### 1. NuGet Package Project Organization

**Q1.1:** How should we organize a package with multiple included projects?

**Option A: Dedicated Package Project (Explicit)**
```
src/
├── MyPackage/                          # Dedicated packaging project
│   └── MyPackage.csproj               # <IsPackable>true</IsPackable>
│                                      # <ProjectReference> to bundle
├── MyPackage.Core/                     # Actual implementation
│   └── MyPackage.Core.csproj          # <IsPackable>false</IsPackable>
└── MyPackage.Analyzers/               # Additional component
    └── MyPackage.Analyzers.csproj     # <IsPackable>false</IsPackable>
```

**Option B: Main Project Packages (Implicit)**
```
src/
├── MyPackage/                          # Main project
│   └── MyPackage.csproj               # <IsPackable>true</IsPackable>
│                                      # Includes Core via <ProjectReference>
├── MyPackage.Core/                     # Bundled into main
│   └── MyPackage.Core.csproj          # <IsPackable>false</IsPackable>
└── MyPackage.Analyzers/               # Separate package
    └── MyPackage.Analyzers.csproj     # <IsPackable>true</IsPackable>
```

**Option C: Packages Subdirectory**
```
src/
├── packages/                           # All packable projects here
│   ├── MyPackage/
│   │   └── MyPackage.csproj           # <IsPackable>true</IsPackable>
│   └── MyPackage.Analyzers/
│       └── MyPackage.Analyzers.csproj # <IsPackable>true</IsPackable>
├── MyPackage.Core/                     # Internal, not packaged
│   └── MyPackage.Core.csproj          # <IsPackable>false</IsPackable>
└── MyPackage.Utilities/
    └── MyPackage.Utilities.csproj     # <IsPackable>false</IsPackable>
```

**✅ CHOSEN: Option D - Grouped with Meta-package Pattern**
```
src/
└── MyPackage/                          # Package group (clear ownership)
    ├── MyPackage.Nuget/                # Meta-package (bundles everything)
    │   └── MyPackage.Nuget.csproj      # PackageId: "MyPackage"
    │                                   # <IsPackable>true</IsPackable>
    │                                   # <IncludeBuildOutput>false</IncludeBuildOutput>
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

**Q1.2:** Should the dedicated package project be empty (just references) or contain actual code?

**✅ CHOSEN: Empty "bundle" project (only <ProjectReference>, no code)**

**Rationale:**
- Meta-package (`MyPackage.Nuget`) is purely for packaging/distribution
- All actual implementation lives in `MyPackage/` (runtime library)
- Clear separation: packaging infrastructure vs. runtime code
- `<IncludeBuildOutput>false</IncludeBuildOutput>` in meta-package
- Bundled projects use `PrivateAssets`, `ReferenceOutputAssembly`, `OutputItemType` attributes

**Example MyPackage.Nuget.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IsPackable>true</IsPackable>
    <PackageId>MyPackage</PackageId>
    <IncludeBuildOutput>false</IncludeBuildOutput>  <!-- Empty! -->
  </PropertyGroup>
  
  <ItemGroup>
    <!-- Bundle runtime library -->
    <ProjectReference Include="../MyPackage/MyPackage.csproj" 
                      PrivateAssets="none" />
    
    <!-- Bundle analyzers/generators -->
    <ProjectReference Include="../MyPackage.Analyzers/MyPackage.Analyzers.csproj" 
                      ReferenceOutputAssembly="false" 
                      OutputItemType="Analyzer" />
  </ItemGroup>
</Project>
```

---

**Q1.3:** What naming convention for the dedicated package project?

**If we have multiple projects bundled into one package:**

```
src/
└── MyPackage/                      # Package group directory
    ├── MyPackage.Nuget/            # Meta-package project
    ├── MyPackage/                  # Runtime library
    └── MyPackage.Generators/       # Bundled component
```

**✅ CHOSEN: `.Nuget` suffix for meta-package project**

**Naming pattern:**
- Package group directory: `MyPackage/`
- Meta-package project: `MyPackage.Nuget/MyPackage.Nuget.csproj`
- Meta-package PackageId: `MyPackage` (no suffix in NuGet)
- Runtime library: `MyPackage/MyPackage.csproj` → produces `MyPackage.dll`

**Benefits:**
- Very explicit that `MyPackage.Nuget` is packaging infrastructure
- Runtime library gets clean name: `MyPackage.dll`
- Users install clean package: `<PackageReference Include="MyPackage" />`
- Solution explorer clearly shows meta-package vs. implementation

**Examples:**
- `Deepstaging.Nuget` → packages `Deepstaging` (includes `Deepstaging.Roslyn`, `Deepstaging.Generators`)
- `Deepstaging.Testing.Nuget` → packages `Deepstaging.Testing`
- `MyTool.Nuget` → packages `MyTool`

**Your preference:**

---

### 2. Package vs Project Relationship

**Q2.1:** How many NuGet packages per repository?

**Current Deepstaging example:**
- Repository: `deepstaging`
- Packages: `Deepstaging` (bundles Roslyn + Generators), `Deepstaging.Testing`

**Options:**
- [ ] One package per repo (simplest)
- [ ] One main package + optional extras (current approach)
- [x] Multiple packages, all equal importance
- [ ] Depends on the repo

**Your preference:**

---

**Q2.2:** Should every "feature" be a separate NuGet package?

**Example: Analyzers**
- [ ] Always separate package: `MyPackage.Analyzers`
- [x] Bundled in main package: `MyPackage` (includes analyzers)
- [ ] Depends on use case
- [ ] Both (bundle + separate for à la carte)

**Example: Generators**
- [ ] Always separate package: `MyPackage.Generators`
- [x] Bundled in main package: `MyPackage` (includes generators)
- [ ] Depends on use case
- [ ] Both (bundle + separate)

**Your preference:**

---

**Q2.3:** How should we mark projects as "packable" or "internal"?

```xml
<!-- Packable project -->
<PropertyGroup>
  <IsPackable>true</IsPackable>
  <PackageId>MyPackage</PackageId>
</PropertyGroup>

<!-- Internal project (bundled, not standalone) -->
<PropertyGroup>
  <IsPackable>false</IsPackable>
</PropertyGroup>
```

Should we:
- [x] Use `<IsPackable>` explicitly in every .csproj
- [ ] Default to false via Directory.Build.props, opt-in with `<IsPackable>true</IsPackable>`
- [ ] Use directory structure to infer (e.g., `src/packages/` = packable)
- [ ] Other approach: _______________

**Your preference:**

Use `<IsPackable>` explicitly in every .csproj
---

### 3. Directory Structure Details

**Q3.1:** Where should packable projects live?

**Option A: Flat src/ with IsPackable marker**
```
src/
├── MyPackage/              # IsPackable=true
├── MyPackage.Analyzers/    # IsPackable=true
├── MyPackage.Core/         # IsPackable=false (internal)
└── MyPackage.Utilities/    # IsPackable=false (internal)
```

**Option B: src/packages/ subdirectory**
```
src/
├── packages/               # All packable projects
│   ├── MyPackage/
│   └── MyPackage.Analyzers/
├── core/                   # Internal/shared code
│   ├── MyPackage.Core/
│   └── MyPackage.Utilities/
```

**Option C: Separate directories by type**
```
src/
├── packages/
│   └── MyPackage/
├── analyzers/
│   └── MyPackage.Analyzers/
├── generators/
│   └── MyPackage.Generators/
└── shared/
    └── MyPackage.Core/
```

**Your preference:**

I think this is answered already
---

**Q3.2:** Should we have a standard subdirectory for multi-project packages?

**If MyPackage bundles multiple projects, should they be grouped?**

**Option A: Grouped under package name**
```
src/
└── MyPackage/                  # Package directory
    ├── MyPackage/              # Package project (bundle)
    ├── MyPackage.Roslyn/       # Bundled component
    └── MyPackage.Generators/   # Bundled component
```

**Option B: Flat structure with naming convention**
```
src/
├── MyPackage/                  # Package project
├── MyPackage.Roslyn/           # Bundled component (sibling)
└── MyPackage.Generators/       # Bundled component (sibling)
```

**Your preference:**
**Option A: Grouped under package name**
---

### 4. Current Deepstaging Structure Analysis

**Q4.1:** How should we restructure Deepstaging specifically?

**Current:**
```
packages/
├── Deepstaging/
│   ├── Deepstaging/            # Bundle package
│   ├── Deepstaging.Roslyn/     # Component
│   ├── Deepstaging.Generators/ # Component
│   └── Deepstaging.Roslyn.Tests/
└── Deepstaging.Testing/
    └── Deepstaging.Testing/    # Separate package
```

**Proposed Option A: Flat src/ with package markers**
```
src/
├── Deepstaging/                # Bundle package (IsPackable=true)
├── Deepstaging.Roslyn/         # Bundled (IsPackable=false)
├── Deepstaging.Generators/     # Bundled (IsPackable=false)
└── Deepstaging.Testing/        # Separate package (IsPackable=true)
tests/
└── Deepstaging.Roslyn.Tests/
```

**Proposed Option B: Grouped packages**
```
src/
├── Deepstaging/                # Package group
│   ├── Deepstaging/            # Bundle package
│   ├── Deepstaging.Roslyn/     # Bundled
│   └── Deepstaging.Generators/ # Bundled
└── Deepstaging.Testing/        # Separate package
tests/
└── Deepstaging.Roslyn.Tests/
```

**Your preference:**

```
src/
├── Deepstaging/                # Package group
│   ├── Deepstaging.Nuget/            # Bundle package
│   ├── Deepstaging.Roslyn/     # Bundled
│   └── Deepstaging.Roslyn.Tests
│   └── Deepstaging.Generators/ # Bundled
└── Deepstaging.Testing/        # Separate package
```
---

**Q4.2:** Should Deepstaging.Testing be in the same repo?

- [x] Yes, it's part of the Deepstaging offering
- [ ] No, move to separate repo (deepstaging-testing)
- [ ] Keep for now, decide later

**Your preference:**

Yes, it's part of the Deepstaging offering

---

### 5. Effects Structure Analysis

**Q5.1:** How should Effects be structured?

**Current:**
```
Deepstaging.Effects/
├── Deepstaging.Effects/
├── Deepstaging.Effects.Analyzers/
├── Deepstaging.Effects.Generators/
├── Deepstaging.Effects.CodeFixes/
├── Deepstaging.Effects.Contracts/
├── Deepstaging.Effects.Queries/
└── Deepstaging.Effects.Tests/
```

**Question: How many NuGet packages should Effects produce?**

**Option A: Single bundle package**
```
Package: Deepstaging.Effects (includes everything)
```

**Option B: Main + optional components**
```
Packages:
- Deepstaging.Effects (main)
- Deepstaging.Effects.Analyzers (optional)
- Deepstaging.Effects.Generators (optional)
```

**Option C: Multiple independent packages**
```
Packages:
- Deepstaging.Effects.Core
- Deepstaging.Effects.Analyzers
- Deepstaging.Effects.Generators
- Deepstaging.Effects.CodeFixes
- Deepstaging.Effects.Contracts
- Deepstaging.Effects.Queries
```

**Your preference:**

Package: Deepstaging.Effects (includes everything)
---

**Q5.2:** Should Effects projects be grouped or flat?

Given your answer to Q5.1, should the directory structure be:

**Grouped:**
```
src/
└── Deepstaging.Effects/        # Package directory
    ├── Deepstaging.Effects/    # Package project
    ├── Analyzers/              # Component
    ├── Generators/             # Component
    └── CodeFixes/              # Component
```

**Flat:**
```
src/
├── Deepstaging.Effects/
├── Deepstaging.Effects.Analyzers/
├── Deepstaging.Effects.Generators/
└── Deepstaging.Effects.CodeFixes/
```

**Your preference:**

Grouped

---

### 6. Template Structure

**Q6.1:** What should the new-roslyn-project template generate?

**For a typical Roslyn project, should we generate:**

- [ ] Single bundle package (main + analyzers + generators bundled)
- [ ] Multiple packages (separate for each component)
- [x] Main package + option flags for components
- [ ] Minimal structure, user adds components as needed

**Your preference:**

Main package + option flags for components

---

**Q6.2:** Template project structure?

**What should `new-roslyn-project.sh MyTool` create?**

**Option A: Single package structure**
```
my-tool/
├── src/
│   ├── MyTool/                 # Main package (bundles everything)
│   ├── MyTool.Analyzers/       # Bundled component
│   └── MyTool.Generators/      # Bundled component
├── tests/
│   └── MyTool.Tests/
└── MyTool.sln
```

**Option B: Multi-package structure**
```
my-tool/
├── src/
│   ├── MyTool/                 # Core package
│   ├── MyTool.Analyzers/       # Separate package
│   └── MyTool.Generators/      # Separate package
├── tests/
│   └── MyTool.Tests/
└── MyTool.sln
```

**Option C: Minimal starting point**
```
my-tool/
├── src/
│   └── MyTool/                 # Just main project
├── tests/
│   └── MyTool.Tests/
└── MyTool.sln
```
*(User adds analyzers/generators later)*

**Your preference:**

my-tool/
├── src/
│   ├── MyTool/                 # Isolation
    │   ├── MyTool.Nuget/                 # Core package
    │   ├── MyTool.Analyzers/       # Bundled package
    │   └── MyTool.Generators/      # Bundled package
    │   └── MyTool.Tests/
└── MyTool.slnx

This allows us to add a new package to src/MyNewTool

---

**Q6.3:** Should template include package project scaffolding?

If using a dedicated package project, should the template generate:

```xml
<!-- MyTool/MyTool.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IsPackable>true</IsPackable>
    <PackageId>MyTool</PackageId>
  </PropertyGroup>
  
  <!-- Bundle these projects into this package -->
  <ItemGroup>
    <ProjectReference Include="../MyTool.Analyzers/MyTool.Analyzers.csproj" 
                      PrivateAssets="all" />
    <ProjectReference Include="../MyTool.Generators/MyTool.Generators.csproj" 
                      PrivateAssets="all" />
  </ItemGroup>
</Project>
```

- [ ] Yes, include this pattern in template
- [ ] No, keep it simple initially
- [ ] Make it optional via --bundle flag

**Your preference:**

Yes, include this pattern in template

---

### 7. Naming Conventions

**Q7.1:** Package ID vs Project Name

Should `<PackageId>` always match the project directory name?

```
Directory: src/Deepstaging/
Project: Deepstaging.csproj
PackageId: Deepstaging  ✓ (matches)
```

- [ ] Yes, always match for clarity
- [ ] No, allow them to differ
- [ ] Usually match, exceptions OK

**Your preference:**

Yes, always match for clarity

---

**Q7.2:** Roslyn component naming conventions?

For a package called `MyTool`, what should components be named?

**Analyzers:**
- [x] `MyTool.Analyzers`
- [ ] `MyTool.Analysis`
- [ ] `MyTool.CodeAnalysis`
- [ ] Other: _______________

**Generators:**
- [x] `MyTool.Generators`
- [ ] `MyTool.SourceGenerators`
- [ ] `MyTool.Generation`
- [ ] Other: _______________

**CodeFixes:**
- [x] `MyTool.CodeFixes`
- [ ] `MyTool.Fixes`
- [ ] `MyTool.Refactorings`
- [ ] Other: _______________

**Your preferences:**

answered

---

### 8. Build Configuration

**Q8.1:** How should Directory.Build.props handle IsPackable?

```xml
<!-- Option A: Default to false, opt-in -->
<PropertyGroup>
  <IsPackable>false</IsPackable>  <!-- Default for all projects -->
</PropertyGroup>
<!-- Projects set <IsPackable>true</IsPackable> to opt-in -->

<!-- Option B: Default to true, opt-out -->
<PropertyGroup>
  <IsPackable Condition="'$(IsPackable)' == ''">true</IsPackable>
</PropertyGroup>
<!-- Test projects set <IsPackable>false</IsPackable> -->

<!-- Option C: Infer from path -->
<PropertyGroup>
  <IsPackable Condition="$(MSBuildProjectDirectory.Contains('tests'))">false</IsPackable>
  <IsPackable Condition="!$(MSBuildProjectDirectory.Contains('tests'))">true</IsPackable>
</PropertyGroup>
```

**Your preference:**

Option A

---

**Q8.2:** Should we have a Directory.Build.targets for package projects?

Create a shared `Directory.Build.targets` that handles common package configuration?

```xml
<!-- Directory.Build.targets -->
<Project>
  <PropertyGroup Condition="'$(IsPackable)' == 'true'">
    <PackageReadmeFile>README.md</PackageReadmeFile>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
    <PackageProjectUrl>https://github.com/org/repo</PackageProjectUrl>
    <!-- etc -->
  </PropertyGroup>
</Project>
```

- [ ] Yes, centralize package metadata
- [ ] No, keep in individual projects
- [ ] Some centralized, some per-project

**Your preference:**

Yes, centralize package metadata

---

### 9. Documentation Structure

**Q9.1:** Where should package-specific READMEs live?

If `MyPackage.Analyzers` needs its own README for NuGet:

```
src/
└── MyPackage.Analyzers/
    ├── MyPackage.Analyzers.csproj
    └── README.md               # Package README
```

- [ ] Always alongside .csproj
- [ ] In docs/ with package name: `docs/packages/MyPackage.Analyzers.md`
- [ ] Both (docs/ for main docs, src/ for NuGet)
- [ ] Other: _______________

**Your preference:**
Always alongside .csproj

---

**Q9.2:** Should we have per-package documentation directories?

```
docs/
├── packages/
│   ├── MyPackage.md            # Main package docs
│   ├── MyPackage.Analyzers.md  # Analyzer package docs
│   └── MyPackage.Testing.md    # Testing package docs
├── guides/
└── api/
```

- [x] Yes, organized under docs/packages/
- [ ] No, flat docs/ directory
- [ ] Only for main packages, not components
- [ ] Other: _______________

**Your preference:**

Answered

---

### 10. Migration Strategy

**Q10.1:** Should we migrate existing repos to new structure immediately?

- [x] Yes, do it now (one big change)
- [ ] Deepstaging first, Effects later
- [ ] Effects first (simpler), Deepstaging later
- [ ] Wait until natural refactoring opportunity

**Your preference:**

Do it! Live large!

---

**Q10.2:** Should template changes be applied to existing repos?

Once we update the template, should we:
- [ ] Update existing repos to match
- [ ] Leave existing repos as-is
- [ ] Update selectively (case by case)

**Your preference:**

update existing repos to match

---

### 11. Script Updates

**Q11.1:** After structure standardization, should publish.sh:

- [ ] Assume standard structure (fail if non-standard)
- [ ] Still handle variations gracefully
- [ ] Support standard + legacy for transition period

**Your preference:**

Assume standard structure

---

**Q11.2:** Should we add a "validate structure" script?

A script that checks if a repo follows the convention:

```bash
./scripts/validate-structure.sh my-repo
# ✓ Solution at root
# ✓ src/ directory exists
# ✓ tests/ directory exists
# ✗ Package projects missing <PackageId>
```

- [ ] Yes, helpful for validation
- [ ] No, not necessary
- [ ] Maybe, decide later

**Your preference:**

Yes, helpful for validation

---

## Summary Questions

**Priority 1: Critical Decisions**
- Q1.1: How to organize multi-project packages?
- Q2.1: How many packages per repo?
- Q3.1: Where should packable projects live?
- Q6.2: What should template generate?

**Priority 2: Important Details**
- Q1.3: Naming convention for package projects?
- Q2.2: Separate packages for analyzers/generators?
- Q4.1: How to restructure Deepstaging?
- Q5.1: How many packages should Effects produce?

**Priority 3: Polish**
- Q7.2: Component naming conventions?
- Q8.1: IsPackable default behavior?
- Q9.1: Where should READMEs live?

---

## Next Steps After Answers

1. Document the finalized convention
2. Update template to generate new structure
3. Create migration plan for existing repos
4. Update scripts to match convention
5. Update all documentation

**Ready to answer? Start with Priority 1 questions!**
