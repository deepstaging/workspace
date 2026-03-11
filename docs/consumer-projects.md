# Consumer Projects

Consumer projects are applications that depend on Deepstaging NuGet packages
(e.g. `Deepstaging`, `Deepstaging.Testing`). They live outside the Deepstaging
workspace in their own repositories.

During development, you'll frequently need to pack fresh Deepstaging packages
and rebuild a consumer to pick them up. The `repack-consumer.sh` script
automates this entire workflow.

## Registering a Consumer

Add an entry to `consumers.conf` at the workspace root:

```
# path                              depends-on
~/org/oval/repos/SharedNotes        deepstaging
~/org/other/repos/SomeApi           deepstaging
```

Each line has:

| Field | Description |
|-------|-------------|
| **path** | Absolute or `~`-relative path to the consumer project root |
| **depends-on** | Space-separated list of Deepstaging repos this consumer depends on |

### Known repos

The dependency graph is:

```
roslyn → deepstaging
```

When you declare a dependency on `deepstaging`, the script automatically
resolves transitive deps — it will pack `roslyn`, then `deepstaging`.

The script computes the union of all transitive dependencies and packs them in
topological order.

## Using repack-consumer.sh

### Interactive mode

```bash
repack-consumer.sh
```

When multiple consumers are registered, shows a menu ordered by most-recently
used. MRU state is stored at `~/.local/state/deepstaging/repack-mru`.

If only one consumer is registered, it's selected automatically.

### By name

```bash
repack-consumer.sh SharedNotes
```

Matches against the basename of the consumer path.

### List consumers

```bash
repack-consumer.sh --list
```

Shows all registered consumers, their declared deps, and the resolved pack
chain:

```
SharedNotes           deps: deepstaging            packs: roslyn deepstaging
```

### Pack only (skip consumer rebuild)

```bash
repack-consumer.sh SharedNotes --pack-only
```

Useful when you want to update the local feed without triggering a consumer
build (e.g. you're about to open the consumer in an IDE that will restore on
its own).

### Rebuild only (skip packing)

```bash
repack-consumer.sh SharedNotes --no-pack
```

Useful when packages are already fresh and you just need a clean rebuild of
the consumer — clears NuGet http-cache entries for Deepstaging packages, then
runs `dotnet restore --force && dotnet build`.

### Full clean (purge bin/obj)

```bash
repack-consumer.sh SharedNotes --purge
```

Nuclear option — also removes `bin/` and `obj/` directories before rebuilding.
This loses incremental compilation so the build is slower, but can help when
the build is in a truly broken state. Not needed for normal repack workflows.

## What the Script Does

1. **Resolves dependencies** — reads `consumers.conf`, computes the transitive
   closure of declared deps against the known DAG
2. **Packs** — calls `pack-local.sh` with `--skip` flags for repos not in the
   dep chain
2. **Cleans** — clears Deepstaging entries from the NuGet http-cache (with
   `--purge`, also removes `bin/` and `obj/`)
4. **Restores & builds** — runs `dotnet restore --force && dotnet build -c Release`
   in the consumer directory

## Consumer NuGet Configuration

Consumer projects need a `NuGet.Config` pointing at the local feed. Example:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="Deepstaging.Local" value="../../../deepstaging/packages" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="Deepstaging.Local">
      <package pattern="Deepstaging" />
      <package pattern="Deepstaging.*" />
    </packageSource>
    <packageSource key="nuget.org">
      <package pattern="*" />
      <package pattern="Deepstaging.*" />
    </packageSource>
  </packageSourceMapping>
  <config>
    <add key="ignoreFailedSources" value="true" />
  </config>
</configuration>
```

The `Deepstaging.Local` source path should be relative from the consumer
project root to `workspace/packages/`. The `ignoreFailedSources` setting
lets CI builds succeed even when the local feed doesn't exist.

## Troubleshooting

### Stale packages after repack

NuGet aggressively caches packages. The script handles this by:
- Using `dotnet restore --force` (ignores existing lock files)
- Clearing Deepstaging entries from the NuGet http-cache

If you still see stale packages, try clearing the global packages cache:

```bash
dotnet nuget locals global-packages --clear
```

### Consumer not found

Ensure the path in `consumers.conf` is correct and the directory exists.
Paths support `~` expansion but not other shell variables.
