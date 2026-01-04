# Template Dev Props Strategy - Complete! ✅

**Date:** 2026-01-04  
**Status:** Implemented

## Solution: Two-File Strategy

### File 1: `Directory.Build.Dev.props` (Template Development)
- **Purpose:** Local overrides for template developers
- **Contains:** ProjectReferences to `../../../Deepstaging/` projects
- **Git Status:** Ignored (in `.gitignore`)
- **Template Output:** Excluded (in `template.json`)
- **Who Uses:** Template developers (you) working in this repo

### File 2: `Directory.Build.Dev.props.template` (User Template)
- **Purpose:** Empty starter for template users
- **Contains:** Documentation and examples (commented out)
- **Git Status:** Tracked (checked into git)
- **Template Output:** **Included and renamed** to `Directory.Build.Dev.props`
- **Who Uses:** Developers who generate projects from the template

## How It Works

### Template Development (This Repository)

```
packages/Deepstaging.Templates/deepstaging-roslyn/
├── Directory.Build.props                    # Base config
├── Directory.Build.Dev.props                # 🚫 Your overrides (git-ignored, excluded)
├── Directory.Build.Dev.props.template       # ✅ Empty template (git-tracked, included)
└── .template.config/
    └── template.json
        ├── exclude: "Directory.Build.Dev.props"         # Don't include yours
        └── rename: ".template" → ""                     # Rename empty one
```

**Your dev file:**
```xml
<Project>
  <ItemGroup>
    <ProjectReference Include="../../../Deepstaging/Deepstaging.Roslyn/..." />
    <PackageReference Remove="Deepstaging.Roslyn" />
  </ItemGroup>
</Project>
```

**Template file (empty):**
```xml
<Project>
  <!-- Empty, ready for users to customize -->
</Project>
```

### Generated Template Output

```bash
dotnet new deepstaging-roslyn -n MyProject
```

**User gets:**
```
MyProject/
├── Directory.Build.props                    # Base config (imports dev file)
├── Directory.Build.Dev.props                # 📝 Empty starter (from .template)
└── .gitignore                               # Ignores dev file
```

**User can customize their dev file:**
```xml
<Project>
  <!-- Add your local overrides here -->
  <ItemGroup>
    <ProjectReference Include="../../SomeLocalLib/SomeLocalLib.csproj" />
  </ItemGroup>
</Project>
```

## Benefits

### ✅ For Template Developers
- IntelliSense from actual Deepstaging source code
- No risk of accidentally committing dev overrides
- Easy to enable/disable (just delete the dev file)

### ✅ For Template Users
- Get an empty dev file ready to customize
- File is already git-ignored
- Import already configured in Directory.Build.props
- Documentation shows examples

## Configuration

### `.gitignore`
```gitignore
## Development overrides (local only, not for templates)
Directory.Build.Dev.props
```

### `.template.config/template.json`
```json
{
  "sources": [{
    "modifiers": [
      {
        "exclude": [
          "**/*.placeholder",
          "Directory.Build.Dev.props"              // Exclude dev overrides
        ]
      },
      {
        "rename": {
          "Directory.Build.Dev.props.template": "Directory.Build.Dev.props"  // Include empty template
        }
      }
    ]
  }]
}
```

### `Directory.Build.props`
```xml
<Project>
  <!-- ... base configuration ... -->
  
  <!-- Import development-time overrides if present (git-ignored) -->
  <Import Project="$(MSBuildThisFileDirectory)Directory.Build.Dev.props" 
          Condition="Exists('$(MSBuildThisFileDirectory)Directory.Build.Dev.props')" />
</Project>
```

## Testing

### Test 1: Template Generation
```bash
cd packages/Deepstaging.Templates
dotnet new install .

cd /tmp
dotnet new deepstaging-roslyn -n TestTool

# Verify
ls -la TestTool/Directory.Build.Dev.props
# Should exist and be empty (with comments)

cat TestTool/Directory.Build.Dev.props
# Should NOT contain ../../../Deepstaging/ references
```

### Test 2: Template Development
```bash
cd packages/Deepstaging.Templates/deepstaging-roslyn

# Your dev file should have actual overrides
cat Directory.Build.Dev.props
# Should contain ProjectReferences to ../../../Deepstaging/

# Build should work with IntelliSense
dotnet build
```

## File Comparison

| File | Template Dev | Generated Template |
|------|-------------|-------------------|
| `Directory.Build.Dev.props` | ProjectRefs to Deepstaging | Empty starter |
| Git tracked? | ❌ No (ignored) | ❌ No (ignored) |
| In template output? | ❌ No (excluded) | ✅ Yes (renamed from .template) |
| Contains overrides? | ✅ Yes (actual refs) | ❌ No (empty) |

## Summary

**Problem Solved:** ✅  
- Template developers get IntelliSense without committing dev files
- Template users get an empty dev file ready to customize
- Both files are git-ignored
- No confusion between dev overrides and user customization

**Key Insight:**  
Two different files with the same final name:
1. Your dev file: `Directory.Build.Dev.props` (excluded from template)
2. User template: `Directory.Build.Dev.props.template` → `Directory.Build.Dev.props` (included in template)

Both are git-ignored in their respective locations, but only the empty template makes it into generated projects.

Perfect separation of concerns! 🎉
