# Archived Bash Scripts

These bash scripts have been migrated to TypeScript for better maintainability and reliability.

## Migration Date
2026-01-05

## Reason for Migration
- stdin/tty redirection issues in bash
- Better type safety with TypeScript
- Familiar syntax for C# developers
- Professional terminal UI libraries
- Clean async/await patterns

## TypeScript Equivalents

| Old Bash Script | New TypeScript Script | Command |
|----------------|----------------------|---------|
| `sync-repos-to-github.sh` | `sync-repos.ts` | `workspace-sync` |
| `discover-dependents.sh` | `discover-dependents.ts` | `workspace-discover-dependents` |
| `publish.sh` | `publish.ts` | `workspace-publish` |
| `publish-to-local-nuget.sh` | `publish-local.ts` | `workspace-publish-local` |
| `new-roslyn-project.sh` | `new-project.ts` | `workspace-new-project` |

## How to Use TypeScript Scripts

From workspace directory:
```bash
npm run sync
npm run discover -- ProjectName
npm run publish -- deepstaging
npm run publish-local -- ../deepstaging
npm run new-project -- MyNewTool
```

Via direnv (after `direnv allow`):
```bash
workspace-sync
workspace-discover-dependents ProjectName
workspace-publish deepstaging
workspace-publish-local ../deepstaging
workspace-new-project MyNewTool
```

## Restoring Old Scripts

If you need to temporarily use the old bash versions:
1. Copy the script from this directory back to `../`
2. Make it executable: `chmod +x script-name.sh`
3. Run it: `./script-name.sh`

However, the TypeScript versions are recommended for all new usage.

## Bootstrap Script

`bootstrap.sh` remains in bash at `../bootstrap.sh` as it's a one-time setup script and needs to bootstrap the environment (including Node.js) before TypeScript can run.
