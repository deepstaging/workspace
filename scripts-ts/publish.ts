#!/usr/bin/env tsx

/**
 * Publish multiple projects to local NuGet feed
 */

import { Command } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { findProjects, buildProject, packProject } from './lib/dotnet.js';
import { pushToLocalFeed, getDefaultFeedPath, clearLocalFeed } from './lib/nuget.js';
import { printHeader, printSuccess, printError, printWarning, createSpinner } from './lib/ui.js';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';

const program = new Command();

program
  .name('publish')
  .description('Build and publish all projects in a directory to local NuGet feed')
  .argument('<project-name>', 'Name of the primary project/directory to publish')
  .option('--feed <path>', 'Local NuGet feed path', getDefaultFeedPath())
  .option('--clear', 'Clear local feed before publishing')
  .option('--skip-build', 'Skip building (use existing binaries)')
  .parse(process.argv);

const [projectName] = program.args;
const options = program.opts();

async function main() {
  printHeader();
  console.log(chalk.blue('📦 Publish Projects to Local NuGet'));
  console.log(chalk.blue('='.repeat(36)));
  console.log();

  const orgRoot = path.resolve(import.meta.dirname, '..', '..');
  const projectDir = path.join(orgRoot, projectName);
  const feedPath = options.feed;

  console.log(`Organization root: ${orgRoot}`);
  console.log(`Project directory: ${projectName}`);
  console.log(`Feed: ${chalk.yellow(feedPath)}`);
  console.log();

  // Clear feed if requested
  if (options.clear) {
    const shouldClear = await confirm({
      message: 'Clear all packages from local feed?',
      default: false,
    });

    if (shouldClear) {
      await clearLocalFeed(feedPath);
      console.log();
    }
  }

  // Find all projects - look in src/ subdirectory if it exists
  const spinner = createSpinner('Scanning for .NET projects...');
  spinner.start();
  const srcDir = path.join(projectDir, 'src');
  const searchDir = await fs.access(srcDir).then(() => srcDir).catch(() => projectDir);
  const projects = await findProjects(searchDir);
  spinner.succeed(`Found ${projects.length} projects`);
  console.log();

  if (projects.length === 0) {
    printWarning('No .NET projects found');
    process.exit(0);
  }

  // Display projects
  projects.forEach((proj, index) => {
    console.log(`  ${index + 1}. ${chalk.cyan(proj.name)} (${proj.type})`);
  });
  console.log();

  // Confirm
  const shouldProceed = await confirm({
    message: `Publish ${projects.length} project(s) to local feed?`,
    default: true,
  });

  if (!shouldProceed) {
    console.log('Cancelled');
    process.exit(0);
  }

  console.log();

  // Build and publish each project
  let successCount = 0;
  let failureCount = 0;

  for (const project of projects) {
    console.log(chalk.bold(`\n📦 ${project.name}`));
    console.log('─'.repeat(50));

    try {
      // Build
      if (!options.skipBuild) {
        const buildSpinner = createSpinner('Building...');
        buildSpinner.start();
        await buildProject(project.path);
        buildSpinner.succeed('Built');
      }

      // Pack
      const packSpinner = createSpinner('Packing...');
      packSpinner.start();
      const packagePath = await packProject(project.path, project.path);
      packSpinner.succeed('Packed');

      // Push to feed
      if (packagePath) {
        await pushToLocalFeed(packagePath, feedPath);
        successCount++;
      }
    } catch (error: any) {
      printError(`Failed: ${error.message}`);
      failureCount++;
    }
  }

  // Summary
  console.log();
  console.log('═'.repeat(50));
  console.log(chalk.bold('Summary'));
  console.log('═'.repeat(50));
  console.log(`✅ Successful: ${chalk.green(successCount)}`);
  if (failureCount > 0) {
    console.log(`❌ Failed: ${chalk.red(failureCount)}`);
  }
  console.log();
  printSuccess(`Published to: ${feedPath}`);
}

main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
