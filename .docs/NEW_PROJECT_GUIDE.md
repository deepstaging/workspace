# Creating New Roslyn Projects

## Quick Start

Use the script from `workspace`:

```bash
cd ~/code/org/deepstaging/workspace/scripts

# Create a new project
./new-roslyn-project.sh MyAwesomeTool
```

The project will be created as a sibling to the workspace (e.g., `~/code/org/deepstaging/my-awesome-tool/`).

## Usage

```bash
cd ~/code/org/deepstaging/workspace/scripts
./new-roslyn-project.sh <ProjectName> [options]
```

### Arguments
- `ProjectName` - Name of your project (e.g., `MyAwesomeTool`)

### Options
- `--no-sample` - Exclude the sample consumer project
- `--with-docs` - Include DocFX documentation site setup
- `--help` - Show help message

## Examples

### Basic Project
```bash
cd ~/code/org/deepstaging/workspace/scripts
./new-roslyn-project.sh MyAwesomeTool
```

Creates `~/code/org/deepstaging/my-awesome-tool/` with:
- MyAwesomeTool (runtime library)
- MyAwesomeTool.Analyzers
- MyAwesomeTool.CodeFixes
- MyAwesomeTool.Contracts
- MyAwesomeTool.Generators
- MyAwesomeTool.Queries
- MyAwesomeTool.Sample (sample consumer)
- MyAwesomeTool.Tests

### Without Sample Project
```bash
cd ~/code/org/deepstaging/workspace/scripts
./new-roslyn-project.sh MyTool --no-sample
```

### With Documentation
```bash
cd ~/code/org/deepstaging/workspace/scripts
./new-roslyn-project.sh MyTool --with-docs
```

Includes DocFX site in `docs-site/` directory.

## What It Does

1. **Installs/Updates Template** - Ensures you have the latest template from `deepstaging/packages/Deepstaging.Templates`
2. **Creates Project** - Generates project as sibling to workspace at `~/code/org/deepstaging/<project-name>/`
3. **Initializes Git** - Creates git repo with initial commit
4. **Shows Next Steps** - Displays commands to build and test

## Directory Structure

After running:
```
~/code/org/deepstaging/
├── workspace/     # Shared scripts and tools
├── deepstaging/               # Core Roslyn tooling
├── effects/                   # Effects system
└── my-awesome-tool/           # Your new project
    ├── MyAwesomeTool.Analyzers/
    ├── MyAwesomeTool.Generators/
    ├── MyAwesomeTool.Queries/
    ├── MyAwesomeTool.Tests/
    └── ...
```

## Next Steps After Creation

```bash
cd my-awesome-tool
dotnet build
dotnet test
dotnet run --project MyAwesomeTool.Sample
```

## How It Works

The script:
- Uses `dotnet new install` with the local template path (no NuGet feed needed)
- Automatically reinstalls template to get latest changes
- Converts ProjectName to kebab-case for directory (MyAwesomeTool → my-awesome-tool)
- Initializes git repository automatically

## Updating the Template

When you make changes to the template in `deepstaging/packages/Deepstaging.Templates/`:

1. The script automatically uses the latest version (no rebuild needed)
2. Template changes are immediately available to new projects
3. No need to publish or pack the template

## Comparison to new-package.sh

| Feature | new-package.sh | new-roslyn-project.sh |
|---------|---------------|---------------------|
| **Script Location** | `deepstaging/scripts/` | `workspace/scripts/` |
| **Purpose** | Create package in monorepo | Create standalone project |
| **Output Location** | Inside `packages/` | Sibling to workspace |
| **Template** | Uses dotnet template, adapts to monorepo | Uses dotnet template as-is |
| **Dependencies** | ProjectReferences to monorepo | NuGet packages from local feed |
| **Structure** | Monorepo package | Full project structure |
| **Use Case** | Internal core packages | External tools/libraries |

## Troubleshooting

### Template Not Found
If the script can't find the template:
```bash
# Verify deepstaging repo location
ls -la ~/code/org/deepstaging/deepstaging/packages/Deepstaging.Templates/
```

### Template Not Updating
Force reinstall:
```bash
dotnet new uninstall Deepstaging.Templates
cd ~/code/org/deepstaging/workspace/scripts
./new-roslyn-project.sh MyProject
```

### Directory Already Exists
Remove or rename the existing directory:
```bash
rm -rf my-awesome-tool
# or
mv my-awesome-tool my-awesome-tool.old
```
