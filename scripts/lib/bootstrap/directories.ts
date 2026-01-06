/**
 * Directory structure setup
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { DeepstagingEnv } from './types.js';

export function createDirectoryStructure(env: DeepstagingEnv): void {
  console.log(chalk.blue('📁 Setting up directory structure...\n'));

  const dirsToCreate = [
    { path: env.DEEPSTAGING_REPOSITORIES_DIR, name: 'Repositories' },
    { path: env.DEEPSTAGING_ARTIFACTS_DIR, name: 'Artifacts' },
  ];

  for (const dir of dirsToCreate) {
    if (!existsSync(dir.path)) {
      execSync(`mkdir -p "${dir.path}"`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ Created ${dir.name} directory: ${dir.path}`));
    } else {
      console.log(chalk.gray(`✓ ${dir.name} directory exists: ${dir.path}`));
    }
  }

  initializeNuGetFeed(env);
  console.log();
}

function initializeNuGetFeed(env: DeepstagingEnv): void {
  if (!existsSync(env.DEEPSTAGING_LOCAL_NUGET_FEED)) {
    console.log(chalk.cyan(`\n  Initializing local NuGet feed...`));
    execSync(`mkdir -p "${env.DEEPSTAGING_LOCAL_NUGET_FEED}"`, { stdio: 'inherit' });
    console.log(chalk.green(`✓ Created local NuGet feed: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
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
}
