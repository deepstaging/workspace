# Package Registry

This file documents the packages in the Deepstaging ecosystem and their dependency relationships.

**Note:** This is auto-discoverable by the scripts, so this file is for human reference only.

## Core Packages

### Deepstaging
- **Repository:** `deepstaging/`
- **Solution:** `packages/Deepstaging.slnx`
- **Packages:**
  - `Deepstaging` (v0.1.0-preview) - Core Roslyn tooling bundle
  - `Deepstaging.Testing` (v0.1.0-preview) - Testing infrastructure
- **Dependencies:** None (foundation package)
- **Dependents:** Auto-discovered via `discover-dependents.sh`

## Feature Packages

### Deepstaging.Effects
- **Repository:** `effects/`
- **Solution:** `Deepstaging.Effects.slnx`
- **Packages:**
  - `Deepstaging.Effects` (planned)
  - `Deepstaging.Effects.Analyzers` (planned)
  - `Deepstaging.Effects.Generators` (planned)
- **Dependencies:** `Deepstaging`
- **Dependents:** (none yet)

## Auto-Discovery Commands

### Find what depends on a package
```bash
./scripts/discover-dependents.sh Deepstaging
./scripts/discover-dependents.sh Deepstaging.Effects
```

### Find what packages a repo publishes
```bash
cd workspace
grep -r "PackageId" ../deepstaging --include="*.csproj"
grep -r "PackageId" ../effects --include="*.csproj"
```

### List all packages in local feed
```bash
ls -lh ~/.nuget/local-feed/*.nupkg
```

## Publishing Workflow

### Quick Commands
```bash
# Publish any repo (auto-discovers everything)
./scripts/publish.sh deepstaging
./scripts/publish.sh effects --restore-deps

# Use specialized script for Deepstaging (handles Testing package specially)
./scripts/publish-to-local-nuget.sh --restore-deps

# Just discover dependents without restoring
./scripts/discover-dependents.sh Deepstaging
```

### What Gets Auto-Discovered

1. **Repository location** - By name in org directory
2. **Solution files** - Scans for `*.slnx` and `*.sln`
3. **Package names** - Extracts from `<PackageId>` in `.csproj` files
4. **Dependents** - Scans all repos for `<PackageReference Include="PackageName">`

### Adding a New Package

**No configuration needed!** Just:

1. Create your repository with standard .NET structure
2. Add `<PackageId>` to your `.csproj` files
3. Reference dependencies via `<PackageReference>`
4. Run: `./scripts/publish.sh your-repo-name --restore-deps`

The scripts will auto-discover everything.

## Dependency Graph

Current (as of 2026-01-04):

```
┌─────────────────────┐
│    Deepstaging      │  (foundation)
└──────────┬──────────┘
           │
           ↓ NuGet
┌─────────────────────┐
│ Deepstaging.Effects │  (feature layer)
└─────────────────────┘
```

Future example:

```
┌─────────────────────┐
│    Deepstaging      │
└──────────┬──────────┘
           │
           ↓ NuGet
┌─────────────────────┐
│ Deepstaging.Effects │
└──────────┬──────────┘
           │
           ↓ NuGet
┌─────────────────────┐
│   My New Feature    │
└─────────────────────┘
```

## Troubleshooting

### "No dependents found"
- Check if repos use `PackageReference` (not `ProjectReference`)
- Verify package name matches exactly (case-sensitive)
- Run: `grep -r "PackageReference" ../your-repo --include="*.csproj"`

### Package not found during restore
- Ensure it's published: `ls ~/.nuget/local-feed/YourPackage*.nupkg`
- Clear cache: `dotnet nuget locals all --clear`
- Re-publish: `./scripts/publish.sh repo-name`

### Discovery finds wrong repos
- Check that `<PackageReference>` matches actual package name
- Verify repo structure (must have `.git` directory)

---

**Remember:** This registry is documentation only. The scripts auto-discover all relationships!
