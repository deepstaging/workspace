# Scripts Directory

This directory contains automation scripts for the Deepstaging workspace.

## Directory Structure

```
scripts/
├── lib/              # Utility functions (not auto-discovered by .envrc)
├── bootstrap.sh      # Initial workspace setup
├── sync-repos-to-github.sh  # Commit and push repos to GitHub  
├── new-roslyn-project.sh    # Create new Roslyn project
├── publish.sh        # Build and publish packages
├── publish-to-local-nuget.sh  # Publish Deepstaging core
└── discover-dependents.sh     # Find repos that depend on packages
```

**Note:** Files in the `lib/` subdirectory are utility functions that can be sourced by scripts but are not auto-aliased by `.envrc`.

## Bootstrap

### `bootstrap.sh` 🚀 **Run this first**

Sets up the multi-repository workspace environment.

```bash
./bootstrap.sh
```

**What it does:**
1. Copies `.envrc` to parent directory (enables cross-repo script aliases)
2. Discovers available Deepstaging repositories
3. Lets you clone all or select individual repos
4. Creates local NuGet feed directory
5. Guides you through direnv setup

**When to use:**
- First time setting up workspace
- Adding new team members
- After cloning workspace repo

## Active Scripts

### Publishing Scripts

#### `publish.sh` ⭐ **Recommended**
Smart publishing with full auto-discovery. Works with any repository.

```bash
./publish.sh <repo-name> [--restore-deps]

# Examples
./publish.sh deepstaging --restore-deps
./publish.sh effects --restore-deps
./publish.sh my-new-feature --restore-deps
```

**Features:**
- ✅ Zero configuration
- ✅ Auto-discovers repos, solutions, and packages
- ✅ Auto-discovers and restores dependents
- ✅ Works with any future package

#### `publish-to-local-nuget.sh`
Specialized script for Deepstaging core. Handles the Testing package edge case.

```bash
./publish-to-local-nuget.sh [--restore-deps]
```

**When to use:**
- Publishing Deepstaging core specifically
- Need special handling of Deepstaging.Testing
- Otherwise, use `publish.sh` instead

#### `discover-dependents.sh`
Discovery utility for finding which repos depend on a package.

```bash
./discover-dependents.sh <package-name> [--restore]

# Examples
./discover-dependents.sh Deepstaging
./discover-dependents.sh Deepstaging.Effects --restore
```

**Features:**
- Shows exactly which repos and projects depend on a package
- Optionally restores those repos
- Used internally by other publish scripts

### Project Creation

#### `new-roslyn-project.sh`
Creates a new Roslyn tooling project from the Deepstaging template.

```bash
./new-roslyn-project.sh ProjectName [options]

# Examples
./new-roslyn-project.sh MyAwesomeTool
./new-roslyn-project.sh MyTool --no-sample
./new-roslyn-project.sh MyTool --with-docs
```

**Options:**
- `--no-sample` - Exclude sample consumer project
- `--with-docs` - Include DocFX documentation

## Obsolete Scripts

### `publish-package.sh.obsolete`
Old publishing script with hardcoded package configurations.

**Why obsolete:**
- Required manual configuration for each package
- Hardcoded case statements for repos
- Superseded by `publish.sh` with auto-discovery

**Migration:**
- Old: `./publish-package.sh deepstaging`
- New: `./publish.sh deepstaging`

## Script Relationships

```
bootstrap.sh                     # First run: Setup workspace environment
  └─> Copies .envrc to parent
  └─> Clones repositories
  └─> Creates NuGet feed

publish.sh                       # High-level: Auto-discover and publish
  └─> discover-dependents.sh     # Utility: Find and restore dependents

publish-to-local-nuget.sh        # Specialized: Deepstaging core
  └─> discover-dependents.sh     # Utility: Find and restore dependents

new-roslyn-project.sh            # Standalone: Project creation
```

## Quick Reference

### First time setup
```bash
./bootstrap.sh
```

### Publish Deepstaging (most common)
```bash
./publish.sh deepstaging --restore-deps
```

### Publish any other package
```bash
./publish.sh effects --restore-deps
./publish.sh my-feature --restore-deps
```

### Check dependencies
```bash
./discover-dependents.sh Deepstaging
```

### Create new project
```bash
./new-roslyn-project.sh MyProject
```

## Decision Tree

**First time setup?**
- Run `bootstrap.sh` to clone repos and configure environment

**Need to publish a package?**
- Is it Deepstaging core? → Use `publish-to-local-nuget.sh` OR `publish.sh deepstaging`
- Is it anything else? → Use `publish.sh <repo-name>`

**Need to check dependencies?**
- Use `discover-dependents.sh <package-name>`

**Need to create a new project?**
- Use `new-roslyn-project.sh ProjectName`

---

**Keep it simple:** Use `publish.sh` for everything unless you have a specific reason not to.
