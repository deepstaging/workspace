# Getting Started - Auto-Discovery Publishing

This guide shows you how to use the new auto-discovery publishing system.

## First Time Setup

### 1. Ensure Local NuGet Feed Exists

The publish scripts will do this automatically, but you can verify:

```bash
ls ~/.nuget/local-feed/
```

If it doesn't exist, the scripts will create it on first run.

### 2. Verify NuGet Source Configuration

```bash
dotnet nuget list source
```

Should show `LocalFeed` pointing to `~/.nuget/local-feed`. If not, the scripts will add it automatically.

## Daily Usage

### Publishing a Package

```bash
cd workspace

# Publish Deepstaging core (most common)
./scripts/publish.sh deepstaging --restore-deps

# Publish any other package
./scripts/publish.sh effects --restore-deps
./scripts/publish.sh my-feature --restore-deps
```

The `--restore-deps` flag automatically restores all dependent repositories.

### Checking Dependencies

```bash
# Who depends on Deepstaging?
./scripts/discover-dependents.sh Deepstaging

# Who depends on Effects?
./scripts/discover-dependents.sh Deepstaging.Effects

# Who uses the Testing infrastructure?
./scripts/discover-dependents.sh Deepstaging.Testing
```

### Manual Restore (if needed)

```bash
cd ../your-repo
dotnet restore --force-evaluate
dotnet build
```

## Common Workflows

### Workflow 1: Update Core Package (Rare)

When Deepstaging core changes:

```bash
cd deepstaging
# Make your changes
dotnet build
dotnet test

# Publish and update all dependents
cd ../workspace
./scripts/publish.sh deepstaging --restore-deps

# Test in dependent repo
cd ../effects
dotnet build
dotnet test
```

**Time:** ~5-10 seconds for full workflow

### Workflow 2: Create New Package on Top of Effects

```bash
# 1. Create your repository
cd /Users/chris/code/org/deepstaging
mkdir my-awesome-feature
cd my-awesome-feature

# 2. Initialize with .NET projects
dotnet new sln -n MyAwesomeFeature
dotnet new classlib -n MyAwesomeFeature
dotnet sln add MyAwesomeFeature/MyAwesomeFeature.csproj

# 3. Add package metadata
# Edit MyAwesomeFeature/MyAwesomeFeature.csproj:
#   <PropertyGroup>
#     <PackageId>MyAwesomeFeature</PackageId>
#   </PropertyGroup>

# 4. Reference dependencies
# Add to Directory.Packages.props:
#   <PackageVersion Include="Deepstaging.Effects" Version="0.1.0-preview" />
# Add to .csproj:
#   <PackageReference Include="Deepstaging.Effects" />

# 5. Build and test locally
dotnet restore
dotnet build

# 6. Publish when ready
cd ../workspace
./scripts/publish.sh my-awesome-feature

# 7. Others can now depend on it!
```

**No configuration needed!** The scripts auto-discover everything.

### Workflow 3: Daily Development (No Package Changes)

```bash
cd your-repo
# Normal development
dotnet build
dotnet test
git commit -am "Made changes"

# No publishing needed unless you're the package provider
```

## Troubleshooting

### Problem: Package version mismatch

```bash
# Check what's published
ls -lh ~/.nuget/local-feed/Deepstaging*.nupkg

# Check what your repo expects
cat Directory.Packages.props | grep Deepstaging

# Clear cache and restore
dotnet nuget locals all --clear
dotnet restore --force-evaluate
```

### Problem: Changes not reflecting

```bash
# Re-publish the package
cd workspace
./scripts/publish.sh package-name

# Force restore in your repo
cd ../your-repo
dotnet restore --force-evaluate
dotnet build --no-restore
```

### Problem: Discovery finds wrong repos

```bash
# Check what you're referencing
grep -r "PackageReference" . --include="*.csproj"

# Verify package names match exactly
./scripts/discover-dependents.sh YourPackageName
```

### Problem: Build fails in publish script

```bash
# Test building directly first
cd ../your-repo
dotnet build

# If that works, check solution file
ls *.slnx *.sln

# If multiple solutions exist, the script uses the first one found
```

## Tips & Tricks

### See all packages in local feed

```bash
ls -lht ~/.nuget/local-feed/*.nupkg | head -20
```

### Clear entire local feed (nuclear option)

```bash
rm ~/.nuget/local-feed/*.nupkg
dotnet nuget locals all --clear

# Then re-publish what you need
cd workspace
./scripts/publish.sh deepstaging
```

### Check dependency graph visually

```bash
# See all Deepstaging dependents
./scripts/discover-dependents.sh Deepstaging

# See all Effects dependents
./scripts/discover-dependents.sh Deepstaging.Effects

# This shows your dependency layers
```

### Quick health check

```bash
cd workspace

# Verify discovery works
./scripts/discover-dependents.sh Deepstaging

# Should show effects and any other dependents
```

## What Makes This Different?

### Traditional Approach
- ❌ Edit config files to add new packages
- ❌ Manually track dependencies
- ❌ Remember to update dependent repos
- ❌ Keep documentation in sync

### Auto-Discovery Approach
- ✅ Zero config - just create repos
- ✅ Dependencies auto-discovered
- ✅ Auto-restore dependents
- ✅ Always accurate

## Reference

### All Available Commands

```bash
# Smart publish (recommended)
./scripts/publish.sh <repo-name> [--restore-deps]

# Discover dependents
./scripts/discover-dependents.sh <package-name> [--restore]

# Deepstaging-specific (handles Testing specially)
./scripts/publish-to-local-nuget.sh [--restore-deps]

# Legacy generic (still works)
./scripts/publish-package.sh <package-name> [--restore-deps]
```

### Key Locations

- **Local feed:** `~/.nuget/local-feed/`
- **Scripts:** `workspace/scripts/`
- **Docs:** `workspace/docs/`
- **Repos:** `/Users/chris/code/org/deepstaging/`

---

**Remember:** The system auto-discovers everything. Just use standard .NET structure and PackageReferences!
