#!/usr/bin/env tsx

/**
 * Discover which projects depend on a given project
 */

import { Command } from 'commander';
import path from 'path';
import { findProjects, findDependents } from './lib/dotnet.js';
import { printHeader, printSuccess, printError } from './lib/ui.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('discover-dependents')
  .description('Find which projects depend on a given project')
  .argument('<project-name>', 'Name of the project to search for')
  .argument('[search-dir]', 'Directory to search in', '.')
  .parse(process.argv);

const [projectName, searchDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || '.'] = program.args;

async function main() {
  printHeader();
  console.log(chalk.blue('🔍 Discovering Project Dependencies'));
  console.log(chalk.blue('='.repeat(37)));
  console.log();

  const resolvedDir = path.resolve(searchDir);
  console.log(`Searching for dependents of: ${chalk.yellow(projectName)}`);
  console.log(`Search directory: ${resolvedDir}`);
  console.log();

  // Find all projects
  console.log('Scanning projects...');
  const projects = await findProjects(resolvedDir);
  console.log(`Found ${projects.length} .NET projects`);
  console.log();

  // Find dependents
  const dependents = await findDependents(projectName, resolvedDir);

  if (dependents.length === 0) {
    console.log(chalk.yellow('ℹ️  No projects depend on this project'));
    process.exit(0);
  }

  printSuccess(`Found ${dependents.length} dependent(s):`);
  console.log();

  dependents.forEach((dep, index) => {
    console.log(`  ${index + 1}. ${chalk.cyan(dep)}`);
  });

  console.log();
  console.log(chalk.dim('These projects reference the specified project.'));
}

main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
