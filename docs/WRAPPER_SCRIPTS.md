# Wrapper Scripts

When you create a new repository with `workspace-repository-create`, the workspace automatically generates wrapper scripts in the repository's `scripts/` directory.

## What Are Wrapper Scripts?

Wrapper scripts are convenience scripts that call back to the workspace automation with repository-specific defaults pre-configured. They make common operations easier by eliminating the need to specify the repository name.

## How It Works

### 1. Template Storage

Wrapper script templates are stored in `workspace/scripts/wrapper-templates/` with a `.template` extension.

### 2. Generation Process

When creating a new repository, `repository-create.ts`:

1. Reads all `.template` files from `wrapper-templates/`
2. Replaces template variables with repository-specific values
3. Writes the generated scripts to `<repository>/scripts/`
4. Sets executable permissions (`chmod +x`)

### 3. Template Variables

Templates can use these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{REPO_NAME}}` | PascalCase repository name | `Deepstaging` |
| `{{REPO_KEY}}` | Kebab-case repository key | `deepstaging` |

## Available Wrapper Scripts

### publish.sh

Wraps `workspace-packages-publish` with the repository name pre-filled.

**Usage from repository:**
```bash
# From inside MyAwesomeTool repository
./scripts/publish.sh
```

**Equivalent workspace command:**
```bash
# From anywhere
workspace-packages-publish MyAwesomeTool
```

## Creating New Wrapper Scripts

To add a new wrapper script template:

### 1. Create Template File

Create a new file in `workspace/scripts/wrapper-templates/` with the `.template` extension:

```bash
# Example: workspace/scripts/wrapper-templates/test.sh.template
#!/bin/bash
set -e

# Run tests for {{REPO_NAME}}
cd "$(dirname "$0")/.."
dotnet test --configuration Release
```

### 2. Update Repository Creation

The `repository-create.ts` script automatically processes all `.template` files, so no code changes are needed unless you want custom processing logic.

### 3. Document the Template

Add documentation to `wrapper-templates/README.md` explaining:
- What the script does
- What template variables it uses
- Usage examples

### 4. Test It

Create a test repository and verify the wrapper script works:

```bash
workspace-repository-create -t deepstaging-roslyn -n TestRepo
cd ../TestRepo
./scripts/your-new-script.sh
```

## Why Use Wrapper Scripts?

**Convenience:**
- Shorter commands when working inside a repository
- No need to remember repository names
- Repository-specific defaults

**Portability:**
- Scripts can be run from anywhere in the repository
- Work even if someone clones just the repository (without workspace)
- Self-contained with clear intent

**Maintainability:**
- Update the template once, regenerate for all repos if needed
- Consistent patterns across repositories
- Easy to add new automation

## Regenerating Wrapper Scripts

If you update templates and want to regenerate scripts for existing repositories:

```bash
# Manual approach - run from repository
workspace-repository-create -t deepstaging-roslyn -n ExistingRepo
# Choose to overwrite wrapper scripts only

# Or copy templates manually
cp workspace/scripts/wrapper-templates/publish.sh.template \
   MyRepo/scripts/publish.sh
# Then manually replace {{REPO_NAME}} and {{REPO_KEY}}
```

## Example: Complete Workflow

### 1. Create Repository
```bash
workspace-repository-create -t deepstaging-roslyn -n MyAwesomeTool
```

### 2. Generated Structure
```
MyAwesomeTool/
├── scripts/
│   └── publish.sh    # Generated from template
└── ...
```

### 3. Use Wrapper Script
```bash
cd MyAwesomeTool
./scripts/publish.sh  # Publishes to local NuGet feed
```

### 4. Equivalent Without Wrapper
```bash
# From workspace
workspace-packages-publish MyAwesomeTool

# Or from repository
cd MyAwesomeTool
dotnet pack --configuration Release
dotnet nuget push ./artifacts/**/*.nupkg \
  --source ~/.nuget/local-feed
```

## See Also

- `scripts/wrapper-templates/README.md` - Template documentation
- `scripts/repository-create.ts` - Generation implementation
- Repository-specific `scripts/` directories - Generated outputs
