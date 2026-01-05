# TypeScript Scripts

This directory contains TypeScript source files for workspace scripts. The scripts are compiled to JavaScript in the `scripts/` directory or run directly with `tsx`.

## Structure

```
scripts-ts/
├── lib/               # Shared libraries
│   ├── types.ts       # TypeScript interfaces and types
│   ├── git.ts         # Git operations using simple-git
│   ├── github.ts      # GitHub CLI operations
│   ├── ui.ts          # Terminal UI utilities (inquirer, ora, chalk)
│   └── ai.ts          # AI commit message generation
└── sync-repos.ts      # Main sync script
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
