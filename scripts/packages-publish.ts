#!/usr/bin/env tsx

/**
 * Publish multiple projects to local NuGet feed
 */

import { Command } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { findProjects, buildProject, packProject, sortProjectsByDependencies } from './lib/dotnet.js';
import { pushToLocalFeed, getDefaultFeedPath, clearLocalFeed } from './lib/nuget.js';
import { printHeader, printSuccess, printError, printWarning, createSpinner } from './lib/ui.js';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';

const execAsync = promisify(exec);

async function updateDirectoryPackagesProps(
  repositoriesDir: string,
  publishedPackages: string[],
  versionSuffix: string
): Promise<void> {
  // Find all Directory.Packages.props files
  const { stdout } = await execAsync(
    `find "${repositoriesDir}" -name "Directory.Packages.props" -type f`,
    { encoding: 'utf8' }
  );
  
  const propsFiles = stdout.trim().split('\n').filter(Boolean);
  
  if (propsFiles.length === 0) {
    console.log(chalk.yellow('  No Directory.Packages.props files found'));
    return;
  }

  // Calculate the full version string (e.g., "1.0.0-dev-20260107084609")
  const fullVersion = `1.0.0-${versionSuffix}`;

  for (const propsFile of propsFiles) {
    let content = await fs.readFile(propsFile, 'utf8');
    let updated = false;

    for (const packageName of publishedPackages) {
      // Match PackageVersion with Include="PackageName" and update Version attribute
      const regex = new RegExp(
        `(<PackageVersion\\s+Include="${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+Version=")[^"]+("\\s*/>)`,
        'g'
      );
      
      const newContent = content.replace(regex, `$1${fullVersion}$2`);
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    }

    if (updated) {
      await fs.writeFile(propsFile, content, 'utf8');
      const relativePath = path.relative(repositoriesDir, propsFile);
      console.log(chalk.green(`  ✓ ${relativePath}`));
    }
  }
}

const program = new Command();

program
  .name('publish')
  .description('Build and publish all projects in a directory to local NuGet feed')
  .argument('<project-name>', 'Name of the primary project/directory to publish')
  .option('--feed <path>', 'Local NuGet feed path', getDefaultFeedPath())
  .option('--version-suffix <suffix>', 'Version suffix (e.g., "dev", "alpha")', 'dev')
  .option('--configuration <config>', 'Build configuration', 'Release')
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

  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(import.meta.dirname, '..', '..');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || path.join(orgRoot, 'repositories');
  const projectDir = path.join(repositoriesDir, projectName);
  const feedPath = options.feed;
  
  // Add human-readable sortable timestamp after version suffix
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
  const versionSuffix = `${options.versionSuffix}-${timestamp}`;

  console.log(`Organization root: ${orgRoot}`);
  console.log(`Project directory: ${projectName}`);
  console.log(`Version suffix: ${chalk.yellow(versionSuffix)}`);
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
  const foundProjects = await findProjects(searchDir);
  
  // Sort projects by dependencies to ensure correct build order
  const projects = await sortProjectsByDependencies(foundProjects);
  spinner.succeed(`Found ${projects.length} projects (sorted by dependencies)`);
  console.log();

  if (projects.length === 0) {
    printWarning('No .NET projects found');
    process.exit(0);
  }

  // Display projects
  projects.forEach((proj, index) => {
    const displayName = proj.packageId || proj.name;
    console.log(`  ${index + 1}. ${chalk.cyan(displayName)} (${proj.type})`);
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
  const publishedPackages: string[] = [];

  for (const project of projects) {
    const displayName = project.packageId || project.name;
    console.log(chalk.bold(`\n📦 ${displayName}`));
    console.log('─'.repeat(50));

    try {
      // Build
      if (!options.skipBuild) {
        const buildSpinner = createSpinner('Building...');
        buildSpinner.start();
        await buildProject(project.path, options.configuration);
        buildSpinner.succeed('Built');
      }

      // Pack
      const packSpinner = createSpinner('Packing...');
      packSpinner.start();
      // Pack directly to feed directory
      const packagePath = await packProject(project.path, feedPath, versionSuffix, !options.skipBuild, options.configuration);
      packSpinner.succeed('Packed to feed');

      if (packagePath) {
        successCount++;
        publishedPackages.push(displayName);
      }
    } catch (error: any) {
      printError(`Failed: ${error.message}`);
      failureCount++;
    }
  }

  // Update Directory.Packages.props files with published versions
  if (publishedPackages.length > 0) {
    console.log();
    console.log(chalk.bold('📝 Updating Directory.Packages.props files...'));
    console.log('─'.repeat(50));
    await updateDirectoryPackagesProps(repositoriesDir, publishedPackages, versionSuffix);
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
