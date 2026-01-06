#!/usr/bin/env tsx

/**
 * Generate Script Aliases
 * 
 * Scans repositories for scripts and creates prefixed command aliases.
 * Creates wrappers in .direnv/bin for all executable scripts found in repositories.
 * 
 * Usage:
 *   ./script-aliases-generate.ts
 *   npm run script-aliases-generate
 *   script-aliases-generate  (from parent dir)
 */

import { readdirSync, existsSync, unlinkSync, mkdirSync, writeFileSync, statSync, symlinkSync } from 'fs';
import { join } from 'path';

function kebabToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

function generateScriptAliases(repositoriesDir: string, binDir: string): number {
  let scriptCount = 0;

  if (!existsSync(repositoriesDir)) {
    console.log(`⚠️  Repositories directory not found: ${repositoriesDir}`);
    return 0;
  }

  const repos = readdirSync(repositoriesDir, { withFileTypes: true });

  for (const repo of repos) {
    if (!repo.isDirectory()) continue;

    const repoName = repo.name;
    const repoPath = join(repositoriesDir, repoName);
    const scriptsDir = join(repoPath, 'scripts');

    if (!existsSync(scriptsDir)) continue;

    const normalizedRepoName = kebabToSnake(repoName);
    const hasPackageJson = existsSync(join(repoPath, 'package.json'));

    const scripts = readdirSync(scriptsDir);

    for (const scriptFile of scripts) {
      const scriptPath = join(scriptsDir, scriptFile);
      
      let stats;
      try {
        stats = statSync(scriptPath);
      } catch {
        continue;
      }

      // Skip non-files, non-executable files, and subdirectories
      if (!stats.isFile() || !(stats.mode & 0o100)) continue;

      const baseName = scriptFile.replace(/\.sh$/, '').replace(/\.ts$/, '');
      const prefixedName = `${normalizedRepoName}-${baseName}`;

      // TypeScript scripts with package.json - create npm wrapper
      if (scriptFile.endsWith('.ts') && hasPackageJson) {
        const wrapperPath = join(binDir, prefixedName);
        const wrapperContent = `#!/usr/bin/env bash
# Auto-generated wrapper for TypeScript script: ${baseName}
REPO_DIR="\${DEEPSTAGING_REPOSITORIES_DIR:-\${DEEPSTAGING_ORG_ROOT}/repositories}/${repoName}"
cd "\$REPO_DIR" && npm run ${baseName} -- "\$@"
`;
        writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
        scriptCount++;
      }
      // Bash scripts - create symlink
      else if (scriptFile.endsWith('.sh') || !scriptFile.includes('.')) {
        const symlinkPath = join(binDir, prefixedName);
        
        // Remove old symlink if it exists
        try {
          unlinkSync(symlinkPath);
        } catch {}
        
        // Create new symlink
        try {
          symlinkSync(scriptPath, symlinkPath);
          scriptCount++;
        } catch (error) {
          console.warn(`⚠️  Failed to create symlink for ${prefixedName}: ${error}`);
        }
      }
    }
  }

  return scriptCount;
}

function generateWorkspaceAliases(workspaceDir: string, binDir: string): number {
  let scriptCount = 0;

  const scriptsDir = join(workspaceDir, 'scripts');
  if (!existsSync(scriptsDir)) {
    console.log(`⚠️  Workspace scripts directory not found: ${scriptsDir}`);
    return 0;
  }

  const hasPackageJson = existsSync(join(workspaceDir, 'package.json'));
  if (!hasPackageJson) {
    console.log(`⚠️  Workspace package.json not found`);
    return 0;
  }

  const scripts = readdirSync(scriptsDir);

  for (const scriptFile of scripts) {
    const scriptPath = join(scriptsDir, scriptFile);
    
    let stats;
    try {
      stats = statSync(scriptPath);
    } catch {
      continue;
    }

    // Skip non-files, non-executable files, subdirectories, and non-.ts files
    if (!stats.isFile() || !(stats.mode & 0o100) || !scriptFile.endsWith('.ts')) continue;

    const baseName = scriptFile.replace(/\.ts$/, '');
    const prefixedName = `workspace-${baseName}`;

    // Create npm wrapper for workspace TypeScript scripts
    const wrapperPath = join(binDir, prefixedName);
    const wrapperContent = `#!/usr/bin/env bash
# Auto-generated wrapper for workspace script: ${baseName}
WORKSPACE_DIR="\${DEEPSTAGING_WORKSPACE_DIR:-\${DEEPSTAGING_ORG_ROOT}/workspace}"
cd "\$WORKSPACE_DIR" && npm run ${baseName} -- "\$@"
`;
    writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
    scriptCount++;
  }

  return scriptCount;
}

async function main() {
  console.log('🔗 Generating script aliases...\n');

  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || join(process.cwd(), '..');
  const workspaceDir = process.env.DEEPSTAGING_WORKSPACE_DIR || join(orgRoot, 'workspace');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || join(orgRoot, 'repositories');
  const binDir = join(orgRoot, '.direnv', 'bin');

  // Clean old aliases
  if (existsSync(binDir)) {
    console.log('🧹 Cleaning old aliases...');
    const files = readdirSync(binDir);
    for (const file of files) {
      try {
        unlinkSync(join(binDir, file));
      } catch {}
    }
    console.log(`   Removed ${files.length} old alias(es)\n`);
  }

  // Create bin directory
  mkdirSync(binDir, { recursive: true });

  // Generate workspace aliases
  console.log('🔨 Creating workspace aliases...');
  const workspaceCount = generateWorkspaceAliases(workspaceDir, binDir);
  console.log(`   Created ${workspaceCount} workspace alias(es)\n`);

  // Generate repository aliases
  console.log('🔨 Creating repository aliases...');
  const repoCount = generateScriptAliases(repositoriesDir, binDir);
  console.log(`   Created ${repoCount} repository alias(es)\n`);

  console.log('✅ Script aliases generated!');
  console.log(`   Total: ${workspaceCount + repoCount} aliases`);
  console.log('\n💡 Tip: Run `direnv reload` to apply changes\n');
}

main().catch((error) => {
  console.error('❌ Failed to generate script aliases:', error instanceof Error ? error.message : error);
  process.exit(1);
});
