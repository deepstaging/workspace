# Local NuGet Package Development Pattern

## Overview

This workspace uses a **local NuGet feed pattern** for managing dependencies between repositories. When a core package (like Deepstaging or Effects) stabilizes, we publish it to a local NuGet feed and consume it as a standard NuGet package in dependent repositories.

## Why This Pattern?

### Benefits
- ✅ **Simple** - One workflow, no conditional complexity
- ✅ **Fast** - 2-3 seconds to publish changes locally
- ✅ **Real-world testing** - Consuming exactly what users will consume
- ✅ **Template-ready** - Templates work without special setup
- ✅ **Scalable** - Easy to add new packages in the dependency chain

### When to Use
- Core package is **stable** (changes are infrequent)
- You're building **on top of** a stable package
- You want **clean separation** between layers

## Local NuGet Feed Location

```
~/.nuget/local-feed/
```

This is configured once and shared across all projects.

## Quick Start

### Publishing Deepstaging (Core Package)

```bash
cd workspace

# Just publish
./scripts/publish-to-local-nuget.sh

# Publish and restore all dependent repos
./scripts/publish-to-local-nuget.sh --restore-deps
```

### Using the Generic Script

```bash
cd workspace

# Publish any package
./scripts/publish-package.sh deepstaging
./scripts/publish-package.sh effects
./scripts/publish-package.sh my-new-feature

# With automatic restore of dependents
./scripts/publish-package.sh deepstaging --restore-deps
./scripts/publish-package.sh effects --restore-deps
```

## Dependency Chain Example

```
┌─────────────────┐
│   Deepstaging   │  ← Stable core (rarely changes)
└────────┬────────┘
         │
         ↓ NuGet
┌─────────────────┐
│     Effects     │  ← Built on Deepstaging
└────────┬────────┘
         │
         ↓ NuGet
┌─────────────────┐
│  My New Feature │  ← Built on Effects
└─────────────────┘
```

### Workflow for New Feature on Effects

1. **Effects is stable** - Changes are rare, published to local NuGet
2. **Create new repo** - `my-new-feature/`
3. **Reference Effects via NuGet** - Standard PackageReference
4. **Configure publish script** - Add `my-new-feature` to `publish-package.sh`

```bash
# Edit publish-package.sh to add:
my-new-feature)
    REPO_DIR="$ORG_DIR/my-new-feature"
    SOLUTION_FILE="$REPO_DIR/MyNewFeature.slnx"
    DEPENDENT_REPOS=()  # Add any repos that depend on this
    ;;
```

5. **When Effects changes** (rare):
```bash
cd workspace
./scripts/publish-package.sh effects --restore-deps
cd ../my-new-feature
dotnet build  # Now uses updated Effects
```

## Adding a New Package to the Chain

### 1. Create the Repository Structure

```bash
cd /Users/chris/code/org/deepstaging
mkdir my-new-feature
cd my-new-feature
# Set up your .NET projects
```

### 2. Reference Parent via NuGet

In `Directory.Packages.props`:
```xml
<ItemGroup>
  <PackageVersion Include="Deepstaging.Effects" Version="0.1.0-preview" />
</ItemGroup>
```

In your project:
```xml
<ItemGroup>
  <PackageReference Include="Deepstaging.Effects" />
</ItemGroup>
```

### 3. Configure Local NuGet Feed

```bash
# If not already configured
dotnet nuget add source ~/.nuget/local-feed --name LocalFeed
```

### 4. Add to publish-package.sh

Edit `workspace/scripts/publish-package.sh`:

```bash
my-new-feature)
    REPO_DIR="$ORG_DIR/my-new-feature"
    SOLUTION_FILE="$REPO_DIR/MyNewFeature.slnx"
    DEPENDENT_REPOS=(
        # Add any repos that will depend on this package
        # "$ORG_DIR/another-feature"
    )
    ;;
```

### 5. Update Parent's DEPENDENT_REPOS

If building on Effects, update the `effects)` case to include your repo:

```bash
effects)
    REPO_DIR="$ORG_DIR/effects"
    SOLUTION_FILE="$REPO_DIR/Deepstaging.Effects.slnx"
    DEPENDENT_REPOS=(
        "$ORG_DIR/my-new-feature"  # Add this
    )
    ;;
```

### 6. Build and Publish

```bash
cd workspace

# Publish your new package
./scripts/publish-package.sh my-new-feature

# When effects changes, restore your package automatically
./scripts/publish-package.sh effects --restore-deps
```

## Typical Workflows

### Daily Development (No Changes to Dependencies)

```bash
cd my-project
dotnet build
dotnet test
# Normal development, no NuGet operations needed
```

### Dependency Updated (Rare)

```bash
# Maintainer publishes the update
cd workspace
./scripts/publish-package.sh effects --restore-deps

# Your repo is automatically restored with new version
cd ../my-new-feature
dotnet build  # Uses updated Effects
```

### You're Updating a Package Others Depend On

```bash
cd effects
# Make your changes
dotnet build
dotnet test

# Publish to local feed and restore dependents
cd ../workspace
./scripts/publish-package.sh effects --restore-deps
```

## Performance

- **Build:** ~2.4 seconds
- **Pack to local feed:** ~0.8 seconds
- **Restore per dependent:** ~1-2 seconds
- **Total overhead:** ~3-5 seconds for full workflow

**Negligible compared to mental overhead of project reference complexity.**

## Best Practices

### 1. Stabilize Before Publishing
- Get the package working
- Test thoroughly
- Then commit to the local NuGet pattern

### 2. Version Consistently
- Use preview versions for unstable packages: `0.1.0-preview`
- Bump versions when making breaking changes
- Keep all related packages on same version

### 3. Document Dependencies
- Keep this README updated
- Note which repos depend on which packages
- Update publish-package.sh when adding repos

### 4. Script Everything
- Don't manually run build/pack/restore sequences
- Use the provided scripts
- Add new packages to scripts when created

### 5. Communicate Changes
- If you update a stable package, notify dependent repo owners
- Consider Slack/email: "Effects 0.2.0-preview published, please restore"

## Troubleshooting

### "Package not found" Error

```bash
# Ensure package is published
cd workspace
./scripts/publish-package.sh effects

# Clear NuGet cache and restore
cd ../my-project
dotnet nuget locals all --clear
dotnet restore --force-evaluate
```

### Version Mismatch

Check `Directory.Packages.props` in both publisher and consumer:
- Publisher: `packages/build/props/versioning.props`
- Consumer: `Directory.Packages.props`

Ensure versions match.

### Local Feed Not Configured

```bash
dotnet nuget add source ~/.nuget/local-feed --name LocalFeed
dotnet nuget list source  # Verify it's added
```

### Stale Cache

```bash
dotnet nuget locals all --clear
dotnet restore --force-evaluate
dotnet build --no-restore
```

## Migration Notes

### From Project References to NuGet

If you have an existing repo using project references:

1. **Publish the dependency** to local NuGet
2. **Update Directory.Packages.props** with correct version
3. **Change ProjectReference to PackageReference** in `.csproj` files
4. **Restore and build:**
```bash
dotnet restore --force-evaluate
dotnet build
```

### From NuGet Back to Project References

Only do this if actively developing the dependency alongside:

1. Add project as Git submodule or adjacent clone
2. Change PackageReference to ProjectReference
3. Update solution file to include dependency projects

**Note:** This is rarely needed. The local NuGet pattern is sufficient for 95% of cases.

## Future Enhancements

### Possible Additions
- [ ] Auto-versioning based on git tags
- [ ] CI/CD integration for automated publishing
- [ ] Dependency graph visualization
- [ ] Health check script (verify all deps are latest)

### Package Roadmap
- [x] Deepstaging (core Roslyn tooling)
- [x] Deepstaging.Effects (effects system)
- [ ] Your next feature here...

---

**Key Takeaway:** Local NuGet is simple, fast, and scales. Use it for stable packages, script everything, and enjoy clean separation between layers.
