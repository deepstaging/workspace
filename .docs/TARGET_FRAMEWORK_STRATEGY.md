# Target Framework Strategy

## Framework Selection

### Meta-packages (.Nuget projects)
**TargetFramework:** `netstandard2.0`

**Rationale:**
- Meta-packages contain no code, just metadata
- Broad compatibility with older .NET Framework and .NET Core
- Package consumers can target any framework

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <IncludeBuildOutput>false</IncludeBuildOutput>
  </PropertyGroup>
</Project>
```

---

### Runtime Libraries
**TargetFramework:** `net10.0`

**Rationale:**
- Access to latest .NET features
- Modern C# language features
- Best performance
- Pattern matching, records, required members, etc.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
</Project>
```

**Examples:**
- `MyPackage/MyPackage.csproj` (runtime core logic)

---

### Queries
**TargetFramework:** `netstandard2.0`

**Rationale:**
- Queries work with Roslyn symbol APIs
- Often consumed by analyzers and generators
- Need compatibility with netstandard2.0 Roslyn components
- Shared between runtime and tooling

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
</Project>
```

**Examples:**
- `MyPackage.Queries/MyPackage.Queries.csproj`

---

### Contracts
**TargetFramework:** `netstandard2.0`

**Rationale:**
- Contracts are public interfaces consumed by users
- Broad compatibility across different .NET versions
- Users may target older frameworks
- No need for latest language features in interface definitions

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
</Project>
```

**Examples:**
- `MyPackage.Contracts/MyPackage.Contracts.csproj`

---

### Roslyn Components (Analyzers/Generators)
**TargetFramework:** `netstandard2.0`

**Rationale:**
- Roslyn analyzers and generators run in the compiler
- Must target `netstandard2.0` for compatibility
- Required by Roslyn SDK

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <EnforceExtendedAnalyzerRules>true</EnforceExtendedAnalyzerRules>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="4.11.0" />
  </ItemGroup>
</Project>
```

**Examples:**
- `MyPackage.Analyzers/MyPackage.Analyzers.csproj`
- `MyPackage.Generators/MyPackage.Generators.csproj`
- `MyPackage.CodeFixes/MyPackage.CodeFixes.csproj`

---

### Test Projects
**TargetFramework:** `net10.0`

**Rationale:**
- Tests run in test host, not compiler
- Can use latest .NET features
- Better testing APIs (TUnit, Verify, etc.)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="TUnit" />
  </ItemGroup>
</Project>
```

---

## Summary Table

| Project Type | Target Framework | Why |
|--------------|------------------|-----|
| Meta-package (`.Nuget`) | `netstandard2.0` | No code, broad compatibility |
| Runtime libraries | `net10.0` | Modern features, performance |
| Queries | `netstandard2.0` | Used by Roslyn components |
| Contracts | `netstandard2.0` | Public APIs, broad compatibility |
| Analyzers | `netstandard2.0` | Roslyn requirement |
| Generators | `netstandard2.0` | Roslyn requirement |
| CodeFixes | `netstandard2.0` | Roslyn requirement |
| Tests | `net10.0` | Latest testing features |
| Samples | `net10.0` | Demonstrate modern usage |

---

## Complete Example

```
src/MyPackage/
├── MyPackage.Nuget/
│   └── MyPackage.Nuget.csproj          # netstandard2.0 (meta-package)
├── MyPackage/
│   └── MyPackage.csproj                # net10.0 (runtime)
├── MyPackage.Tests/
│   └── MyPackage.Tests.csproj          # net10.0 (tests)
├── MyPackage.Queries/
│   └── MyPackage.Queries.csproj        # netstandard2.0 (used by Roslyn)
├── MyPackage.Contracts/
│   └── MyPackage.Contracts.csproj      # netstandard2.0 (public APIs)
├── MyPackage.Generators/
│   └── MyPackage.Generators.csproj     # netstandard2.0 (Roslyn)
├── MyPackage.Generators.Tests/
│   └── MyPackage.Generators.Tests.csproj  # net10.0 (tests)
├── MyPackage.Analyzers/
│   └── MyPackage.Analyzers.csproj      # netstandard2.0 (Roslyn)
└── MyPackage.Analyzers.Tests/
    └── MyPackage.Analyzers.Tests.csproj   # net10.0 (tests)
```

---

## Migration Notes

### Deepstaging Current State
- Most projects already use appropriate targets
- Analyzers/Generators: `netstandard2.0` ✓
- Tests: May need update to `net10.0`

### Effects Current State
- Check and update as needed during restructure

---

## Future: Multi-targeting

If we ever need broader compatibility for runtime libraries:

```xml
<PropertyGroup>
  <TargetFrameworks>net10.0;net8.0;net6.0</TargetFrameworks>
</PropertyGroup>
```

**Current decision:** Single target (`net10.0`) is sufficient. We're building modern tooling.
