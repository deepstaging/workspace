# Project Documentation for AI Assistants

**Last Updated:** 2026-01-04

## Repository Structure

This directory (`/Users/chris/code/org/deepstaging`) contains multiple independent Git repositories coordinated by a shared workspace:

### 1. `deepstaging/` - Core Roslyn Tooling
**Focus:** Infrastructure for building Roslyn source generators, analyzers, and code transformations

**Technology:** C# / .NET
- Core packages in .NET (netstandard2.0 for Roslyn components)
- Template system using Scriban

**Key Packages:**
- `Deepstaging` - Meta-package bundling Roslyn and Generators (primary distribution)
  - Contains `Deepstaging.Roslyn.dll` - Fluent query builders for Roslyn symbols
  - Contains `Deepstaging.Generators.dll` - Template-based source generation with Scriban
- `Deepstaging.Testing` - Testing framework for Roslyn tooling (not packaged - uses ProjectReference)
- `Deepstaging.Templates` - Project templates for creating new Roslyn projects

**Philosophy:** Query-first development approach - "Get the queries right, and everything else follows naturally"

**Important Locations:**
- `packages/Deepstaging/` - Meta-package containing:
  - `Deepstaging.Roslyn/` - Query infrastructure (source)
  - `Deepstaging.Generators/` - Template engine (source)
  - `Deepstaging/` - Combined NuGet package (packages both DLLs)
- `packages/Deepstaging.Testing/` - Testing infrastructure
- `packages/Deepstaging.Templates/` - Project templates
- `scripts/` - Build and utility scripts
- `samples/` - Example projects
- `docs-site/` - Documentation website

**Build Commands:**
```bash
cd deepstaging
dotnet build
dotnet test
```

**Publishing:**
- Uses local NuGet feed at `~/.nuget/local-feed`
- See `PUBLISHING.md` for details
- Script: `./scripts/publish-to-local-nuget.sh`

---

### 2. `workspace/` - Cross-Repository Utilities
**Focus:** Shared scripts and utilities for working across multiple Deepstaging repositories

**Purpose:**
- Create new Roslyn projects from templates
- Publish packages to local NuGet feeds
- Coordinate cross-repository development workflows

**Key Scripts:**
- `scripts/new-roslyn-project.sh` - Create new projects as siblings to workspace
- `scripts/publish-to-local-nuget.sh` - Build and publish Deepstaging packages

**Documentation:**
- `README.md` - Main documentation
- `docs/NEW_PROJECT_GUIDE.md` - Comprehensive project creation guide
- `docs/QUICK_REFERENCE.md` - Quick reference for scripts

---

### 3. `effects/` - Effects System
**Focus:** Effects system built on Deepstaging's Roslyn tooling

**Technology:** C# / .NET
- Extracted from main Deepstaging repository to maintain separation of concerns
- Depends on Deepstaging packages via NuGet

**Structure:**
- `Deepstaging.Effects/` - Main effects implementation
- `Deepstaging.Effects.Analyzers/` - Roslyn analyzers
- `Deepstaging.Effects.CodeFixes/` - Code fix providers
- `Deepstaging.Effects.Contracts/` - Public contracts and interfaces
- `Deepstaging.Effects.Generators/` - Source generators
- `Deepstaging.Effects.Queries/` - Query support
- `Deepstaging.Effects.Tests/` - Test suite

**Setup Scripts:**
- `./configure-nuget.sh` - Configure local NuGet feed
- `./convert-to-nuget-refs.sh` - Convert project refs to NuGet refs

**Build Commands:**
```bash
cd effects
dotnet build Deepstaging.Effects.slnx
dotnet test Deepstaging.Effects.slnx
```

**Dependencies:**
- Consumes Deepstaging packages from local NuGet feed
- `Deepstaging.Testing` uses ProjectReference (not packaged due to ModuleInitializer conflicts)

---

### 4. `github-profile/` - GitHub Profile Automation
**Focus:** Automated GitHub profile management using Deepstaging tooling

**Technology:** C# / .NET
- Uses Deepstaging packages via local NuGet feed
- Automation for profile README generation and management

**Dependencies:**
- Consumes Deepstaging packages from local NuGet feed

---

## Cross-Repository Workflow

### When working on Deepstaging core:
1. Make changes in `deepstaging/`
2. Build and test locally
3. Publish to local NuGet from workspace:
   ```bash
   cd ../workspace/scripts
   ./publish-to-local-nuget.sh
   ```
4. Update dependent repositories:
   ```bash
   cd ../../effects
   dotnet restore --force-evaluate && dotnet build
   
   cd ../github-profile
   dotnet restore --force-evaluate && dotnet build
   ```

### When working on dependent repositories (Effects, GitHub Profile):
1. Ensure latest Deepstaging packages are in local NuGet feed
2. Make changes in the specific repository
3. Build and test: `dotnet build && dotnet test`

### Creating new projects:
1. From workspace:
   ```bash
   cd workspace/scripts
   ./new-roslyn-project.sh MyNewProject
   ```
2. Project created as sibling: `../my-new-project/`
3. Automatically configured to use local NuGet feed

---

## Key Concepts

### Testing Pyramid (Query-First)
```
┌────────────────────────────────────────┐
│ Generator Tests (Integration)          │
├────────────────────────────────────────┤
│ CodeFix Tests (Transformations)        │
├────────────────────────────────────────┤
│ Analyzer Tests (Diagnostics)           │
├────────────────────────────────────────┤
│ Template Tests (Rendering)             │
├────────────────────────────────────────┤
│ Query Tests (FOUNDATION)               │ ← Start here
└────────────────────────────────────────┘
```

### Query-First Philosophy
1. Start with queries - Extract and project symbol data correctly
2. Test thoroughly - Fast, focused tests catch issues early
3. Build layers - Templates, analyzers, and fixes use proven queries
4. Fast feedback - Most testing at the fastest layer (milliseconds)

---

## Important Notes

### .NET Versions
- Roslyn components: netstandard2.0 (broad compatibility)
- Testing infrastructure: .NET 10.0+
- Microsoft.CodeAnalysis.CSharp: 4.11.0+

### Testing Caveat
- `Deepstaging.Testing` is NOT packaged due to ModuleInitializerAttribute conflicts with .NET 10 runtime
- Effects and other repositories use ProjectReference for test projects
- The main `Deepstaging` NuGet package contains only Roslyn and Generators DLLs

### User Preferences
Per `.copilot-instructions.md`: Documentation should be placed in `./.docs` directory (unless specifically requested elsewhere).

---

## Quick Reference

**Workspace Repository:**
- Purpose: Cross-repository coordination and utilities
- Location: `workspace/`
- Key Scripts: `scripts/new-roslyn-project.sh`, `scripts/publish-to-local-nuget.sh`
- Git: Independent repository

**Deepstaging Repository:**
- Purpose: Core Roslyn tooling infrastructure
- Location: `deepstaging/`
- Main README: `deepstaging/README.md`
- Publishing: Via `workspace/scripts/publish-to-local-nuget.sh`
- Git: Independent repository

**Effects Repository:**
- Purpose: Effects system using Deepstaging
- Location: `effects/`
- Main README: `effects/README.md`
- Setup: `effects/SETUP.md`
- Git: Independent repository

**GitHub Profile Repository:**
- Purpose: GitHub profile automation tools
- Location: `github-profile/`
- Git: Independent repository

**NuGet Feed:**
- Location: `~/.nuget/local-feed`
- Configured via: `effects/configure-nuget.sh` or automatically by publish script
- Publishing: `workspace/scripts/publish-to-local-nuget.sh`
