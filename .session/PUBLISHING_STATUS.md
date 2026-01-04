# Publishing Workflow - Current Status

## Status: Ready (with caveat)

The local NuGet publishing pattern is configured and ready to use.

### Working Scripts

1. **`publish-to-local-nuget.sh`** - Enhanced with dependency restoration
   - Usage: `./scripts/publish-to-local-nuget.sh [--restore-deps]`
   - Publishes: Deepstaging core packages
   - Restores: Effects repo (if --restore-deps flag)

2. **`publish-package.sh`** - Generic script for any package
   - Usage: `./scripts/publish-package.sh <package-name> [--restore-deps]`
   - Supports: deepstaging, effects (extensible)
   - Restores: Configured dependent repos

### Current Issue

**Deepstaging.Testing has a compilation error** (unrelated to NuGet pattern):
- Error: `TemplateName.ForGenerator` signature mismatch
- File: `TemplateTestBase.cs:11`
- Impact: Cannot publish Deepstaging.Testing to local NuGet currently

**Workaround:** Effects repo already configured to use ProjectReference for Deepstaging.Testing (as documented - it's not packaged due to ModuleInitializer conflicts anyway).

### What Works Now

```bash
# Publish Deepstaging core (without Testing package)
cd workspace
./scripts/publish-to-local-nuget.sh

# Effects repo can restore
cd ../effects
dotnet restore --force-evaluate
```

### Next Steps

1. **Fix Deepstaging.Testing compilation error** (separate issue)
2. **Complete Effects NuGet migration** - Remove project references
3. **Test full workflow** with --restore-deps flag

### Testing the Generic Script

```bash
# Test script shows help
cd workspace
./scripts/publish-package.sh

# Test deepstaging publish (core only, Testing has error)
./scripts/publish-package.sh deepstaging

# When Effects is ready for NuGet packaging
./scripts/publish-package.sh effects --restore-deps
```

## Documentation

- **Pattern Overview:** `docs/LOCAL_NUGET_PATTERN.md`
- **This Status:** `docs/PUBLISHING_STATUS.md`

---

**Last Updated:** 2026-01-04
**Ready for:** Deepstaging core publishing
**Pending:** Deepstaging.Testing fix, Effects packaging setup
