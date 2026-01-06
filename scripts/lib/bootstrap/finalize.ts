/**
 * Final setup steps
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import { DeepstagingEnv, BootstrapContext } from './types.js';

export function generateScriptAliases(env: DeepstagingEnv): void {
  console.log(chalk.blue('🔗 Generating script aliases...\n'));
  execSync('npm run script-aliases-generate', {
    stdio: 'inherit',
    cwd: env.DEEPSTAGING_WORKSPACE_DIR,
    env: { ...process.env, ...env }
  });
  console.log();
}

export function configureDirenv(orgRoot: string): void {
  console.log(chalk.blue('🔧 Configuring direnv...\n'));
  try {
    execSync('direnv allow', { stdio: 'inherit', cwd: orgRoot });
    console.log(chalk.green('✅ direnv configured\n'));
  } catch {
    console.log(chalk.yellow('⚠️  Could not configure direnv automatically'));
    console.log(chalk.cyan('   Run: direnv allow\n'));
  }
}

export function runEnvironmentCheck(env: DeepstagingEnv): void {
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
}

export function displayHints(ctx: BootstrapContext): void {
  if (ctx.hints.length === 0) {
    return;
  }
  
  console.log(chalk.bold.yellow('\n⚠️  Important Notes:\n'));
  console.log(chalk.gray('='.repeat(80)));
  
  for (const hint of ctx.hints) {
    console.log();
    
    let icon = '';
    let titleColor = chalk.white;
    
    switch (hint.type) {
      case 'info':
        icon = chalk.blue('ℹ');
        titleColor = chalk.blue;
        break;
      case 'warning':
        icon = chalk.yellow('⚠');
        titleColor = chalk.yellow;
        break;
      case 'action':
        icon = chalk.cyan('→');
        titleColor = chalk.cyan;
        break;
    }
    
    console.log(`${icon} ${titleColor.bold(hint.title)}`);
    console.log(chalk.gray(hint.message));
    
    if (hint.commands && hint.commands.length > 0) {
      console.log(chalk.gray('\n  To fix, run:'));
      for (const cmd of hint.commands) {
        console.log(chalk.cyan(`  ${cmd}`));
      }
    }
  }
  
  console.log();
  console.log(chalk.gray('='.repeat(80)));
  console.log();
}

export function printSuccessMessage(): void {
  console.log(chalk.bold.green('✨ Bootstrap complete!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.cyan('  1. Run `direnv reload` or restart your shell'));
  console.log(chalk.cyan('  2. Use workspace commands like `repositories-sync`'));
  console.log(chalk.cyan('  3. Use repo commands like `deepstaging-publish`'));
  console.log(chalk.cyan('  4. Run `environment-check` anytime to verify setup\n'));
}
