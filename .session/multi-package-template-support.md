# Multi-Package Template Support

**Date:** 2026-01-04  
**Status:** Proposal

## Problem Statement

The current `new-package.sh` script and `deepstaging-roslyn` template create packages in a **standalone structure** where all projects are at the root level:

```
MyRoslynTool/
├── MyRoslynTool.slnx              # Solution at root
├── MyRoslynTool/                  # Projects at root
├── MyRoslynTool.Analyzers/
├── MyRoslynTool.CodeFixes/
├── MyRoslynTool.Contracts/
├── MyRoslynTool.Generators/
├── MyRoslynTool.Queries/
└── MyRoslynTool.Tests/
```

However, the core Deepstaging monorepo uses a **nested package structure** where multiple packages live under `packages/` with their sub-projects nested inside:

```
packages/
├── Deepstaging/                    # Package folder
│   ├── Deepstaging/                # Sub-project
│   ├── Deepstaging.Roslyn/         # Sub-project
│   ├── Deepstaging.Generators/     # Sub-project
│   └── Deepstaging.Roslyn.Tests/   # Sub-project
├── Deepstaging.slnx                # Solution at packages level
├── Deepstaging.Testing/            # Package folder
│   └── Deepstaging.Testing/        # Sub-project
└── Deepstaging.Testing.slnx        # Solution at packages level
```

## Current Behavior

When `new-package.sh` runs:

1. Generates template with standalone structure
2. Moves entire output to `packages/PackageName/`
3. Adapts files for monorepo (removes standalone configs)
4. **Creates solution at packages level** pointing into nested structure

Result: The solution file is correctly placed at `packages/`, but the template was designed for standalone use, creating a mismatch.

## Requirements

Support **both** usage scenarios:

### Scenario 1: Standalone Usage (Current)
Developer uses template directly:
```bash
dotnet new deepstaging-roslyn -n MyTool
cd MyTool
dotnet build MyTool.slnx
```

Structure:
```
MyTool/
├── MyTool.slnx                    # Solution at root
├── MyTool/
├── MyTool.Analyzers/
└── ...
```

### Scenario 2: Monorepo Usage (New)
Developer uses `new-package.sh` from monorepo:
```bash
cd deepstaging
./scripts/new-package.sh Validation
cd packages
dotnet build Deepstaging.Validation.slnx
```

Structure:
```
packages/
├── Deepstaging.Validation/         # Package folder
│   ├── Deepstaging.Validation/     # Sub-projects nested
│   ├── Deepstaging.Validation.Analyzers/
│   └── ...
└── Deepstaging.Validation.slnx     # Solution at packages level
```

## Proposed Solution

### Option A: Template Parameter (Recommended)

Add a `StructureStyle` parameter to the template:

**Template Changes:**

1. **Update `.template.config/template.json`:**
```json
{
  "symbols": {
    "StructureStyle": {
      "type": "parameter",
      "datatype": "choice",
      "choices": [
        {
          "choice": "standalone",
          "description": "Standalone project with solution at root"
        },
        {
          "choice": "monorepo",
          "description": "Monorepo package with solution at parent level"
        }
      ],
      "defaultValue": "standalone",
      "description": "Project structure style"
    },
    "IncludeSample": {
      "type": "parameter",
      "datatype": "bool",
      "defaultValue": "true",
      "description": "Include a sample consumer project"
    }
  },
  "sources": [
    {
      "modifiers": [
        {
          "condition": "(StructureStyle == 'monorepo')",
          "rename": {
            "MyRoslynTool/": "MyRoslynTool/MyRoslynTool/",
            "MyRoslynTool.Analyzers/": "MyRoslynTool/MyRoslynTool.Analyzers/",
            "MyRoslynTool.CodeFixes/": "MyRoslynTool/MyRoslynTool.CodeFixes/",
            "MyRoslynTool.Contracts/": "MyRoslynTool/MyRoslynTool.Contracts/",
            "MyRoslynTool.Generators/": "MyRoslynTool/MyRoslynTool.Generators/",
            "MyRoslynTool.Queries/": "MyRoslynTool/MyRoslynTool.Queries/",
            "MyRoslynTool.Tests/": "MyRoslynTool/MyRoslynTool.Tests/",
            "MyRoslynTool.Sample/": "MyRoslynTool/MyRoslynTool.Sample/"
          }
        },
        {
          "condition": "(StructureStyle == 'monorepo')",
          "exclude": [
            "Directory.Build.props",
            "Directory.Packages.props",
            "pack.sh",
            "pack.cmd"
          ]
        },
        {
          "condition": "(!IncludeSample)",
          "exclude": [
            "**/MyRoslynTool.Sample/**/*"
          ]
        }
      ]
    }
  ]
}
```

2. **Create alternate solution template** (`MyRoslynTool.Parent.slnx`) for monorepo:
```xml
<Solution>
  <Folder Name="/MyRoslynTool/">
    <File Path="MyRoslynTool/README.md" />
    <File Path="MyRoslynTool/GETTING_STARTED.md" />
  </Folder>
  <Project Path="MyRoslynTool/MyRoslynTool.Contracts/MyRoslynTool.Contracts.csproj" />
  <Project Path="MyRoslynTool/MyRoslynTool.Queries/MyRoslynTool.Queries.csproj" />
  <!-- ... -->
</Solution>
```

3. **Add conditional content** for `Directory.Build.props` in monorepo mode:
```xml
#if (StructureStyle == "monorepo")
<Project>
    <!-- Import monorepo build configuration -->
    <Import Project="../build/build.props"/>
</Project>
#else
<Project>
    <!-- Standalone configuration -->
    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <!-- ... existing props ... -->
    </PropertyGroup>
</Project>
#endif
```

**Script Changes:**

Update `new-package.sh` line 101:
```bash
# OLD:
dotnet new deepstaging-roslyn -n "$PACKAGE_NAME" --IncludeSample false > /dev/null 2>&1

# NEW:
dotnet new deepstaging-roslyn -n "$PACKAGE_NAME" \
  --IncludeSample false \
  --StructureStyle monorepo > /dev/null 2>&1
```

Then simplify script (no longer need complex moves/renames):
- Step 3: Move output directly (already nested)
- Steps 4-5: Simplified (files already excluded)
- Step 9: Use generated parent solution file

### Option B: Post-Processing (Current Approach)

Keep template simple, do all restructuring in script:
- ✅ Template remains simple
- ❌ Complex script logic
- ❌ Harder to maintain
- ❌ Error-prone file moves

### Option C: Separate Templates

Create `deepstaging-roslyn` (standalone) and `deepstaging-roslyn-monorepo`:
- ❌ Code duplication
- ❌ Maintenance burden
- ✅ Clear separation

## Recommendation

**Option A** is best because:
1. Template controls structure (single source of truth)
2. Script becomes simpler (less magic)
3. Both scenarios explicitly supported
4. Easy to test and maintain
5. Template features are self-documenting

## Implementation Plan

### Phase 1: Template Updates
1. Add `StructureStyle` parameter to `template.json`
2. Add conditional file renames/excludes
3. Create alternate solution template for monorepo mode
4. Add conditional content to `Directory.Build.props`
5. Test both modes:
   ```bash
   # Test standalone
   dotnet new deepstaging-roslyn -n TestStandalone
   
   # Test monorepo
   dotnet new deepstaging-roslyn -n TestMonorepo --StructureStyle monorepo
   ```

### Phase 2: Script Updates
1. Update `new-package.sh` to pass `--StructureStyle monorepo`
2. Remove complex post-processing logic (file moves, renames)
3. Keep essential monorepo adaptations:
   - Project reference updates (PackageReference → ProjectReference)
   - Package metadata updates
   - Documentation updates
4. Test end-to-end:
   ```bash
   ./scripts/new-package.sh TestPackage
   cd packages && dotnet build Deepstaging.TestPackage.slnx
   ```

### Phase 3: Documentation
1. Update template README with both usage modes
2. Update `PACKAGE_DEVELOPMENT.md` with new workflow
3. Add examples to `new-package.sh` help text

## Testing Strategy

### Template Tests
```bash
# Standalone mode (default)
dotnet new deepstaging-roslyn -n TestStandalone
cd TestStandalone
dotnet build
dotnet test
./pack.sh

# Monorepo mode
dotnet new deepstaging-roslyn -n TestMonorepo --StructureStyle monorepo
# Verify nested structure
ls -la TestMonorepo/
cd TestMonorepo
# Should have nested projects
ls -la TestMonorepo/
```

### Integration Tests
```bash
# From deepstaging repo root
./scripts/new-package.sh TestPackage
cd packages
dotnet build Deepstaging.TestPackage.slnx
dotnet test Deepstaging.TestPackage.slnx
```

### Verification Checklist
- [ ] Standalone: Solution at root, projects at root
- [ ] Standalone: Builds successfully
- [ ] Standalone: Tests pass
- [ ] Standalone: pack.sh works
- [ ] Monorepo: Solution at parent level
- [ ] Monorepo: Projects nested in package folder
- [ ] Monorepo: Builds successfully
- [ ] Monorepo: Tests pass
- [ ] Monorepo: Project references work
- [ ] Monorepo: Inherits from monorepo props

## Benefits

1. **Clear Intent:** Template parameter makes structure choice explicit
2. **Simpler Script:** Less post-processing magic
3. **Better Testing:** Can test template independently
4. **Documentation:** Self-documenting via template parameters
5. **Flexibility:** Easy to add new structure styles
6. **Correctness:** Template generates correct structure from start

## Migration Notes

For existing packages created with old script:
- No changes needed (already adapted to monorepo)
- New packages will be cleaner (less post-processing)
- Script becomes more maintainable

## Next Steps

1. Review this proposal with team
2. Implement Phase 1 (template updates)
3. Test thoroughly
4. Implement Phase 2 (script simplification)
5. Update documentation
6. Publish updated template package
