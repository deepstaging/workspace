# Creating New Repositories with workspace-create-repository

## Quick Start

```bash
# Interactive mode - answers prompts
workspace-create-repository

# Direct mode - all options specified
workspace-create-repository -t deepstaging-roslyn -n MyAwesomeTool

# With options
workspace-create-repository -t deepstaging-roslyn -n MyTool --no-sample
```

## Installation

The command is automatically available after running `bootstrap.sh` and reloading your shell (direnv integration).

## Usage

### Interactive Mode

Just run the command without arguments:

```bash
cd workspace
npm run create-repository

# Or use the wrapper:
workspace-create-repository
```

You'll be prompted for:
1. **Template selection** - Choose from installed dotnet templates
2. **Repository name** - PascalCase name (e.g., MyAwesomeTool)
3. **Options** - Include docs, exclude sample, etc.

### Direct Mode

Specify all options via command line:

```bash
workspace-create-repository \
  --template deepstaging-roslyn \
  --name MyAwesomeTool \
  --no-sample
```

## Command Line Options

```
-t, --template <name>   Template short name
-n, --name <name>       Repository name (PascalCase)
--no-git                Skip git initialization
--with-docs             Include DocFX documentation site
--no-sample             Exclude sample consumer project
-h, --help              Show help
```

## Template Discovery

The command automatically discovers all installed dotnet templates:

```bash
# Install a template package
dotnet new install Deepstaging.Templates

# The template becomes immediately available
workspace-create-repository
# Shows "deepstaging-roslyn" in the list!
```

## What Gets Created

### Repository Structure

```
my-awesome-tool/                    # Created as sibling to workspace
├── src/                            # Source projects
│   └── MyAwesomeTool/
│       ├── MyAwesomeTool/
│       ├── MyAwesomeTool.Analyzers/
│       ├── MyAwesomeTool.Generators/
│       ├── MyAwesomeTool.Queries/
│       └── ...
├── tests/                          # Test projects
│   └── MyAwesomeTool.Tests/
├── MyAwesomeTool.Sample/          # Optional sample (unless --no-sample)
├── docs-site/                      # Optional docs (if --with-docs)
├── MyAwesomeTool.slnx              # Solution file at root
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
├── GETTING_STARTED.md
└── LICENSE
```

### Git Initialization

Unless `--no-git` is specified:
- Initializes git repository
- Creates initial commit: `feat: initialize from {template} template`

### Auto-Discovery

The new repository is automatically discovered by direnv on next entry:

```bash
cd ../my-awesome-tool
# direnv loads environment, workspace commands now available!
```

## Examples

### Create Roslyn Tool

```bash
# Full featured (with sample)
workspace-create-repository \
  -t deepstaging-roslyn \
  -n MyAnalyzer

# Minimal (no sample)
workspace-create-repository \
  -t deepstaging-roslyn \
  -n MyGenerator \
  --no-sample

# With documentation site
workspace-create-repository \
  -t deepstaging-roslyn \
  -n MyCodeFix \
  --with-docs
```

### Create from Custom Template

```bash
# First, install your template package
dotnet new install YourOrg.Templates

# Then create repository
workspace-create-repository -t your-template-name -n MyProject
```

## Next Steps After Creation

```bash
cd my-awesome-tool

# Build
dotnet build

# Test
dotnet test

# Run sample (if included)
dotnet run --project MyAwesomeTool.Sample

# Publish to local NuGet (when ready)
cd ../workspace
workspace-publish my-awesome-tool
```

## Template Requirements

For a template to work with `workspace-create-repository`:

### Must Have

✅ Installable via `dotnet new install <package>`  
✅ Generates solution file at repository root  
✅ Uses standard structure (src/, tests/)  
✅ Includes Directory.Packages.props  

### Optional but Recommended

- Custom template parameters (e.g., `-I` for IncludeSample)
- Documentation generation
- Sample project
- GitHub workflows

See `.docs/WORKSPACE_SPECIFICATION_CLARIFICATIONS.md` for full details on template requirements.

## Troubleshooting

### "No templates found"

Install a template package first:

```bash
dotnet new install Deepstaging.Templates
# Or from local path:
dotnet new install /path/to/Deepstaging.Templates
```

### "Directory already exists"

The target directory name already exists. Either:
- Choose a different name
- Remove the existing directory: `rm -rf repo-name`

### Template options not working

Check the template's supported options:

```bash
dotnet new <template-name> -h
```

The command uses template-specific conventions (e.g., Deepstaging templates use `-I` for IncludeSample).

### Template cache issues

Rebuild the cache:

```bash
dotnet new --debug:rebuild-cache
dotnet new install /path/to/your/template
```

## Advanced Usage

### Create Multiple Repositories

```bash
# Batch create
for name in Validation Mapping Serialization; do
  workspace-create-repository \
    -t deepstaging-roslyn \
    -n $name \
    --no-sample
done
```

### Custom Org Root

The command uses `DEEPSTAGING_ORG_ROOT` environment variable:

```bash
# Override for custom location
DEEPSTAGING_ORG_ROOT=/custom/path workspace-create-repository
```

### Skip Git for Manual Setup

```bash
workspace-create-repository \
  -t deepstaging-roslyn \
  -n MyTool \
  --no-git

# Then manually setup git
cd ../my-tool
git init
git remote add origin git@github.com:yourorg/my-tool.git
git add -A
git commit -m "Initial commit"
```

## Integration with Workspace

### Publishing

Once created, the repository can be published:

```bash
workspace-publish my-awesome-tool
```

### Dependency Discovery

Dependencies are automatically discovered:

```bash
workspace-discover-dependents MyAwesomeTool
```

### Syncing

The repository is included in workspace sync:

```bash
workspace-sync
# Includes my-awesome-tool in the sync!
```

## See Also

- [Workspace Specification](.docs/Workspace Specification.md) - Vision document
- [Specification Clarifications](.docs/WORKSPACE_SPECIFICATION_CLARIFICATIONS.md) - Implementation guide
- [Repository Structure Convention](.docs/REPO_STRUCTURE_CONVENTION.md) - Standard layout
- [TypeScript Migration](.docs/TYPESCRIPT_MIGRATION.md) - Why TypeScript for scripts

---

**This command implements the vision from Workspace Specification** - enabling any organization to fork the workspace and immediately start creating new repositories from templates!
