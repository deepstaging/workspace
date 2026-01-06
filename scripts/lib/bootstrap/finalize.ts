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
  console.log(chalk.dim('='.repeat(80)));
  
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
    console.log(chalk.white(hint.message));
    
    if (hint.commands && hint.commands.length > 0) {
      console.log(chalk.dim('\n  To fix, run:'));
      for (const cmd of hint.commands) {
        console.log(chalk.cyan(`  ${cmd}`));
      }
    }
  }
  
  console.log();
  console.log(chalk.dim('='.repeat(80)));
  console.log();
}

export function printSuccessMessage(): void {
  console.log(chalk.bold.green('✨ Bootstrap complete!\n'));
  console.log(chalk.cyan('Next steps:'));
  
  // Detect shell and provide appropriate direnv setup instructions
  const shell = process.env.SHELL || '';
  let shellName = 'bash';
  let configFile = '~/.bashrc';
  let hookCommand = 'eval "$(direnv hook bash)"';
  
  if (shell.includes('zsh')) {
    shellName = 'zsh';
    configFile = '~/.zshrc';
    hookCommand = 'eval "$(direnv hook zsh)"';
  } else if (shell.includes('fish')) {
    shellName = 'fish';
    configFile = '~/.config/fish/config.fish';
    hookCommand = 'direnv hook fish | source';
  }
  
  // Use grep to prevent duplicates
  const safeAppendCommand = `grep -qxF '${hookCommand}' ${configFile} 2>/dev/null || echo '${hookCommand}' >> ${configFile}`;
  
  console.log(chalk.white('  1. Enable direnv shell integration (if not already done):'));
  console.log(chalk.cyan(`     ${safeAppendCommand}`));
  console.log(chalk.cyan(`     source ${configFile}`));
  console.log(chalk.white('  2. Run `direnv reload` or `cd` out and back in'));
  console.log(chalk.white('  3. Use workspace commands like `repositories-sync`'));
  console.log(chalk.white('  4. Use repo commands like `deepstaging-publish`'));
  console.log(chalk.white('  5. Run `environment-check` anytime to verify setup\n'));
}
