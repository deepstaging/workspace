#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Environment Check - Verify Deepstaging workspace environment
 * 
 * This script performs read-only checks to validate the workspace environment
 * is configured correctly. It does not modify anything.
 * 
 * Usage:
 *   tsx environment-check.ts
 *   environment-check  (via PATH after direnv)
 */

import chalk from 'chalk';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

interface CheckResult {
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

const checks: CheckResult[] = [];

function addCheck(category: string, name: string, status: 'pass' | 'warn' | 'fail', message: string, details?: string) {
  checks.push({ category, name, status, message, details });
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getCommandVersion(cmd: string, args: string = '--version'): string {
  try {
    const output = execSync(`${cmd} ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return output.split('\n')[0].trim();
  } catch {
    return 'unknown';
  }
}

console.log(chalk.bold.cyan('\n🔍 Deepstaging Environment Check\n'));

// ============================================================================
// 1. Environment Variables
// ============================================================================

const requiredEnvVars = [
  'DEEPSTAGING_ORG_ROOT',
  'DEEPSTAGING_ORG_NAME',
  'DEEPSTAGING_WORKSPACE_DIR',
  'DEEPSTAGING_REPOSITORIES_DIR',
  'DEEPSTAGING_LOCAL_NUGET_FEED',
  'DEEPSTAGING_GITHUB_ORG',
];

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    addCheck(
      'Environment Variables',
      envVar,
      'pass',
      value
    );
  } else {
    addCheck(
      'Environment Variables',
      envVar,
      'fail',
      'Not set',
      'Run: cd <org-root> && direnv allow'
    );
  }
}

// ============================================================================
// 2. Directory Structure
// ============================================================================

const orgRoot = process.env.DEEPSTAGING_ORG_ROOT;
const workspaceDir = process.env.DEEPSTAGING_WORKSPACE_DIR;
const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR;
const localFeed = process.env.DEEPSTAGING_LOCAL_NUGET_FEED;

if (orgRoot) {
  if (existsSync(orgRoot)) {
    addCheck('Directory Structure', 'Org Root', 'pass', orgRoot);
  } else {
    addCheck('Directory Structure', 'Org Root', 'fail', 'Directory does not exist', orgRoot);
  }
}

if (workspaceDir) {
  if (existsSync(workspaceDir)) {
    const scriptsDir = join(workspaceDir, 'scripts');
    if (existsSync(scriptsDir)) {
      addCheck('Directory Structure', 'Workspace Scripts', 'pass', scriptsDir);
    } else {
      addCheck('Directory Structure', 'Workspace Scripts', 'fail', 'scripts/ directory not found', scriptsDir);
    }
  } else {
    addCheck('Directory Structure', 'Workspace Dir', 'fail', 'Directory does not exist', workspaceDir);
  }
}

if (repositoriesDir) {
  if (existsSync(repositoriesDir)) {
    try {
      const repos = statSync(repositoriesDir).isDirectory() ? 'Found' : 'Not a directory';
      addCheck('Directory Structure', 'Repositories Dir', 'pass', repositoriesDir);
    } catch {
      addCheck('Directory Structure', 'Repositories Dir', 'warn', 'Cannot access directory', repositoriesDir);
    }
  } else {
    addCheck('Directory Structure', 'Repositories Dir', 'warn', 'Directory does not exist (will be created)', repositoriesDir);
  }
}

if (localFeed) {
  if (existsSync(localFeed)) {
    addCheck('Directory Structure', 'Local NuGet Feed', 'pass', localFeed);
  } else {
    addCheck('Directory Structure', 'Local NuGet Feed', 'warn', 'Directory does not exist (will be created)', localFeed);
  }
}

// Check for .envrc in org root
if (orgRoot) {
  const envrcPath = join(orgRoot, '.envrc');
  if (existsSync(envrcPath)) {
    addCheck('Directory Structure', '.envrc File', 'pass', envrcPath);
  } else {
    addCheck('Directory Structure', '.envrc File', 'fail', 'Not found in org root', 'Run bootstrap.sh to copy from workspace');
  }
}

// ============================================================================
// 3. Required Tools
// ============================================================================

const requiredTools = [
  { cmd: 'node', versionArgs: '--version' },
  { cmd: 'npm', versionArgs: '--version' },
  { cmd: 'tsx', versionArgs: '--version' },
  { cmd: 'dotnet', versionArgs: '--version' },
  { cmd: 'gh', versionArgs: '--version' },
  { cmd: 'git', versionArgs: '--version' },
];

for (const tool of requiredTools) {
  if (checkCommand(tool.cmd)) {
    const version = getCommandVersion(tool.cmd, tool.versionArgs);
    addCheck('Required Tools', tool.cmd, 'pass', version);
  } else {
    addCheck('Required Tools', tool.cmd, 'fail', 'Not found in PATH', 'Install via Homebrew or package manager');
  }
}

// ============================================================================
// 4. Optional Tools
// ============================================================================

const optionalTools = [
  { cmd: 'direnv', versionArgs: 'version' },
  { cmd: 'jq', versionArgs: '--version' },
  { cmd: 'ripgrep', versionArgs: '--version', displayCmd: 'rg' },
  { cmd: 'fzf', versionArgs: '--version' },
  { cmd: 'prek', versionArgs: '--version' },
];

for (const tool of optionalTools) {
  const cmdToCheck = tool.displayCmd || tool.cmd;
  if (checkCommand(cmdToCheck)) {
    const version = getCommandVersion(cmdToCheck, tool.versionArgs);
    addCheck('Optional Tools', tool.cmd, 'pass', version);
  } else {
    addCheck('Optional Tools', tool.cmd, 'warn', 'Not found (recommended)', 'Install via: brew install ' + tool.cmd);
  }
}

// ============================================================================
// 5. Direnv Status
// ============================================================================

if (checkCommand('direnv')) {
  // Check if direnv hook is loaded
  // Check for both DIRENV_DIR and a function that direnv creates
  const direnvActive = process.env.DIRENV_DIR || 
                       (typeof process.env.DIRENV_WATCHES !== 'undefined');
  
  if (direnvActive) {
    addCheck('Direnv', 'direnv hook', 'pass', 'Active in current shell');
  } else {
    // Detect shell and provide appropriate instructions
    const shell = process.env.SHELL || '';
    let shellName = 'bash';
    let configFile = '~/.bashrc';
    let configFilePath = process.env.HOME + '/.bashrc';
    
    if (shell.includes('zsh')) {
      shellName = 'zsh';
      configFile = '~/.zshrc';
      configFilePath = process.env.HOME + '/.zshrc';
    } else if (shell.includes('fish')) {
      shellName = 'fish';
      configFile = '~/.config/fish/config.fish';
      configFilePath = process.env.HOME + '/.config/fish/config.fish';
    }
    
    const hookCommand = shellName === 'fish' 
      ? `direnv hook fish | source`
      : `eval "$(direnv hook ${shellName})"`;
    
    // Check if hook is already in config file
    let alreadyConfigured = false;
    try {
      const configContent = require('fs').readFileSync(configFilePath, 'utf8');
      alreadyConfigured = configContent.includes(`direnv hook ${shellName}`);
    } catch {
      // File doesn't exist or can't be read
    }
    
    if (alreadyConfigured) {
      addCheck('Direnv', 'direnv hook', 'warn', 'Configured but not active', 
        `Restart your shell or run: source ${configFile}`);
    } else {
      // Use grep to avoid duplicates
      const safeAppendCommand = `grep -qxF '${hookCommand}' ${configFile} 2>/dev/null || echo '${hookCommand}' >> ${configFile}`;
      addCheck('Direnv', 'direnv hook', 'warn', 'Not configured', 
        `Run: ${safeAppendCommand} && source ${configFile}`);
    }
  }
  
  // Check if current directory is allowed
  if (orgRoot && existsSync(join(orgRoot, '.envrc'))) {
    if (process.env.DEEPSTAGING_ORG_ROOT) {
      addCheck('Direnv', 'direnv allowed', 'pass', 'Environment loaded');
    } else {
      addCheck('Direnv', 'direnv allowed', 'fail', 'Not allowed', 'Run: cd ' + orgRoot + ' && direnv allow');
    }
  }
} else {
  addCheck('Direnv', 'direnv', 'warn', 'Not installed', 'Automatic environment loading disabled');
}

// ============================================================================
// 6. PATH Configuration
// ============================================================================

const pathDirs = process.env.PATH?.split(':') || [];

if (workspaceDir) {
  const scriptsInPath = pathDirs.some(p => p.includes(join(workspaceDir, 'scripts')));
  if (scriptsInPath) {
    addCheck('PATH', 'Workspace Scripts in PATH', 'pass', 'Workspace automation available');
  } else {
    addCheck('PATH', 'Workspace Scripts in PATH', 'warn', 'Not in PATH', 'Check direnv configuration');
  }
  
  const nodeModulesInPath = pathDirs.some(p => p.includes(join(workspaceDir, 'node_modules', '.bin')));
  if (nodeModulesInPath) {
    addCheck('PATH', 'Node Modules in PATH', 'pass', 'tsx and tools available');
  } else {
    addCheck('PATH', 'Node Modules in PATH', 'warn', 'Not in PATH', 'Check direnv configuration');
  }
}

if (orgRoot) {
  const aliasesInPath = pathDirs.some(p => p.includes(join(orgRoot, '.direnv', 'bin')));
  if (aliasesInPath) {
    addCheck('PATH', 'Script Aliases in PATH', 'pass', 'Repository script commands available');
  } else {
    addCheck('PATH', 'Script Aliases in PATH', 'warn', 'Not in PATH', 'Run: refresh');
  }
}

// ============================================================================
// Print Results
// ============================================================================

console.log(chalk.bold('\n' + '='.repeat(80)));
console.log(chalk.bold('Results:\n'));

let passCount = 0;
let warnCount = 0;
let failCount = 0;

// Group checks by category
const categorizedChecks = new Map<string, CheckResult[]>();
for (const check of checks) {
  if (!categorizedChecks.has(check.category)) {
    categorizedChecks.set(check.category, []);
  }
  categorizedChecks.get(check.category)!.push(check);
}

// Print checks grouped by category
for (const [category, categoryChecks] of categorizedChecks) {
  console.log(chalk.bold.cyan(`\n${category}:`));
  
  for (const check of categoryChecks) {
    let icon = '';
    let color = chalk.white;
    
    switch (check.status) {
      case 'pass':
        icon = chalk.green('✓');
        color = chalk.green;
        passCount++;
        break;
      case 'warn':
        icon = chalk.yellow('⚠');
        color = chalk.yellow;
        warnCount++;
        break;
      case 'fail':
        icon = chalk.red('✗');
        color = chalk.red;
        failCount++;
        break;
    }
    
    console.log(`  ${icon} ${color.bold(check.name)}: ${color(check.message)}`);
    if (check.details) {
      console.log(`    ${chalk.white('→ ' + check.details)}`);
    }
  }
}

// ============================================================================
// Summary
// ============================================================================

console.log(chalk.bold('\n' + '='.repeat(80)));
console.log(chalk.bold('Summary:\n'));

console.log(`  ${chalk.green('✓ Passed:')} ${passCount}`);
console.log(`  ${chalk.yellow('⚠ Warnings:')} ${warnCount}`);
console.log(`  ${chalk.red('✗ Failed:')} ${failCount}`);

console.log();

if (failCount > 0) {
  console.log(chalk.red.bold('❌ Environment has critical issues that need to be fixed.\n'));
  process.exit(1);
} else if (warnCount > 0) {
  console.log(chalk.yellow.bold('⚠️  Environment is functional but has recommendations.\n'));
  process.exit(0);
} else {
  console.log(chalk.green.bold('✅ Environment is configured correctly!\n'));
  process.exit(0);
}
