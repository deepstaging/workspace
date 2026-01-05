# DRY .envrc Refactoring

## Problem

The original `.envrc` manually created wrappers for each npm script:

```bash
# Before: Unmaintainable - hardcoded for each script
cat > "$SCRIPT_BIN_DIR/workspace-sync" << 'WRAPPER'
#!/usr/bin/env bash
cd "$WORKSPACE_DIR" && npm run sync -- "$@"
WRAPPER

cat > "$SCRIPT_BIN_DIR/workspace-discover-dependents" << 'WRAPPER'
#!/usr/bin/env bash
cd "$WORKSPACE_DIR" && npm run discover -- "$@"
WRAPPER

# ... repeat for each script
```

**Issues:**
- Adding new scripts requires updating `.envrc`
- Easy to forget to add wrappers
- Code duplication
- Maintenance burden

## Solution

Auto-discover npm scripts from `package.json` using `jq`:

```bash
# After: DRY - auto-discovers all scripts
if command -v jq &> /dev/null; then
    mapfile -t NPM_SCRIPTS < <(jq -r '.scripts | keys[]' "$WORKSPACE_PKG")
    
    for script_name in "${NPM_SCRIPTS[@]}"; do
        # Skip internal scripts
        case "$script_name" in
            build|dev|test|lint|format|watch)
                continue
                ;;
        esac
        
        # Create wrapper: npm script "sync" -> command "workspace-sync"
        cmd_name="workspace-${script_name}"
        cat > "$SCRIPT_BIN_DIR/$cmd_name" << WRAPPER
#!/usr/bin/env bash
WORKSPACE_DIR="\${DEEPSTAGING_WORKSPACE_DIR:-\$(cd "\$(dirname "\$0")/../../workspace" && pwd)}"
cd "\$WORKSPACE_DIR" && npm run $script_name -- "\$@"
WRAPPER
        chmod +x "$SCRIPT_BIN_DIR/$cmd_name"
    done
fi
```

## Benefits

✅ **Zero maintenance** - Add script to package.json, get wrapper automatically
✅ **DRY principle** - Single wrapper generation logic
✅ **Consistent naming** - `workspace-{script-name}` convention
✅ **Automatic filtering** - Skips internal scripts (build, dev, test)
✅ **Discoverable** - `jq` lists all available scripts

## How It Works

1. Read all scripts from `package.json` using `jq`
2. Filter out internal scripts (build, dev, test, lint, etc.)
3. Generate wrapper for each remaining script
4. Prefix with `workspace-` for namespacing
5. Make executable and add to `.direnv/bin/`

## Adding New Scripts

Just add to package.json:

```json
{
  "scripts": {
    "my-new-tool": "tsx scripts-ts/my-new-tool.ts"
  }
}
```

Next time direnv loads, `workspace-my-new-tool` is automatically available!

## Naming Convention

| package.json script | Command name |
|---------------------|--------------|
| `sync` | `workspace-sync` |
| `discover-dependents` | `workspace-discover-dependents` |
| `publish-local` | `workspace-publish-local` |
| `my-tool` | `workspace-my-tool` |

Hyphens in script names are preserved in command names.

## Requirements

- `jq` must be installed (included in Brewfile)
- If `jq` is not available, a warning is logged to debug output
- Fallback: manually create wrappers (not recommended)

## Consistency with Bash Scripts

The same DRY approach is used for bash scripts in `*/scripts/` directories:

```bash
for dir in */; do
    scripts_dir="${dir}scripts"
    if [[ -d "$scripts_dir" ]]; then
        for script in "$scripts_dir"/*.sh; do
            # Auto-create symlink
        done
    fi
done
```

**Now npm scripts use the same pattern:**
- Discover what exists
- Auto-generate wrappers
- Apply consistent naming

## Result

Zero-maintenance script discovery for both bash and TypeScript! 🎉
