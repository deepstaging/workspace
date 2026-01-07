# Template Configuration Guide

This document explains how Deepstaging templates integrate with the workspace environment and what gets automatically configured.

## Overview

Deepstaging templates are .NET project templates that create production-ready repositories with workspace integration built-in. All workspace-specific configuration is automatically handled via template parameters.

## Template Parameters

### Core Deepstaging Parameters

These parameters are **automatically populated** when using `workspace-repository-create`:

| Parameter | Description | Source | Example Value |
|-----------|-------------|--------|---------------|
| `DeepstagingOrgName` | Organization name for root namespace | `DEEPSTAGING_ORG_NAME` env var | `MyOrg` |
| `DeepstagingFeedName` | Name of local NuGet feed source | `DEEPSTAGING_ORG_NAME` env var | `MyOrg` |
| `DeepstagingLocalNugetFeed` | Path to local NuGet package directory | `DEEPSTAGING_LOCAL_NUGET_FEED` env var | `/Users/me/org/deepstaging/packages` |

### How It Works

When you run `workspace-repository-create`:

1. **Environment variables are read** from your `.envrc` (loaded by direnv)
2. **Template introspection** discovers available parameters via `dotnet new <template> --help`
3. **Auto-population** passes Deepstaging parameters automatically
4. **Interactive prompts** only ask for template-specific options (e.g., `--IncludeDocs`)

```typescript
// Simplified logic from repository-create.ts
const hasDeepstagingOrgName = templateParams.some(p => p.name === 'DeepstagingOrgName');
if (hasDeepstagingOrgName) {
  const orgName = process.env.DEEPSTAGING_ORG_NAME;
  command += ` --DeepstagingOrgName "${orgName}"`;
}
```

## What Gets Configured

### 1. Root Namespace

**Template:** Uses `ORG_NAME.` prefix token
**Configured:** `Directory.Build.props`

```xml
<PropertyGroup>
  <!-- Before replacement: ORG_NAME.$(MSBuildProjectName) -->
  <!-- After replacement: MyOrg.$(MSBuildProjectName) -->
  <RootNamespace>MyOrg.$(MSBuildProjectName)</RootNamespace>
</PropertyGroup>
```

**Result:** All projects use `MyOrg.ProjectName` as root namespace

### 2. NuGet Configuration

**Template:** Uses `%DEEPSTAGING_LOCAL_NUGET_FEED%` placeholder
**Configured:** `NuGet.Config`

```xml
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <!-- Before: value="%DEEPSTAGING_LOCAL_NUGET_FEED%" -->
    <!-- After: value="/Users/me/org/deepstaging/packages" -->
    <add key="MyOrg" value="/Users/me/org/deepstaging/packages" />
  </packageSources>
</configuration>
```

**Result:** NuGet automatically finds packages in your local feed

### 3. Artifacts Directory

**Template:** Uses `DEEPSTAGING_ARTIFACTS_DIR` environment variable
**Configured:** `Directory.Build.props`

```xml
<PropertyGroup>
  <ArtifactsDir Condition="'$(DEEPSTAGING_ARTIFACTS_DIR)' != ''">
    $(DEEPSTAGING_ARTIFACTS_DIR)/MyProject
  </ArtifactsDir>
  <ArtifactsDir Condition="'$(DEEPSTAGING_ARTIFACTS_DIR)' == ''">
    $(MSBuildThisFileDirectory)artifacts
  </ArtifactsDir>
  
  <BaseOutputPath>$(ArtifactsDir)/bin/$(MSBuildProjectName)/</BaseOutputPath>
  <BaseIntermediateOutputPath>$(ArtifactsDir)/obj/$(MSBuildProjectName)/</BaseIntermediateOutputPath>
  <PackageOutputPath>$(ArtifactsDir)/packages/</PackageOutputPath>
</PropertyGroup>
```

**Result:** All build outputs go to workspace-shared artifacts directory

### 4. Package Metadata

**Template:** Uses `___FEED_NAME___` placeholder
**Configured:** `NuGet.Config`

```xml
<!-- Before: key="___FEED_NAME___" -->
<!-- After: key="MyOrg" -->
<add key="MyOrg" value="/path/to/packages" />
```

**Result:** Feed source name matches your organization

## Template-Specific Parameters

### deepstaging-roslyn

Interactive prompts ask for:

- `--IncludeSample` (bool, default: `true`) - Include sample consumer project
- `--IncludeDocs` (bool, default: `false`) - Include DocFX documentation site
- `--Framework` (choice, default: `net10.0`) - Target framework version

### deepstaging-empty

No additional parameters - just the core Deepstaging configuration.

## Environment Setup

Your `.envrc` at org root should define:

```bash
# Required for templates
export DEEPSTAGING_ORG_NAME="MyOrg"
export DEEPSTAGING_LOCAL_NUGET_FEED="/Users/me/org/deepstaging/packages"

# Optional but recommended
export DEEPSTAGING_ARTIFACTS_DIR="/Users/me/org/deepstaging/artifacts"
export DEEPSTAGING_ORG_ROOT="/Users/me/org/deepstaging"
export DEEPSTAGING_WORKSPACE_DIR="$DEEPSTAGING_ORG_ROOT/workspace"
export DEEPSTAGING_REPOSITORIES_DIR="$DEEPSTAGING_ORG_ROOT/repositories"
```

## Manual Template Usage

If using templates outside the workspace (not recommended):

```bash
dotnet new deepstaging-roslyn -n MyTool \
  --DeepstagingOrgName "MyOrg" \
  --DeepstagingFeedName "MyOrg" \
  --DeepstagingLocalNugetFeed "/Users/me/packages" \
  --IncludeDocs true
```

## Verifying Configuration

After creating a repository:

```bash
cd repositories/my-new-repo

# Check root namespace
grep RootNamespace Directory.Build.props

# Check NuGet feed path
cat NuGet.Config

# Check artifacts configuration
grep ArtifactsDir Directory.Build.props
```

## Adding New Templates

When creating new Deepstaging templates:

1. **Add template parameters** to `.template.config/template.json`:

```json
{
  "symbols": {
    "DeepstagingOrgName": {
      "type": "parameter",
      "datatype": "string",
      "defaultValue": "",
      "replaces": "ORG_NAME.",
      "description": "Deepstaging: Organization name for root namespace"
    },
    "DeepstagingFeedName": {
      "type": "parameter",
      "datatype": "string",
      "defaultValue": "",
      "replaces": "___FEED_NAME___",
      "description": "Deepstaging: Local NuGet feed name"
    },
    "DeepstagingLocalNugetFeed": {
      "type": "parameter",
      "datatype": "string",
      "defaultValue": "",
      "replaces": "%DEEPSTAGING_LOCAL_NUGET_FEED%",
      "description": "Deepstaging: Local NuGet feed path"
    }
  }
}
```

2. **Use placeholders** in template files:
   - `ORG_NAME.` for root namespace
   - `___FEED_NAME___` for feed name
   - `%DEEPSTAGING_LOCAL_NUGET_FEED%` for feed path

3. **Test auto-population** by running `workspace-repository-create`

The `repository-create.ts` script automatically detects these parameters and passes environment variable values.

## See Also

- [Template Repository](../../repositories/templates/) - Template source code
- [ENVIRONMENT.md](../ENVIRONMENT.md) - Environment variable reference
- [repository-create.ts](../scripts/repository-create.ts) - Implementation details
