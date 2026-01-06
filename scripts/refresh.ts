#!/usr/bin/env tsx

/**
 * Refresh Workspace
 * 
 * Rebuilds TypeScript scripts and regenerates repository script aliases.
 * Run this after:
 * - Adding/removing scripts
 * - Renaming scripts
 * - Cloning/removing repositories
 * 
 * Usage:
 *   ./refresh.ts [--quiet]
 *   npm run refresh
 *   npm run refresh -- --quiet
 *   refresh  (from parent dir)
 */

import { execSync } from 'child_process';
import { join } from 'path';

interface Options {
  quiet: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  return {
    quiet: args.includes('--quiet') || args.includes('-q')
  };
}

function log(message: string, options: Options) {
  if (!options.quiet) {
    console.log(message);
  }
}

function run(command: string, options: Options): void {
  const stdio = options.quiet ? 'pipe' : 'inherit';
  try {
    execSync(command, { 
      stdio: stdio === 'pipe' ? ['pipe', 'pipe', 'pipe'] : stdio,
    });
  } catch (error) {
    if (!options.quiet) {
      console.error(`Failed to run: ${command}`);
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
    throw error;
  }
}

async function main() {
  const options = parseArgs();
  
  if (!options.quiet) {
    console.log('🔄 Refreshing workspace...\n');
  }

  // Determine workspace directory
  const workspaceDir = process.env.DEEPSTAGING_WORKSPACE_DIR || 
    (import.meta.dirname ? join(import.meta.dirname, '..') : process.cwd());

  // Step 1: Build TypeScript
  log('📦 Building TypeScript...', options);
  try {
    const stdio = options.quiet ? 'pipe' : 'inherit';
    execSync('npm run build', { 
      stdio: stdio === 'pipe' ? ['pipe', 'pipe', 'pipe'] : stdio,
      cwd: workspaceDir
    });
    log('✅ TypeScript built\n', options);
  } catch (error) {
    console.error('❌ TypeScript build failed');
    process.exit(1);
  }

  // Step 2: Regenerate repository script aliases
  log('🔗 Regenerating repository script aliases...', options);
  try {
    const stdio = options.quiet ? 'pipe' : 'inherit';
    execSync('npm run script-aliases-generate', { 
      stdio: stdio === 'pipe' ? ['pipe', 'pipe', 'pipe'] : stdio,
      cwd: workspaceDir
    });
    if (!options.quiet) {
      console.log();
    }
  } catch (error) {
    console.error('❌ Failed to regenerate script aliases');
    process.exit(1);
  }

  // Step 3: Reload direnv
  try {
    const orgRoot = process.env.DEEPSTAGING_ORG_ROOT;
    if (orgRoot) {
      process.chdir(orgRoot);
      const stdio = options.quiet ? 'pipe' : 'inherit';
      execSync('direnv allow', { 
        stdio: stdio === 'pipe' ? ['pipe', 'pipe', 'pipe'] : stdio
      });
      if (!options.quiet) {
        console.log('💡 Tip: Run `direnv reload` in your shell to apply changes immediately\n');
      }
    }
  } catch (error) {
    log('⚠️  Could not reload direnv (run `direnv allow` manually)\n', options);
  }

  if (!options.quiet) {
    console.log('✨ Workspace refreshed!');
  }
}

main().catch((error) => {
  console.error('❌ Refresh failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
