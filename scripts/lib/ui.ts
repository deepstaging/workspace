/**
 * Terminal UI utilities
 */

import { select, confirm, Separator } from '@inquirer/prompts';
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { RepositoryInfo } from './types.js';

export async function selectCommitStrategy(): Promise<'ai' | 'custom' | 'default'> {
  const choice = await select({
    message: 'Select commit message method:',
    choices: [
      {
        name: '🤖 Generate with AI (GitHub Copilot CLI)',
        value: 'ai',
      },
      {
        name: '✏️  Enter custom message',
        value: 'custom',
      },
      {
        name: '📅 Use default message (Sync changes from date)',
        value: 'default',
      },
    ],
    default: 'ai',
  });

  return choice as 'ai' | 'custom' | 'default';
}

export async function selectRepositories(
  repos: RepositoryInfo[]
): Promise<string[]> {
  // For now, select all that need attention
  // TODO: Add multi-select with @inquirer/checkbox when needed
  const needsAttention = repos.filter(
    r => r.hasUncommittedChanges || r.commitsAhead > 0
  );

  const confirmed = await confirm({
    message: `Push ${needsAttention.length} repository(ies)?`,
    default: true,
  });

  return confirmed ? needsAttention.map(r => r.name) : [];
}

export function displayRepositoryStatus(repos: RepositoryInfo[]): void {
  console.log('\nRepository Status:');
  console.log('═'.repeat(60));

  repos.forEach((repo, index) => {
    const num = (index + 1).toString().padStart(2);
    console.log(
      `${num}. ${repo.name} │ ${repo.branch} │ ${repo.commitCount} commits │ ${repo.statusMessage}`
    );
  });

  console.log('═'.repeat(60));
  console.log();
}

export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: {
      interval: 100,
      frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    },
  });
}

export async function scanWithProgress(
  repos: string[],
  onScan: (repoName: string, index: number, total: number) => Promise<void>
): Promise<void> {
  const spinner = createSpinner('Scanning repositories...');
  spinner.start();

  for (let i = 0; i < repos.length; i++) {
    const repoName = repos[i];
    spinner.text = `Scanning repositories... [${i + 1}/${repos.length}]\n  → ${repoName}`;
    await onScan(repoName, i, repos.length);
  }

  spinner.succeed(`Scanned ${repos.length} repositories`);
}

export function printHeader(): void {
  console.log(chalk.blue('🔄 GitHub Repository Sync'));
  console.log(chalk.blue('='.repeat(25)));
  console.log();
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function printError(message: string): void {
  console.log(chalk.red(`✗ ${message}`));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
}
