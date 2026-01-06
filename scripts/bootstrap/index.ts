#!/usr/bin/env tsx

/**
 * Deepstaging Workspace Bootstrap
 * 
 * Sets up the multi-repository workspace environment:
 * - Validates environment from parent .envrc
 * - Checks for required dependencies
 * - Installs npm dependencies
 * - Discovers and clones repositories
 * - Generates script aliases
 * 
 * Usage:
 *   ./bootstrap.ts
 *   npm run bootstrap
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { select, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

interface DeepstagingEnv {
  DEEPSTAGING_ORG_ROOT: string;
  DEEPSTAGING_WORKSPACE_DIR: string;
  DEEPSTAGING_REPOSITORIES_DIR: string;
  DEEPSTAGING_GITHUB_ORG: string;
  DEEPSTAGING_LOCAL_NUGET_FEED: string;
  DEEPSTAGING_ARTIFACTS_DIR: string;
}

function loadEnvFromEnvrc(envrcPath: string, orgRoot: string): DeepstagingEnv | null {
  if (!existsSync(envrcPath)) {
    return null;
  }

  const content = readFileSync(envrcPath, 'utf-8');
  const env: Partial<DeepstagingEnv> = {};

  // Parse environment variables from .envrc
  const exportRegex = /export\s+(\w+)="([^"]+)"/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const [, key, value] = match;
    if (key.startsWith('DEEPSTAGING_')) {
      // Evaluate $(pwd) as orgRoot
      let evaluatedValue = value.replace(/\$\(pwd\)/g, orgRoot);
      // Evaluate variable references
      evaluatedValue = evaluatedValue.replace(/\$\{?(\w+)\}?/g, (_, varName) => {
        return env[varName as keyof DeepstagingEnv] || process.env[varName] || '';
      });
      env[key as keyof DeepstagingEnv] = evaluatedValue;
    }
  }

  // Validate required variables
  const required: (keyof DeepstagingEnv)[] = [
    'DEEPSTAGING_ORG_ROOT',
    'DEEPSTAGING_WORKSPACE_DIR',
    'DEEPSTAGING_REPOSITORIES_DIR',
    'DEEPSTAGING_GITHUB_ORG',
    'DEEPSTAGING_LOCAL_NUGET_FEED',
    'DEEPSTAGING_ARTIFACTS_DIR',
  ];

  for (const key of required) {
    if (!env[key]) {
      console.error(chalk.red(`❌ Missing required environment variable: ${key}`));
      return null;
    }
  }

  return env as DeepstagingEnv;
}

function validateEnvironment(env: DeepstagingEnv): boolean {
  console.log(chalk.blue('\n📋 Validating environment...\n'));

  let valid = true;

  // Check ORG_ROOT exists
  if (!existsSync(env.DEEPSTAGING_ORG_ROOT)) {
    console.error(chalk.red(`❌ DEEPSTAGING_ORG_ROOT does not exist: ${env.DEEPSTAGING_ORG_ROOT}`));
    valid = false;
  } else {
    console.log(chalk.green(`✓ DEEPSTAGING_ORG_ROOT: ${env.DEEPSTAGING_ORG_ROOT}`));
  }

  // Check WORKSPACE_DIR exists
  if (!existsSync(env.DEEPSTAGING_WORKSPACE_DIR)) {
    console.error(chalk.red(`❌ DEEPSTAGING_WORKSPACE_DIR does not exist: ${env.DEEPSTAGING_WORKSPACE_DIR}`));
    valid = false;
  } else {
    console.log(chalk.green(`✓ DEEPSTAGING_WORKSPACE_DIR: ${env.DEEPSTAGING_WORKSPACE_DIR}`));
  }

  // REPOSITORIES_DIR may not exist yet (we'll create it)
  console.log(chalk.cyan(`  DEEPSTAGING_REPOSITORIES_DIR: ${env.DEEPSTAGING_REPOSITORIES_DIR}`));

  // Show other vars
  console.log(chalk.cyan(`  DEEPSTAGING_GITHUB_ORG: ${env.DEEPSTAGING_GITHUB_ORG}`));
  console.log(chalk.cyan(`  DEEPSTAGING_LOCAL_NUGET_FEED: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
  console.log(chalk.cyan(`  DEEPSTAGING_ARTIFACTS_DIR: ${env.DEEPSTAGING_ARTIFACTS_DIR}`));

  return valid;
}

function checkDependencies(): { missing: string[], installed: string[] } {
  const required = [
    { name: 'brew', check: 'brew --version' },
    { name: 'gh', check: 'gh --version' },
    { name: 'direnv', check: 'direnv --version' },
    { name: 'jq', check: 'jq --version' },
    { name: 'node', check: 'node --version' },
    { name: 'npm', check: 'npm --version' },
  ];

  const missing: string[] = [];
  const installed: string[] = [];

  for (const dep of required) {
    try {
      execSync(dep.check, { stdio: 'ignore' });
      installed.push(dep.name);
    } catch {
      missing.push(dep.name);
    }
  }

  return { missing, installed };
}

function getExistingRepos(githubOrg: string): string[] {
  try {
    const output = execSync(`gh repo list ${githubOrg} --limit 100 --json name --jq '.[].name'`, {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch repositories from GitHub'));
    throw error;
  }
}

function getClonedRepos(repositoriesDir: string): string[] {
  if (!existsSync(repositoriesDir)) {
    return [];
  }
  
  return readdirSync(repositoriesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && existsSync(join(repositoriesDir, dirent.name, '.git')))
    .map(dirent => dirent.name);
}

async function main() {
  console.log(chalk.bold.blue('🚀 Deepstaging Workspace Bootstrap'));
  console.log(chalk.blue('═'.repeat(40)));

  // Step 1: Load and validate environment from parent .envrc
  console.log(chalk.blue('\n📂 Loading environment from parent .envrc...\n'));
  
  const orgRoot = join(process.cwd(), '..');
  const envrcPath = join(orgRoot, '.envrc');

  if (!existsSync(envrcPath)) {
    console.error(chalk.red(`❌ .envrc not found at: ${envrcPath}`));
    console.error(chalk.yellow('\n💡 Hint: Make sure you run bootstrap from the workspace directory'));
    console.error(chalk.yellow('   and that .envrc exists in the parent directory.\n'));
    process.exit(1);
  }

  const env = loadEnvFromEnvrc(envrcPath, orgRoot);
  if (!env) {
    console.error(chalk.red('❌ Failed to load environment from .envrc'));
    process.exit(1);
  }

  if (!validateEnvironment(env)) {
    console.error(chalk.red('\n❌ Environment validation failed'));
    process.exit(1);
  }

  // Step 2: Check dependencies
  console.log(chalk.blue('\n🔍 Checking dependencies...\n'));
  
  const { missing, installed } = checkDependencies();
  
  if (installed.length > 0) {
    console.log(chalk.green(`✓ Installed: ${installed.join(', ')}`));
  }
  
  if (missing.length > 0) {
    console.log(chalk.yellow(`⚠️  Missing: ${missing.join(', ')}`));
    
    const shouldInstall = await confirm({
      message: 'Install missing dependencies with Homebrew?',
      default: true,
    });
    
    if (shouldInstall) {
      console.log(chalk.blue('\n📦 Installing dependencies...\n'));
      try {
        execSync('brew bundle', { stdio: 'inherit', cwd: env.DEEPSTAGING_ORG_ROOT });
        console.log(chalk.green('\n✅ Dependencies installed\n'));
      } catch (error) {
        console.error(chalk.red('❌ Failed to install dependencies'));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Skipping dependency installation. Some features may not work.\n'));
    }
  }

  // Step 3: Install npm dependencies
  console.log(chalk.blue('📦 Installing npm dependencies...\n'));
  try {
    execSync('npm install', { stdio: 'inherit', cwd: env.DEEPSTAGING_WORKSPACE_DIR });
    console.log(chalk.green('\n✅ npm dependencies installed\n'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to install npm dependencies'));
    process.exit(1);
  }

  // Step 4: Create required directories
  console.log(chalk.blue('📁 Setting up directory structure...\n'));
  
  const dirsToCreate = [
    { path: env.DEEPSTAGING_REPOSITORIES_DIR, name: 'Repositories' },
    { path: env.DEEPSTAGING_ARTIFACTS_DIR, name: 'Artifacts' },
  ];
  
  for (const dir of dirsToCreate) {
    if (!existsSync(dir.path)) {
      try {
        execSync(`mkdir -p "${dir.path}"`, { stdio: 'inherit' });
        console.log(chalk.green(`✓ Created ${dir.name} directory: ${dir.path}`));
      } catch (error) {
        console.error(chalk.red(`❌ Failed to create ${dir.name} directory`));
        process.exit(1);
      }
    } else {
      console.log(chalk.gray(`✓ ${dir.name} directory exists: ${dir.path}`));
    }
  }
  
  // Initialize local NuGet feed
  if (!existsSync(env.DEEPSTAGING_LOCAL_NUGET_FEED)) {
    console.log(chalk.cyan(`\n  Initializing local NuGet feed...`));
    try {
      execSync(`mkdir -p "${env.DEEPSTAGING_LOCAL_NUGET_FEED}"`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ Created local NuGet feed: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to create local NuGet feed directory'));
      process.exit(1);
    }
  } else {
    console.log(chalk.gray(`✓ Local NuGet feed exists: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
  }
  
  // Add as NuGet source if not already added
  try {
    const sources = execSync('dotnet nuget list source', { encoding: 'utf-8' });
    if (!sources.includes(env.DEEPSTAGING_LOCAL_NUGET_FEED)) {
      console.log(chalk.cyan('  Adding local feed to NuGet sources...'));
      execSync(
        `dotnet nuget add source "${env.DEEPSTAGING_LOCAL_NUGET_FEED}" --name "deepstaging-local"`,
        { stdio: 'inherit' }
      );
      console.log(chalk.green('✓ Local NuGet feed added to sources'));
    } else {
      console.log(chalk.gray('✓ Local NuGet feed already in sources'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not configure NuGet source (dotnet may not be installed yet)'));
  }
  
  console.log();

  // Step 5: Build TypeScript
  console.log(chalk.blue('🔨 Building TypeScript...\n'));
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: env.DEEPSTAGING_WORKSPACE_DIR });
    console.log(chalk.green('\n✅ TypeScript built\n'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to build TypeScript'));
    process.exit(1);
  }

  // Step 6: Check GitHub authentication
  console.log(chalk.blue('🔐 Checking GitHub authentication...\n'));
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log(chalk.green('✓ GitHub CLI authenticated\n'));
  } catch {
    console.log(chalk.yellow('⚠️  GitHub CLI not authenticated'));
    console.log(chalk.cyan('   Run: gh auth login\n'));
    process.exit(1);
  }

  // Step 7: Discover and clone repositories
  console.log(chalk.blue('🔍 Discovering repositories...\n'));
  
  const githubRepos = getExistingRepos(env.DEEPSTAGING_GITHUB_ORG);
  const clonedRepos = getClonedRepos(env.DEEPSTAGING_REPOSITORIES_DIR);
  const unclonedRepos = githubRepos.filter(repo => !clonedRepos.includes(repo));

  if (clonedRepos.length > 0) {
    console.log(chalk.green(`✓ Already cloned (${clonedRepos.length}): ${clonedRepos.join(', ')}\n`));
  }

  if (unclonedRepos.length === 0) {
    console.log(chalk.green('✅ All repositories are already cloned\n'));
  } else {
    console.log(chalk.cyan(`📋 Available repositories (${unclonedRepos.length}):\n`));
    
    const reposToClone = await checkbox({
      message: 'Select repositories to clone:',
      choices: unclonedRepos.map(repo => ({ name: repo, value: repo })),
    });

    if (reposToClone.length === 0) {
      console.log(chalk.yellow('\n⚠️  No repositories selected\n'));
    } else {
      console.log(chalk.blue(`\n📥 Cloning ${reposToClone.length} repositories...\n`));
      
      for (const repo of reposToClone) {
        console.log(chalk.cyan(`  Cloning ${repo}...`));
        try {
          execSync(
            `gh repo clone ${env.DEEPSTAGING_GITHUB_ORG}/${repo} "${env.DEEPSTAGING_REPOSITORIES_DIR}/${repo}"`,
            { stdio: 'inherit' }
          );
          console.log(chalk.green(`  ✓ ${repo} cloned\n`));
        } catch (error) {
          console.error(chalk.red(`  ❌ Failed to clone ${repo}\n`));
        }
      }
    }
  }

  // Step 8: Generate script aliases
  console.log(chalk.blue('🔗 Generating script aliases...\n'));
  try {
    execSync('npm run script-aliases-generate', { 
      stdio: 'inherit', 
      cwd: env.DEEPSTAGING_WORKSPACE_DIR,
      env: { ...process.env, ...env }
    });
    console.log();
  } catch (error) {
    console.error(chalk.red('❌ Failed to generate script aliases'));
  }

  // Step 9: Configure direnv
  console.log(chalk.blue('🔧 Configuring direnv...\n'));
  try {
    execSync('direnv allow', { stdio: 'inherit', cwd: env.DEEPSTAGING_ORG_ROOT });
    console.log(chalk.green('✅ direnv configured\n'));
  } catch {
    console.log(chalk.yellow('⚠️  Could not configure direnv automatically'));
    console.log(chalk.cyan('   Run: direnv allow\n'));
  }

  // Step 10: Run environment check
  console.log(chalk.blue('🔍 Running environment check...\n'));
  try {
    execSync('tsx scripts/environment-check.ts', { 
      stdio: 'inherit', 
      cwd: env.DEEPSTAGING_WORKSPACE_DIR,
      env: { ...process.env, ...env }
    });
  } catch (error) {
    console.log(chalk.yellow('\n⚠️  Environment check found issues'));
    console.log(chalk.cyan('   Review the output above for details\n'));
  }

  // Success!
  console.log(chalk.bold.green('✨ Bootstrap complete!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.cyan('  1. Run `direnv reload` or restart your shell'));
  console.log(chalk.cyan('  2. Use workspace commands like `repositories-sync`'));
  console.log(chalk.cyan('  3. Use repo commands like `deepstaging-publish`'));
  console.log(chalk.cyan('  4. Run `environment-check` anytime to verify setup\n'));
}

main().catch((error) => {
  console.error(chalk.red('❌ Bootstrap failed:'), error instanceof Error ? error.message : error);
  process.exit(1);
});
