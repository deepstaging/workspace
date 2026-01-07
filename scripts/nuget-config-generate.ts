#!/usr/bin/env tsx
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { scanRepositoriesQuick } from './lib/git.js';

async function main() {
  console.log(chalk.blue('📝 NuGet.Config Generator\n'));

  // Get environment variables
  const localFeed = process.env.DEEPSTAGING_LOCAL_NUGET_FEED;
  const reposDir = process.env.DEEPSTAGING_REPOSITORIES_DIR;

  if (!localFeed) {
    console.error(chalk.red('❌ DEEPSTAGING_LOCAL_NUGET_FEED environment variable not set'));
    process.exit(1);
  }

  if (!reposDir) {
    console.error(chalk.red('❌ DEEPSTAGING_REPOSITORIES_DIR environment variable not set'));
    process.exit(1);
  }

  // Get all repositories (quick scan - no git operations)
  const repositories = await scanRepositoriesQuick(reposDir);
  
  if (repositories.length === 0) {
    console.log(chalk.yellow('⚠ No repositories found'));
    return;
  }

  // Let user select repository
  const repoName = await select({
    message: 'Select repository:',
    choices: [
      { name: 'All repositories', value: '__all__' },
      ...repositories.map(repo => ({ name: repo.name, value: repo.name }))
    ]
  });

  const targetRepos = repoName === '__all__' 
    ? repositories 
    : repositories.filter(r => r.name === repoName);

  // Generate NuGet.Config content
  const feedName = 'Deepstaging-Local';
  const nugetConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="${feedName}" value="${localFeed}" />
  </packageSources>
</configuration>
`;

  // Write to selected repositories
  let successCount = 0;
  let errorCount = 0;

  for (const repo of targetRepos) {
    const configPath = resolve(repo.path, 'NuGet.Config');
    
    try {
      await writeFile(configPath, nugetConfig, 'utf-8');
      console.log(chalk.green(`✓ ${repo.name}/NuGet.Config`));
      successCount++;
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red(`✗ ${repo.name}: ${err.message}`));
      errorCount++;
    }
  }

  console.log();
  console.log(chalk.blue('Configuration:'));
  console.log(chalk.gray(`  Feed Name: ${feedName}`));
  console.log(chalk.gray(`  Feed Path: ${localFeed}`));
  console.log();
  console.log(chalk.green(`✓ Generated ${successCount} NuGet.Config file(s)`));
  
  if (errorCount > 0) {
    console.log(chalk.yellow(`⚠ ${errorCount} error(s)`));
  }
}

main().catch(error => {
  console.error(chalk.red('❌ Failed:'), error.message);
  process.exit(1);
});

