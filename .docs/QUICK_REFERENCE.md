# New Package Script - Quick Reference

## Usage

```bash
./scripts/new-package.sh <PackageName>
```

## Examples

| Input | Output | Notes |
|-------|--------|-------|
| `Validation` | `Deepstaging.Validation` | Auto-prepends prefix |
| `Deepstaging.Mapping` | `Deepstaging.Mapping` | Already prefixed |
| `deepstaging.Email` | `Deepstaging.Email` | Fixes casing |
| `  MyTool  ` | `Deepstaging.MyTool` | Trims whitespace |
| `.Validation.` | `Deepstaging.Validation` | Removes dots |
| `Data.Validation` | `Deepstaging.Data.Validation` | Multi-segment |

## What Gets Created

```
packages/
└── Deepstaging.YourPackage/
    ├── Deepstaging.YourPackage.Contracts/      # Attributes
    ├── Deepstaging.YourPackage.Queries/        # Symbol queries
    ├── Deepstaging.YourPackage.Generators/     # Source generator
    ├── Deepstaging.YourPackage.Analyzers/      # Diagnostics
    ├── Deepstaging.YourPackage.CodeFixes/      # Code fixes
    ├── Deepstaging.YourPackage/                # Runtime library
    ├── Deepstaging.YourPackage.Tests/          # Tests
    ├── Directory.Build.props                   # Imports monorepo config
    ├── README.md                               # Package docs (with TODOs)
    ├── GETTING_STARTED.md                      # Development guide
    ├── PACKAGING.md                            # Publishing guide
    ├── PACKAGE_INFO.md                         # Monorepo integration notes
    ├── LICENSE                                 # MIT license
    └── Deepstaging.YourPackage.slnx           # Solution file
```

## After Creation

### 1. Fill TODOs (5 min)
```bash
cd packages/Deepstaging.YourPackage
# Edit README.md - Replace TODOs
# Edit YourPackage.Generators.csproj - Update description
```

### 2. Build (1 min)
```bash
cd packages
dotnet build Deepstaging.YourPackage.slnx
```

### 3. Test (1 min)
```bash
cd packages
dotnet test Deepstaging.YourPackage.slnx
```

### 4. Develop (varies)
- Customize attributes for your domain
- Write queries to extract symbol data
- Create Scriban templates
- Add analyzer rules
- Implement code fixes
- Write comprehensive tests

### 5. Package (1 min)
```bash
cd packages
dotnet pack Deepstaging.YourPackage.Generators/Deepstaging.YourPackage.Generators.csproj \
  --configuration Release \
  --output ../artifacts
```

## Validation Rules

✅ **Valid Names:**
- Each segment starts with uppercase letter
- Contains only alphanumeric characters
- Segments separated by dots

❌ **Invalid Names:**
- Segments starting with lowercase: `validation`
- Contains hyphens: `My-Tool`
- Contains underscores: `My_Tool`
- Empty segments: `Deepstaging..Tool`

## Troubleshooting

### "Package directory already exists"
```bash
# Delete existing directory
rm -rf packages/Deepstaging.YourPackage packages/Deepstaging.YourPackage.slnx
```

### "Invalid package name format"
Ensure each segment starts with an uppercase letter:
- ❌ `validation` 
- ✅ `Validation`

### Build errors after creation
```bash
# Ensure template is up to date
dotnet new uninstall Deepstaging.Roslyn.Template
dotnet new install ./templates/deepstaging-roslyn
```

## Key Features

- 🎯 **Smart naming** - Auto-prepends "Deepstaging.", fixes casing, trims whitespace
- 🔧 **Monorepo aware** - Inherits build config and package versions
- 🔗 **Project references** - Uses direct references to other Deepstaging packages
- 📝 **Documentation** - Creates PACKAGE_INFO.md with monorepo notes
- ✅ **Validated** - Ensures valid .NET package name format
- 🎨 **Colored output** - Beautiful CLI experience
- 🛡️ **Safe** - Uses temp directories with automatic cleanup

## Common Workflows

### Quick Package Creation
```bash
# Create and build in one go
./scripts/new-package.sh Validation && \
  cd packages && \
  dotnet build Deepstaging.Validation.slnx
```

### Create Multiple Packages
```bash
./scripts/new-package.sh Validation
./scripts/new-package.sh Mapping
./scripts/new-package.sh Serialization
```

### Test-Driven Development
```bash
./scripts/new-package.sh MyFeature
cd packages/Deepstaging.MyFeature
# Write tests first
dotnet test Deepstaging.MyFeature.slnx --filter "FullyQualifiedName~MyQueryTests"
```

## See Also

- [scripts/README.md](README.md) - Detailed documentation
- [DOGFOODING_SCRIPT_COMPLETE.md](../DOGFOODING_SCRIPT_COMPLETE.md) - Technical overview
- [templates/deepstaging-roslyn/](../templates/deepstaging-roslyn/) - Template source
