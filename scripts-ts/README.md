# TypeScript Scripts

This directory contains TypeScript source files for workspace scripts. The scripts are compiled to JavaScript in the `scripts/` directory or run directly with `tsx`.

## Available Scripts

### Repository Management

**sync-repos.ts** - Sync local repositories to GitHub
```bash
npm run sync
workspace-sync  # via direnv
```
Features:
- Scans all repositories for changes
- Interactive commit strategy selection
- **AI-powered commit messages** via GitHub Copilot
- Beautiful terminal UI with progress indicators
- Type-safe git operations

### .NET Project Management

**discover-dependents.ts** - Find project dependencies
```bash
npm run discover -- ProjectName [searchDir]
workspace-discover-dependents ProjectName
```
Features:
- Scans .NET projects in directory
- Finds ProjectReference dependencies
- Shows which projects depend on target

**publish.ts** - Publish all projects to local NuGet
```bash
npm run publish -- deepstaging [--clear] [--skip-build]
workspace-publish deepstaging
```
Features:
- Discovers all .NET projects automatically
- Builds and packs each project
- Pushes to local NuGet feed
- Progress indicators and summary
- Optional feed clearing

**publish-local.ts** - Publish single project
```bash
npm run publish-local -- ../deepstaging/Deepstaging
workspace-publish-local ../deepstaging/Deepstaging
```
Features:
- Quick publish for one project
- Build → Pack → Push workflow
- Spinner indicators for each step

**new-project.ts** - Create new Roslyn project
```bash
npm run new-project -- MyNewTool [--no-sample] [--with-docs]
workspace-new-project MyNewTool
```
Features:
- Creates .NET solution with sln file
- Adds main library project
- Adds test project with xunit
- Links to Deepstaging framework
- Optional sample analyzer
- README template

## Library Structure

```
lib/
├── types.ts      # TypeScript interfaces and types
├── git.ts        # Git operations using simple-git
├── github.ts     # GitHub CLI operations
├── ui.ts         # Terminal UI utilities (inquirer, ora, chalk)
├── ai.ts         # AI commit message generation
├── dotnet.ts     # .NET CLI operations
└── nuget.ts      # NuGet package management
```

## Development

### Run scripts directly (no compilation needed):

```bash
npm run sync              # Run sync script
npm run sync -- --help    # Show help
```

### Compile to JavaScript:

```bash
npm run build
./scripts/sync-repos.js   # Run compiled version
```

## Benefits over Bash

- **Type safety**: Catch errors at compile time
- **Better async handling**: Clean async/await syntax
- **Rich libraries**: inquirer for prompts, ora for spinners, chalk for colors
- **Familiar syntax**: Similar to C# with interfaces, classes, generics
- **Better IDE support**: IntelliSense, auto-completion, refactoring tools
- **No stdin/tty issues**: Proper handling of interactive prompts

## Adding New Scripts

1. Create a new `.ts` file in `scripts-ts/`
2. Add shebang: `#!/usr/bin/env tsx`
3. Use shared libraries from `lib/`
4. Add npm script to `package.json` for convenience
5. Make executable: `chmod +x scripts-ts/your-script.ts`

## Libraries Used

- **simple-git**: Type-safe git operations
- **@inquirer/prompts**: Interactive command-line prompts
- **ora**: Elegant terminal spinners
- **chalk**: Terminal string styling
- **commander**: Command-line argument parsing
