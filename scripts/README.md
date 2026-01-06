# Scripts Directory

This directory contains automation scripts for the Deepstaging workspace.

## Naming Convention

All scripts follow the **`subject-action`** pattern:
- `repos-sync` (not `sync-repos`)
- `caches-purge` (not `purge-caches`)
- `org-chart-generate` (not `generate-org-chart`)

Names use **kebab-case** (dashes only, no underscores or spaces).

## Clean Directory Structure

The `/scripts` directory contains **only source files** (`.ts` and `.sh`). All compiled artifacts (`.js`, `.d.ts`, `.map`) are generated in `/.build/scripts/` to keep this directory clean and scannable.

```
scripts/
├── *.sh              # Bash scripts (executable)
├── *.ts              # TypeScript source (executable with tsx)
└── lib/              # Shared utilities
    ├── *.sh          # Bash utilities  
    ├── *.ts          # TypeScript utilities
    └── setup-script-aliases.sh  # Helper for .envrc
```

Compiled output:
```
.build/
└── scripts/          # Generated .js, .d.ts, .map files (gitignored)
```

## Why This Structure?

1. ✅ **Clean scripts/** - Only source files, easy to browse and scan
2. ✅ **Simple .envrc** - No filters needed, just scans for `.ts` and `.sh`
3. ✅ **Compiled artifacts separated** - Build output doesn't clutter source
4. ✅ **Better for version control** - Only source files committed

## TypeScript Scripts

TypeScript scripts run directly with `tsx` (no compilation needed for execution).

### Workspace Management

**environment-check.ts** - Verify workspace environment setup
```bash
npm run environment-check
workspace-environment-check  # From parent dir
```

Read-only validation of workspace configuration:
- Environment variables are set correctly
- Directory structure exists
- Required and optional tools are installed
- direnv is configured and active
- PATH includes workspace scripts and aliases

**refresh.ts** - Rebuild and regenerate aliases
```bash
npm run refresh
npm run refresh -- --quiet
workspace-refresh  # from parent dir
```

Rebuilds TypeScript and regenerates direnv aliases. Run after:
- Adding/removing scripts
- Renaming scripts
- Modifying script structure

Use `--quiet` for silent operation (good for automation).

### Repository Management

**repositories-sync.ts** - Sync local repositories to GitHub
```bash
npm run repositories-sync
workspace-repositories-sync  # From parent dir
```

**repository-create.ts** - Create a new repository
```bash
npm run repository-create -- MyNewRepo
workspace-repository-create MyNewRepo
```

### .NET Project Management

**dependents-discover.ts** - Find project dependencies
```bash
npm run dependents-discover -- ProjectName
workspace-dependents-discover ProjectName
```

**packages-publish.ts** - Publish repository packages to local NuGet
```bash
npm run packages-publish -- deepstaging
workspace-packages-publish deepstaging
```

Called by each repository's `publish.sh` script.

**project-create.ts** - Create new Roslyn project
```bash
npm run project-create -- MyNewTool
workspace-project-create MyNewTool
```

**caches-purge.ts** - Clear NuGet caches
```bash
npm run caches-purge
workspace-caches-purge
```

Purges Deepstaging.* packages from:
- NuGet global packages cache
- Local NuGet feed

**nuget-licenses-scan.ts** - Scan NuGet package licenses
```bash
npm run nuget-licenses-scan
workspace-nuget-licenses-scan
```

Scans all .csproj files across repositories, fetches license information from NuGet.org, and displays packages grouped by license type.

### Visualization

**org-chart-generate.ts** - Generate dependency visualization
```bash
npm run org-chart-generate
workspace-org-chart-generate
```

Generates interactive D3.js visualization showing:
- Project references (blue dashed)
- NuGet package references (purple solid)
- Cross-repository dependencies (red solid)
- Output: `../../org-chart-deps.html`

**solutions-symlink.ts** - Create solution symlinks
```bash
npm run solutions-symlink
workspace-solutions-symlink
```

Creates symlinks for solution files in the org root directory.

## Bash Scripts

**bootstrap.sh** - First run setup
```bash
./bootstrap.sh
```

Sets up workspace environment, clones repos, creates NuGet feed.

## Development

### Running Scripts

TypeScript scripts run directly with tsx:
```bash
npm run <script-name>
tsx scripts/<script-name>.ts
```

Or via workspace aliases from parent directory:
```bash
workspace_<script_name>
```

### Building (Optional)

Compilation is optional since scripts run with tsx:
```bash
npm run build  # Compiles to .build/scripts/
```

### Adding New Scripts

1. Create `.ts` or `.sh` file in `scripts/` using `subject-action` naming
2. Add shebang: `#!/usr/bin/env tsx` or `#!/usr/bin/env bash`
3. Make executable: `chmod +x scripts/your-script.ts`
4. Add npm script to `package.json` (for convenience)
5. Run `npm run workspace-refresh` to regenerate aliases
6. Script is now available as `workspace-<subject>-<action>`

### Refreshing After Changes

After adding, removing, or renaming scripts:
```bash
npm run refresh        # Rebuild + regenerate aliases
npm run refresh -- -q  # Quiet mode
```

This ensures:
- TypeScript is compiled
- direnv aliases are regenerated
- Removed scripts don't leave stale aliases

### How .envrc Works

The `.envrc` file delegates to `scripts/lib/setup-script-aliases.sh` which:
1. Scans all repo `scripts/` directories
2. Creates prefixed wrappers in `.direnv/bin/`
3. TypeScript scripts → wrapped with `tsx`
4. Bash scripts → symlinked directly
5. Adds to PATH automatically

This keeps `.envrc` simple and maintainable.

## Libraries Used

- **tsx**: Direct TypeScript execution (no compilation needed)
- **simple-git**: Type-safe git operations
- **@inquirer/prompts**: Interactive CLI prompts
- **ora**: Terminal spinners
- **chalk**: Terminal styling
- **commander**: Argument parsing
- **glob**: File pattern matching

## Quick Reference

```bash
# First time
./bootstrap.sh

# Refresh workspace (after changes)
npm run refresh

# Generate org chart
npm run org-chart-generate

# Publish packages
npm run packages-publish -- deepstaging

# Create project
npm run project-create -- MyProject

# Sync repos
npm run repositories-sync

# Purge caches
npm run caches-purge

# Scan NuGet licenses
npm run nuget-licenses-scan
```
