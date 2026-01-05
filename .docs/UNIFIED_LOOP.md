# Final DRY .envrc - Single Unified Loop

## Achievement

Successfully consolidated bash and TypeScript script discovery into a **single loop** with **zero duplication**.

## The Evolution

### V1: Separate loops (duplicated logic)
```bash
# Loop 1: Bash scripts
for dir in */; do
    for script in scripts/*.sh; do
        ln -sf "$script" "$BIN_DIR/${prefix}-${name}"
    done
done

# Loop 2: TypeScript scripts (DUPLICATION!)
for dir in */; do
    if has package.json; then
        for npm_script in scripts; do
            create wrapper
        done
    fi
done
```

### V2: Unified loop (DRY!)
```bash
# Single loop handles both!
for dir in */; do
    if has scripts/ directory; then
        has_package_json=check
        
        for script in scripts/*; do
            if script.ts && has_package_json:
                create npm wrapper
            else:
                create bash symlink
        done
    fi
done
```

## How It Works

1. **Single iteration** through all repositories
2. **Check once** for package.json presence
3. **One loop** through scripts directory
4. **Smart dispatch**:
   - `.ts` file + package.json → npm wrapper
   - Everything else → bash symlink

## Key Insight

TypeScript scripts live in `scripts/` as symlinks to `scripts-ts/`:
```
workspace/scripts/
├── bootstrap.sh              # Real bash script
├── sync-repos.ts -> ../scripts-ts/sync-repos.ts    # Symlink
├── publish.ts -> ../scripts-ts/publish.ts          # Symlink
└── ...
```

The loop doesn't care - it sees executable files and routes them correctly!

## Benefits

✅ **Single loop** - No duplication
✅ **Unified logic** - One place to maintain
✅ **Automatic detection** - Bash or TypeScript
✅ **Consistent naming** - Same prefix pattern
✅ **Zero configuration** - Just add files!

## Adding New Scripts

### Bash Script
```bash
# 1. Create executable file
echo '#!/usr/bin/env bash' > workspace/scripts/my-tool.sh
chmod +x workspace/scripts/my-tool.sh

# 2. Done! workspace-my-tool available on next direnv load
```

### TypeScript Script
```bash
# 1. Create TypeScript file
echo '#!/usr/bin/env tsx' > workspace/scripts-ts/my-tool.ts
chmod +x workspace/scripts-ts/my-tool.ts

# 2. Add to package.json
{
  "scripts": {
    "my-tool": "tsx scripts-ts/my-tool.ts"
  }
}

# 3. Symlink from scripts/ (for discovery)
ln -s ../scripts-ts/my-tool.ts workspace/scripts/my-tool.ts

# 4. Done! workspace-my-tool available on next direnv load
```

## The Magic

The loop checks:
```bash
if [[ "$script_name" == *.ts && "$has_package_json" == true ]]; then
    # TypeScript: create npm wrapper
    npm run ${base_name}
else
    # Bash: create symlink
    ln -sf $script
fi
```

One conditional, two outcomes, zero duplication!

## Comparison

| Aspect | Before | After |
|--------|---------|-------|
| **Loops** | 2 separate | 1 unified |
| **Lines** | ~80 | ~40 |
| **Maintenance** | Update both | Update once |
| **Clarity** | Confusing | Clear |
| **DRY** | ❌ Duplicated | ✅ DRY |

## Result

**One loop. Two script types. Zero duplication. Infinite scalability.** 🚀

The `.envrc` now embodies perfect DRY principles while handling bash and TypeScript scripts seamlessly!
