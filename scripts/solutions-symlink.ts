#!/usr/bin/env tsx

/**
 * Discover .sln and .slnx files in repositories and create symlinks in org root
 * with semantically meaningful names based on repository and location
 */

import { Command } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { printHeader, printSuccess, printError, printWarning, createSpinner } from './lib/ui.js';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { glob } from 'glob';

const program = new Command();

program
  .name('solutions-symlink')
  .description('Create symlinks to solution files in org root with semantic names')
  .option('--dry-run', 'Show what would be done without creating symlinks')
  .parse(process.argv);

const options = program.opts();

interface SolutionInfo {
  absolutePath: string;
  repositoryName: string;
  relativePath: string;
  fileName: string;
  symlinkName: string;
}

async function findSolutionFiles(repositoriesDir: string): Promise<SolutionInfo[]> {
  const solutions: SolutionInfo[] = [];
  
  // Find all .sln and .slnx files
  const solutionFiles = await glob('**/*.{sln,slnx}', {
    cwd: repositoriesDir,
    absolute: false,
    ignore: ['**/bin/**', '**/obj/**', '**/node_modules/**', '**/.git/**'],
  });

  for (const solutionFile of solutionFiles) {
    const absolutePath = path.join(repositoriesDir, solutionFile);
    const parts = solutionFile.split(path.sep);
    const repositoryName = parts[0];
    const fileName = path.basename(solutionFile, path.extname(solutionFile));
    const extension = path.extname(solutionFile);
    
    // Build semantic name: {repo}.{filename}.{ext}
    const symlinkName = `${repositoryName}.${fileName}${extension}`;
    
    solutions.push({
      absolutePath,
      repositoryName,
      relativePath: solutionFile,
      fileName: fileName + extension,
      symlinkName,
    });
  }
  
  return solutions;
}

async function cleanExistingSymlinks(orgRoot: string): Promise<number> {
  const entries = await fs.readdir(orgRoot, { withFileTypes: true });
  let cleaned = 0;
  
  for (const entry of entries) {
    if (entry.isSymbolicLink() && (entry.name.endsWith('.sln') || entry.name.endsWith('.slnx'))) {
      const symlinkPath = path.join(orgRoot, entry.name);
      await fs.unlink(symlinkPath);
      cleaned++;
      console.log(chalk.dim(`  Removed: ${entry.name}`));
    }
  }
  
  return cleaned;
}

async function main() {
  printHeader();
  console.log(chalk.blue('🔗 Create Solution Symlinks'));
  console.log(chalk.blue('='.repeat(28)));
  console.log();

  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(import.meta.dirname, '..', '..');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || path.join(orgRoot, 'repositories');

  console.log(`Organization root: ${orgRoot}`);
  console.log(`Repositories: ${repositoriesDir}`);
  console.log();

  // Always clean existing symlinks first
  const cleanSpinner = createSpinner('Cleaning existing solution symlinks...');
  cleanSpinner.start();
  const cleaned = await cleanExistingSymlinks(orgRoot);
  cleanSpinner.succeed(`Removed ${cleaned} existing symlink(s)`);
  console.log();

  // Find all solution files
  const spinner = createSpinner('Scanning for solution files...');
  spinner.start();
  const solutions = await findSolutionFiles(repositoriesDir);
  spinner.succeed(`Found ${solutions.length} solution file(s)`);
  console.log();

  if (solutions.length === 0) {
    printWarning('No solution files found');
    process.exit(0);
  }

  // Display what will be created
  console.log(chalk.bold('Solution files discovered:'));
  console.log();
  
  for (const solution of solutions) {
    console.log(chalk.green(`  ${solution.symlinkName}`));
    console.log(chalk.dim(`    → ${solution.relativePath}`));
  }
  console.log();

  // Confirm
  if (!options.dryRun) {
    const shouldProceed = await confirm({
      message: `Create ${solutions.length} symlink(s) in org root?`,
      default: true,
    });

    if (!shouldProceed) {
      console.log('Cancelled');
      process.exit(0);
    }
    console.log();
  }

  // Create symlinks
  if (options.dryRun) {
    printSuccess('Dry run complete - no changes made');
  } else {
    let created = 0;
    let skipped = 0;

    for (const solution of solutions) {
      const symlinkPath = path.join(orgRoot, solution.symlinkName);
      
      try {
        // Check if symlink already exists
        try {
          await fs.lstat(symlinkPath);
          console.log(chalk.yellow(`  ⚠  Skipped (exists): ${solution.symlinkName}`));
          skipped++;
          continue;
        } catch {
          // Doesn't exist, proceed
        }

        // Create symlink
        await fs.symlink(solution.absolutePath, symlinkPath);
        console.log(chalk.green(`  ✓  Created: ${solution.symlinkName}`));
        created++;
      } catch (error: any) {
        printError(`Failed to create ${solution.symlinkName}: ${error.message}`);
      }
    }

    console.log();
    console.log('═'.repeat(50));
    console.log(chalk.bold('Summary'));
    console.log('═'.repeat(50));
    console.log(`✅ Created: ${chalk.green(created)}`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${chalk.yellow(skipped)}`);
    }
    console.log();
    printSuccess(`Symlinks created in: ${orgRoot}`);
  }
}

main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
