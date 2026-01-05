#!/usr/bin/env tsx

/**
 * Publish project to local NuGet feed
 */

import { Command } from 'commander';
import path from 'path';
import { buildProject, packProject, getProjectInfo } from './lib/dotnet.js';
import { pushToLocalFeed, getDefaultFeedPath } from './lib/nuget.js';
import { printHeader, printSuccess, printError, createSpinner } from './lib/ui.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('publish-local')
  .description('Build and publish project to local NuGet feed')
  .argument('<project-dir>', 'Directory containing the .csproj file')
  .option('--feed <path>', 'Local NuGet feed path', getDefaultFeedPath())
  .parse(process.argv);

const [projectDir] = program.args;
const options = program.opts();

async function main() {
  printHeader();
  console.log(chalk.blue('📦 Publish to Local NuGet Feed'));
  console.log(chalk.blue('='.repeat(32)));
  console.log();

  const resolvedProjectDir = path.resolve(projectDir);
  const feedPath = options.feed;

  // Get project info
  const projectInfo = await getProjectInfo(resolvedProjectDir);
  if (!projectInfo) {
    printError('No .csproj file found in directory');
    process.exit(1);
  }

  console.log(`Project: ${chalk.cyan(projectInfo.name)}`);
  console.log(`Type: ${projectInfo.type}`);
  console.log(`Target: ${projectInfo.targetFramework}`);
  console.log(`Feed: ${chalk.yellow(feedPath)}`);
  console.log();

  // Build
  const buildSpinner = createSpinner('Building project...');
  buildSpinner.start();
  try {
    await buildProject(resolvedProjectDir);
    buildSpinner.succeed('Project built');
  } catch (error: any) {
    buildSpinner.fail('Build failed');
    printError(error.message);
    process.exit(1);
  }

  // Pack
  const packSpinner = createSpinner('Creating NuGet package...');
  packSpinner.start();
  try {
    const packagePath = await packProject(resolvedProjectDir, resolvedProjectDir);
    packSpinner.succeed('Package created');

    // Push to local feed
    if (packagePath) {
      await pushToLocalFeed(packagePath, feedPath);
      printSuccess(`Published to local feed: ${feedPath}`);
    }
  } catch (error: any) {
    packSpinner.fail('Pack failed');
    printError(error.message);
    process.exit(1);
  }

  console.log();
  printSuccess('Done!');
}

main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
