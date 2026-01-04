# Repository Restructuring Migration Guide

This guide helps migrate existing repos to the standard convention.

## Standard Convention Summary

```
repo-name/                      # Lowercase kebab-case
├── src/                        # All source projects
│   └── RepoName.*/
├── tests/                      # All test projects
│   └── RepoName.*.Tests/
├── RepoName.sln               # Solution at root
├── Directory.Build.props
├── Directory.Packages.props
└── README.md
```

## Migration Checklist

### Pre-Migration
- [ ] Commit all changes
- [ ] Ensure clean working tree
- [ ] Run tests to establish baseline
- [ ] Note current build commands

### During Migration
- [ ] Create `src/` and `tests/` directories
- [ ] Move projects to appropriate directories
- [ ] Update solution file project paths
- [ ] Update cross-project references
- [ ] Move solution to root if needed
- [ ] Update `.csproj` paths in CI/CD
- [ ] Update documentation

### Post-Migration
- [ ] Build solution
- [ ] Run tests
- [ ] Verify package builds
- [ ] Update any scripts that reference paths
- [ ] Update README if it references paths

## Deepstaging Migration

### Current Structure
```
deepstaging/
└── packages/
    ├── Deepstaging.slnx                          ← Move to root
    ├── Deepstaging.Testing.slnx                  ← Remove (consolidate)
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
├── src/                                          ← New
│   ├── Deepstaging/
│   ├── Deepstaging.Roslyn/
│   ├── Deepstaging.Generators/
│   └── Deepstaging.Testing/
├── tests/                                        ← New
│   ├── Deepstaging.Roslyn.Tests/
│   └── Deepstaging.Testing.Tests/
├── samples/                                      ← Keep
├── docs/                                         ← Rename from docs-site
├── Deepstaging.sln                              ← Move from packages/
├── Directory.Build.props                        ← Move from packages/
├── Directory.Packages.props                     ← Move from packages/
└── README.md
```

### Migration Steps

```bash
cd deepstaging

# 1. Create new directories
mkdir -p src tests

# 2. Move source projects
mv packages/Deepstaging/Deepstaging src/
mv packages/Deepstaging/Deepstaging.Roslyn src/
mv packages/Deepstaging/Deepstaging.Generators src/
mv packages/Deepstaging.Testing/Deepstaging.Testing src/

# 3. Move test projects
mv packages/Deepstaging/Deepstaging.Roslyn.Tests tests/

# 4. Move solution and props to root
mv packages/Deepstaging.slnx Deepstaging.sln
mv packages/Directory.Build.props ./
mv packages/Directory.Packages.props ./

# 5. Remove old packages directory
rm -rf packages/

# 6. Update solution file paths
# Edit Deepstaging.sln:
#   Change: packages/Deepstaging/Deepstaging.Roslyn/...
#   To:     src/Deepstaging.Roslyn/...

# 7. Build and test
dotnet build Deepstaging.sln
dotnet test Deepstaging.sln

# 8. Commit
git add -A
git commit -m "refactor: restructure to standard convention (src/tests/)"
```

### Solution File Updates

**Before:**
```xml
<Project Path="packages\Deepstaging\Deepstaging.Roslyn\Deepstaging.Roslyn.csproj" />
```

**After:**
```xml
<Project Path="src\Deepstaging.Roslyn\Deepstaging.Roslyn.csproj" />
```

## Effects Migration

### Current Structure
```
effects/
├── Deepstaging.Effects/                          ← Flatten this
│   ├── Deepstaging.Effects/
│   ├── Deepstaging.Effects.Analyzers/
│   ├── Deepstaging.Effects.Generators/
│   ├── Deepstaging.Effects.CodeFixes/
│   ├── Deepstaging.Effects.Contracts/
│   ├── Deepstaging.Effects.Queries/
│   └── Deepstaging.Effects.Tests/
├── Deepstaging.Effects.slnx                      ← Rename to .sln
├── Directory.Build.props
└── Directory.Packages.props
```

### Target Structure
```
effects/
├── src/                                          ← New
│   ├── Deepstaging.Effects/
│   ├── Deepstaging.Effects.Analyzers/
│   ├── Deepstaging.Effects.Generators/
│   ├── Deepstaging.Effects.CodeFixes/
│   ├── Deepstaging.Effects.Contracts/
│   └── Deepstaging.Effects.Queries/
├── tests/                                        ← New
│   └── Deepstaging.Effects.Tests/
├── Deepstaging.Effects.sln                      ← Rename
├── Directory.Build.props
└── Directory.Packages.props
```

### Migration Steps

```bash
cd effects

# 1. Create new directories
mkdir -p src tests

# 2. Move source projects
mv Deepstaging.Effects/Deepstaging.Effects src/
mv Deepstaging.Effects/Deepstaging.Effects.Analyzers src/
mv Deepstaging.Effects/Deepstaging.Effects.Generators src/
mv Deepstaging.Effects/Deepstaging.Effects.CodeFixes src/
mv Deepstaging.Effects/Deepstaging.Effects.Contracts src/
mv Deepstaging.Effects/Deepstaging.Effects.Queries src/

# 3. Move test projects
mv Deepstaging.Effects/Deepstaging.Effects.Tests tests/

# 4. Remove old container directory
rmdir Deepstaging.Effects/

# 5. Rename solution
mv Deepstaging.Effects.slnx Deepstaging.Effects.sln

# 6. Update solution file paths
# Edit Deepstaging.Effects.sln:
#   Change: Deepstaging.Effects/Deepstaging.Effects/...
#   To:     src/Deepstaging.Effects/...

# 7. Build and test
dotnet build Deepstaging.Effects.sln
dotnet test Deepstaging.Effects.sln

# 8. Commit
git add -A
git commit -m "refactor: restructure to standard convention (src/tests/)"
```

## Script Updates After Migration

Once repos follow convention, simplify `publish.sh`:

### Current (Complex)
```bash
# Find solution file(s) - check root first, then packages/ subdirectory
cd "$REPO_DIR"
SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))

if [ ${#SOLUTION_FILES[@]} -eq 0 ] && [ -d "packages" ]; then
    cd "packages"
    SOLUTION_FILES=($(ls *.slnx *.sln 2>/dev/null || true))
    if [ ${#SOLUTION_FILES[@]} -gt 0 ]; then
        REPO_DIR="$REPO_DIR/packages"
    fi
fi

# Prefer solution named after the repo
# ... 20 more lines of matching logic ...
```

### After Convention (Simple)
```bash
# Solution is always at root, named after repo
REPO_NAME_PASCAL=$(echo "$REPO_NAME" | sed -E 's/(^|-)([a-z])/\U\2/g')
SOLUTION_FILE="$REPO_DIR/$REPO_NAME_PASCAL.sln"

if [ ! -f "$SOLUTION_FILE" ]; then
    echo "❌ Expected solution: $SOLUTION_FILE"
    exit 1
fi
```

**80% less code, zero special cases!**

## Gradual Migration Strategy

### Option A: Big Bang (Recommended for Small Repos)
1. Do entire migration in one commit
2. Test thoroughly
3. Update dependent repos if needed

### Option B: Incremental (For Large Repos)
1. Add src/ and tests/ directories
2. Move projects one at a time
3. Update solution after each move
4. Test after each change
5. Keep old structure working during transition

### Option C: Opportunistic
1. Migrate when doing major refactoring
2. Combine with other structural changes
3. Less disruptive to active development

## Testing Migration Success

### Verify Build
```bash
dotnet build RepoName.sln
# Should succeed with no errors
```

### Verify Tests
```bash
dotnet test RepoName.sln
# All tests should pass
```

### Verify Packaging
```bash
dotnet pack RepoName.sln -c Release -o ./packages
# Should create .nupkg files
```

### Verify Scripts
```bash
cd ../workspace
./scripts/publish.sh repo-name
# Should build and publish
```

### Verify Discovery
```bash
./scripts/discover-dependents.sh PackageName
# Should find dependents correctly
```

## Rollback Plan

If migration causes issues:

```bash
# Revert the commit
git revert HEAD

# Or reset if not pushed
git reset --hard HEAD~1

# Rebuild from old structure
dotnet build
```

## Communication

### Before Migration
- Notify team members
- Schedule during low-activity period
- Have someone available to help if issues arise

### After Migration
- Update documentation
- Share new structure
- Help team members update their clones

## Future-Proofing

After migration, document the convention:

```markdown
# Repository Structure

This repository follows the Deepstaging standard convention:

- `src/` - All source projects
- `tests/` - All test projects  
- `RepoName.sln` - Solution at root

For details, see: workspace/docs/REPO_STRUCTURE_CONVENTION.md
```

## When to Migrate

### Good Times
- ✅ Between major features
- ✅ During refactoring work
- ✅ When repo activity is low
- ✅ When you have time to test thoroughly

### Bad Times
- ❌ Middle of active feature development
- ❌ Just before a release
- ❌ When team is unavailable to help test
- ❌ When other major changes are happening

## Conclusion

**Migration is optional but beneficial:**
- Cleaner structure
- Simpler scripts
- Better tooling support
- Easier for newcomers

**Do it when convenient, not urgently.**

The scripts will continue to handle current structures. Convention-based repos just make everything simpler!
