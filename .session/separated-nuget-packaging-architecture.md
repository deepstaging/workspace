# Separated NuGet Packaging Architecture

**Date:** 2026-01-04  
**Status:** Corrected Design Proposal  
**Supersedes:** multi-package-build-strategy.md (sections on naming)

## The Problem with Current Architecture

Currently, `MyRoslynTool.Generators` does **TWO jobs**:

### Job 1: Source Generator (Code)
```csharp
// MyRoslynTool.Generators/EmailValidationGenerator.cs
[Generator]
public class EmailValidationGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context) 
    {
        // Actual generator logic
    }
}
```

### Job 2: Meta-Packaging (Build Config)
```xml
<!-- MyRoslynTool.Generators/MyRoslynTool.Generators.csproj -->
<PropertyGroup>
  <IsPackable>true</IsPackable>
  <IncludeBuildOutput>false</IncludeBuildOutput>
  <PackageId>MyRoslynTool</PackageId>
</PropertyGroup>

<!-- Bundle everything into one package -->
<ItemGroup>
  <None Include="$(OutputPath)$(AssemblyName).dll" Pack="true" />
  <None Include="../MyRoslynTool.Analyzers/$(OutputPath)..." Pack="true" />
  <None Include="../MyRoslynTool.CodeFixes/$(OutputPath)..." Pack="true" />
  <None Include="../MyRoslynTool.Contracts/$(OutputPath)..." Pack="true" />
  <None Include="../MyRoslynTool/bin/..." Pack="true" />
</ItemGroup>
```

**Problem:** Mixing concerns violates single responsibility principle.

## Proposed Solution: Separate Projects

### New Structure

```
packages/
└── MyRoslynTool/
    ├── MyRoslynTool.NugetPackage/         # 🎯 PACKAGING ONLY (no code!)
    │   └── MyRoslynTool.NugetPackage.csproj
    ├── MyRoslynTool.Generators/           # ✨ GENERATOR ONLY (just code!)
    │   ├── EmailValidationGenerator.cs
    │   ├── Templates/
    │   └── MyRoslynTool.Generators.csproj
    ├── MyRoslynTool.Analyzers/
    ├── MyRoslynTool.CodeFixes/
    ├── MyRoslynTool.Contracts/
    ├── MyRoslynTool.Queries/
    ├── MyRoslynTool/
    └── MyRoslynTool.Tests/
```

### MyRoslynTool.Generators (Clean!)

**Just generator code - no packaging concerns:**

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IsPackable>false</IsPackable>              <!-- NOT packable! -->
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <RootNamespace>MyRoslynTool.Generators</RootNamespace>
  </PropertyGroup>

  <!-- Just the dependencies needed for generator code -->
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" />
    <PackageReference Include="Deepstaging.Generators" />
    <ProjectReference Include="..\MyRoslynTool.Queries\MyRoslynTool.Queries.csproj" />
    <ProjectReference Include="..\MyRoslynTool.Contracts\MyRoslynTool.Contracts.csproj" />
  </ItemGroup>

  <!-- Template files -->
  <ItemGroup>
    <EmbeddedResource Include="Templates\**\*.scriban-cs" />
  </ItemGroup>

</Project>
```

### MyRoslynTool.NugetPackage (Dedicated!)

**Just packaging - no actual code:**

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IsPackable>true</IsPackable>
    <IncludeBuildOutput>false</IncludeBuildOutput>  <!-- Don't include this project's output -->
    <DevelopmentDependency>true</DevelopmentDependency>
    <NoWarn>$(NoWarn);NU5128</NoWarn>
    
    <!-- Package metadata -->
    <PackageId>MyRoslynTool</PackageId>
    <Title>MyRoslynTool</Title>
    <Description>Source generator, analyzer, and code fixes for MyRoslynTool.</Description>
    <PackageTags>roslyn;source-generator;analyzers;validation</PackageTags>
    <PackageReadmeFile>README.md</PackageReadmeFile>
    <PackageLicenseFile>LICENSE</PackageLicenseFile>
  </PropertyGroup>

  <!-- Include README and icon in package -->
  <ItemGroup>
    <None Include="../README.md" Pack="true" PackagePath="\" />
    <None Include="../icon.png" Pack="true" PackagePath="\" Condition="Exists('../icon.png')" />
    <None Include="../LICENSE" Pack="true" PackagePath="\" />
  </ItemGroup>

  <!-- Include build props for automatic template embedding -->
  <ItemGroup>
    <None Include="build/MyRoslynTool.props" Pack="true" PackagePath="build" />
  </ItemGroup>

  <!-- Reference all projects that need to be built (but not packed from this project) -->
  <ItemGroup>
    <ProjectReference Include="..\MyRoslynTool.Generators\MyRoslynTool.Generators.csproj" 
                      PrivateAssets="all" 
                      ReferenceOutputAssembly="false" />
    <ProjectReference Include="..\MyRoslynTool.Analyzers\MyRoslynTool.Analyzers.csproj" 
                      PrivateAssets="all" 
                      ReferenceOutputAssembly="false" />
    <ProjectReference Include="..\MyRoslynTool.CodeFixes\MyRoslynTool.CodeFixes.csproj" 
                      PrivateAssets="all" 
                      ReferenceOutputAssembly="false" />
    <ProjectReference Include="..\MyRoslynTool.Contracts\MyRoslynTool.Contracts.csproj" 
                      PrivateAssets="all" />
    <ProjectReference Include="..\MyRoslynTool\MyRoslynTool.csproj" 
                      PrivateAssets="all" 
                      ReferenceOutputAssembly="false" />
  </ItemGroup>

  <!-- Bundle all assemblies into the NuGet package -->
  <ItemGroup>
    <!-- Generators (runs at compile time) -->
    <None Include="../MyRoslynTool.Generators/$(OutputPath)MyRoslynTool.Generators.dll"
          Pack="true"
          PackagePath="analyzers/dotnet/cs"
          Visible="false" />

    <!-- Analyzers (runs at compile time) -->
    <None Include="../MyRoslynTool.Analyzers/$(OutputPath)MyRoslynTool.Analyzers.dll"
          Pack="true"
          PackagePath="analyzers/dotnet/cs"
          Visible="false" />

    <!-- CodeFixes (runs at compile time) -->
    <None Include="../MyRoslynTool.CodeFixes/$(OutputPath)MyRoslynTool.CodeFixes.dll"
          Pack="true"
          PackagePath="analyzers/dotnet/cs"
          Visible="false"
          Condition="Exists('../MyRoslynTool.CodeFixes/$(OutputPath)MyRoslynTool.CodeFixes.dll')" />

    <!-- Contracts - Attributes (available to consumer at compile time & runtime) -->
    <None Include="../MyRoslynTool.Contracts/$(OutputPath)MyRoslynTool.Contracts.dll"
          Pack="true"
          PackagePath="lib/netstandard2.0"
          Visible="false" />
    
    <None Include="../MyRoslynTool.Contracts/$(OutputPath)MyRoslynTool.Contracts.dll"
          Pack="true"
          PackagePath="lib/net10.0"
          Visible="false" />

    <!-- Contracts - Also needed by generator at compile time -->
    <None Include="../MyRoslynTool.Contracts/$(OutputPath)MyRoslynTool.Contracts.dll"
          Pack="true"
          PackagePath="analyzers/dotnet/cs"
          Visible="false" />

    <!-- Runtime library (available to consumer at runtime) -->
    <None Include="../MyRoslynTool/bin/$(Configuration)/net10.0/MyRoslynTool.dll"
          Pack="true"
          PackagePath="lib/net10.0"
          Visible="false" />
  </ItemGroup>

</Project>
```

**This project has NO .cs files!** It's purely for packaging.

### MyRoslynTool.NugetPackage/build/MyRoslynTool.props

```xml
<Project>
  <!-- This file is automatically imported when the package is referenced -->
  <!-- Can be used for MSBuild customizations, additional analyzers, etc. -->
</Project>
```

## Benefits of Separation

### 1. Single Responsibility ✅

**Before:**
- `MyRoslynTool.Generators` = Generator code + packaging config (2 jobs!)

**After:**
- `MyRoslynTool.Generators` = Generator code only
- `MyRoslynTool.NugetPackage` = Packaging only

### 2. Clearer Intent ✅

```bash
# Q: Which project produces the NuGet package?
# A: The one literally named "NugetPackage"!

# Q: Where's the generator code?
# A: In the "Generators" project!
```

### 3. Easier to Test ✅

```bash
# Build just generators (fast feedback)
dotnet build MyRoslynTool.Generators/MyRoslynTool.Generators.csproj

# Test just generators
dotnet test MyRoslynTool.Tests/MyRoslynTool.Tests.csproj

# Package everything (when ready)
dotnet pack MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj
```

### 4. Independent Evolution ✅

- Change packaging strategy without touching generator code
- Add/remove projects from package without modifying generators
- Different versioning strategies possible

### 5. Better Organization ✅

```
MyRoslynTool.Generators/
├── EmailValidationGenerator.cs       # Source generator
├── PhoneValidationGenerator.cs       # Another generator
├── Templates/                         # Scriban templates
│   ├── EmailValidator.scriban-cs
│   └── PhoneValidator.scriban-cs
└── MyRoslynTool.Generators.csproj    # Simple project file

MyRoslynTool.NugetPackage/
├── build/
│   └── MyRoslynTool.props            # MSBuild customizations
└── MyRoslynTool.NugetPackage.csproj  # Packaging configuration
```

## Project Dependency Graph

```
MyRoslynTool.NugetPackage (packages everything)
  ├─→ MyRoslynTool.Generators (source generators)
  │     ├─→ MyRoslynTool.Queries (query helpers)
  │     └─→ MyRoslynTool.Contracts (attributes)
  ├─→ MyRoslynTool.Analyzers (diagnostics)
  │     └─→ MyRoslynTool.Queries
  ├─→ MyRoslynTool.CodeFixes (code fixes)
  │     └─→ MyRoslynTool.Analyzers
  ├─→ MyRoslynTool.Contracts (attributes/interfaces)
  └─→ MyRoslynTool (runtime library)
        └─→ MyRoslynTool.Contracts

MyRoslynTool.Tests
  └─→ MyRoslynTool.Generators (test the generators)
```

**Key:** `MyRoslynTool.NugetPackage` references everything but isn't referenced by anything.

## Migration from Current Template

### What Needs to Change

1. **Create `MyRoslynTool.NugetPackage` project:**
   - Move packaging config from `MyRoslynTool.Generators.csproj`
   - Keep generator code in `MyRoslynTool.Generators`

2. **Clean up `MyRoslynTool.Generators.csproj`:**
   - Remove `<IsPackable>true</IsPackable>`
   - Remove all `<None Include="..." Pack="true">` items
   - Keep only generator-related dependencies

3. **Update solution file:**
   ```xml
   <Solution>
     <Project Path="MyRoslynTool/MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj" />
     <Project Path="MyRoslynTool/MyRoslynTool.Generators/MyRoslynTool.Generators.csproj" />
     <!-- ... other projects ... -->
   </Solution>
   ```

4. **Update pack scripts:**
   ```bash
   # OLD:
   dotnet pack MyRoslynTool.Generators/MyRoslynTool.Generators.csproj
   
   # NEW:
   dotnet pack MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj
   ```

## Template Structure (Final)

```
deepstaging-roslyn/
├── .template.config/
│   └── template.json
├── packages/
│   └── MyRoslynTool/                          # 📦 Package folder
│       ├── MyRoslynTool.NugetPackage/         # 🎯 Packaging project (no code!)
│       │   ├── build/
│       │   │   └── MyRoslynTool.props
│       │   └── MyRoslynTool.NugetPackage.csproj
│       ├── MyRoslynTool.Generators/           # ✨ Generator project (code only!)
│       │   ├── EmailValidationGenerator.cs
│       │   ├── Templates/
│       │   │   └── EmailValidator.scriban-cs
│       │   └── MyRoslynTool.Generators.csproj
│       ├── MyRoslynTool.Analyzers/
│       ├── MyRoslynTool.CodeFixes/
│       ├── MyRoslynTool.Contracts/
│       ├── MyRoslynTool.Queries/
│       ├── MyRoslynTool/
│       ├── MyRoslynTool.Tests/
│       ├── MyRoslynTool.Sample/
│       ├── pack.sh                            # Packs MyRoslynTool.NugetPackage
│       ├── README.md
│       └── LICENSE
├── scripts/
│   ├── pack-all.sh                            # Discovers *.NugetPackage projects
│   ├── pack-package.sh <name>
│   ├── new-package.sh
│   └── new-project.sh
├── MyRoslynTool.slnx
├── Directory.Build.props
└── Directory.Packages.props
```

## Pack Script Updates

### `packages/MyRoslynTool/pack.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGE_NAME=$(basename "$SCRIPT_DIR")

echo "🔨 Building $PACKAGE_NAME..."
dotnet build "$REPO_ROOT/$PACKAGE_NAME.slnx" --configuration Release

echo "📦 Packing $PACKAGE_NAME..."
dotnet pack "$SCRIPT_DIR/$PACKAGE_NAME.NugetPackage/$PACKAGE_NAME.NugetPackage.csproj" \
  --configuration Release \
  --no-build \
  --output "$REPO_ROOT/artifacts"

echo "✅ Package: artifacts/$PACKAGE_NAME.*.nupkg"
```

### `scripts/pack-all.sh`

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
  # packages/MyRoslynTool/MyRoslynTool.NugetPackage/MyRoslynTool.NugetPackage.csproj
  # → MyRoslynTool
  package_dir=$(dirname "$(dirname "$csproj")")
  package_name=$(basename "$package_dir")
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Packing: $package_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  cd "$package_dir"
  ./pack.sh
  echo ""
done

echo "✅ All packages packed!"
ls -lh "$REPO_ROOT/artifacts"/*.nupkg
```

## Real-World Example: Effects Repository

After this change, Effects would look like:

```
effects/
└── Deepstaging.Effects/
    ├── Deepstaging.Effects.NugetPackage/      # Packaging (no code)
    ├── Deepstaging.Effects.Generators/        # Generator code
    ├── Deepstaging.Effects.Analyzers/
    ├── Deepstaging.Effects.CodeFixes/
    ├── Deepstaging.Effects.Contracts/
    ├── Deepstaging.Effects.Queries/
    ├── Deepstaging.Effects/
    └── Deepstaging.Effects.Tests/
```

**To pack:**
```bash
cd effects
dotnet pack Deepstaging.Effects/Deepstaging.Effects.NugetPackage/Deepstaging.Effects.NugetPackage.csproj -c Release
```

## Implementation Checklist

- [ ] Create `MyRoslynTool.NugetPackage` project in template
- [ ] Move packaging config from `.Generators.csproj` to `.NugetPackage.csproj`
- [ ] Set `<IsPackable>false</IsPackable>` in `.Generators.csproj`
- [ ] Remove `<None Pack="true">` items from `.Generators.csproj`
- [ ] Create `build/MyRoslynTool.props` in `.NugetPackage/`
- [ ] Update solution file to include `.NugetPackage` project
- [ ] Update `pack.sh` to pack `.NugetPackage` instead of `.Generators`
- [ ] Update `scripts/pack-all.sh` to discover `*.NugetPackage.csproj`
- [ ] Update documentation
- [ ] Test standalone: `dotnet new deepstaging-roslyn -n Test && cd Test && ./packages/Test/pack.sh`
- [ ] Test monorepo: `./scripts/new-package.sh TestPackage`

## Summary

**The Key Change:**
- `MyRoslynTool.Generators` = Source generator code (just C# files)
- `MyRoslynTool.NugetPackage` = Packaging configuration (no C# files, just csproj + build props)

**Benefits:**
- ✅ Single responsibility per project
- ✅ Clear separation of concerns
- ✅ Easier to understand and maintain
- ✅ Better testability
- ✅ Flexible packaging strategies
- ✅ Convention-based discovery (`*.NugetPackage.csproj`)

This is the correct architecture for professional, maintainable Roslyn tooling.
