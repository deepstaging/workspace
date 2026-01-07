/**
 * Directory structure setup
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, cpSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { DeepstagingEnv, BootstrapContext } from './types.js';

export function createDirectoryStructure(env: DeepstagingEnv, ctx: BootstrapContext): void {
  console.log(chalk.blue('📁 Setting up directory structure...\n'));

  const dirsToCreate = [
    { path: env.DEEPSTAGING_REPOSITORIES_DIR, name: 'Repositories' },
    { path: env.DEEPSTAGING_ARTIFACTS_DIR, name: 'Artifacts' },
  ];

  for (const dir of dirsToCreate) {
    if (!existsSync(dir.path)) {
      execSync(`mkdir -p "${dir.path}"`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ Created ${dir.name} directory: ${dir.path}`));
    } else {
      console.log(chalk.gray(`✓ ${dir.name} directory exists: ${dir.path}`));
    }
  }

  initializeNuGetFeed(env, ctx);
  setupDotnetToolManifest(env);
  copyAgentDirectories(env);
  console.log();
}

function initializeNuGetFeed(env: DeepstagingEnv, ctx: BootstrapContext): void {
  if (!existsSync(env.DEEPSTAGING_LOCAL_NUGET_FEED)) {
    console.log(chalk.cyan(`\n  Initializing local NuGet feed...`));
    execSync(`mkdir -p "${env.DEEPSTAGING_LOCAL_NUGET_FEED}"`, { stdio: 'inherit' });
    console.log(chalk.green(`✓ Created local NuGet feed: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
  } else {
    console.log(chalk.gray(`✓ Local NuGet feed exists: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`));
  }

  // Add as NuGet source if not already added
  try {
    const sources = execSync('dotnet nuget list source', { encoding: 'utf-8' });
    const sourceName = 'deepstaging-local';
    
    // Check if source name exists
    const sourceNameExists = sources.includes(`${sourceName} [`);
    
    if (!sourceNameExists) {
      // Source doesn't exist, add it
      console.log(chalk.cyan('  Adding local feed to NuGet sources...'));
      execSync(
        `dotnet nuget add source "${env.DEEPSTAGING_LOCAL_NUGET_FEED}" --name "${sourceName}"`,
        { stdio: 'inherit' }
      );
      console.log(chalk.green('✓ Local NuGet feed added to sources'));
    } else {
      // Source name exists, check if path matches
      const sourcePathMatches = sources.includes(env.DEEPSTAGING_LOCAL_NUGET_FEED);
      
      if (sourcePathMatches) {
        console.log(chalk.gray('✓ Local NuGet feed already in sources'));
      } else {
        // Extract the existing path from the sources list
        const lines = sources.split('\n');
        let existingPath = '';
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(sourceName)) {
            // The path is typically on the next line or after "Enabled" marker
            const nextLines = lines.slice(i + 1, i + 3);
            for (const line of nextLines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('[') && trimmed !== 'Enabled' && trimmed !== 'Disabled') {
                existingPath = trimmed;
                break;
              }
            }
            break;
          }
        }
        
        console.log(chalk.yellow(`⚠️  NuGet source "${sourceName}" exists with different path`));
        
        // Add hint to be shown at the end
        ctx.addHint({
          type: 'action',
          title: 'NuGet Source Path Mismatch',
          message: `The NuGet source "${sourceName}" points to a different location:\n` +
                   `   Current: ${existingPath}\n` +
                   `   Desired: ${env.DEEPSTAGING_LOCAL_NUGET_FEED}`,
          commands: [
            `dotnet nuget remove source ${sourceName}`,
            `dotnet nuget add source "${env.DEEPSTAGING_LOCAL_NUGET_FEED}" --name "${sourceName}"`
          ]
        });
      }
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not configure NuGet source (dotnet may not be installed yet)'));
  }
}

function setupDotnetToolManifest(env: DeepstagingEnv): void {
  const configDir = join(env.DEEPSTAGING_ORG_ROOT, '.config');
  const manifestPath = join(configDir, 'dotnet-tools.json');
  const templatePath = join(env.DEEPSTAGING_WORKSPACE_DIR, '.config', 'dotnet-tools.json.template');
  
  if (existsSync(manifestPath)) {
    console.log(chalk.gray('✓ Dotnet tool manifest already exists'));
    return;
  }
  
  if (!existsSync(templatePath)) {
    console.log(chalk.yellow('⚠️  Dotnet tool manifest template not found, skipping'));
    return;
  }
  
  console.log(chalk.cyan('\n  Setting up dotnet tool manifest...'));
  
  // Create .config directory if it doesn't exist
  if (!existsSync(configDir)) {
    execSync(`mkdir -p "${configDir}"`, { stdio: 'inherit' });
  }
  
  // Copy template
  cpSync(templatePath, manifestPath);
  console.log(chalk.green('  ✓ Created dotnet-tools.json at org root'));
  console.log(chalk.dim(`     Run 'dotnet tool restore' to install tools`));
}

function copyAgentDirectories(env: DeepstagingEnv): void {
  const templatesDir = join(env.DEEPSTAGING_WORKSPACE_DIR, 'templates', 'agent-directories');
  
  if (!existsSync(templatesDir)) {
    console.log(chalk.yellow('⚠️  Agent directory templates not found, skipping'));
    return;
  }

  console.log(chalk.cyan('\n  Setting up agent directories...'));
  
  const agentDirs = readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const agentDir of agentDirs) {
    const targetPath = join(env.DEEPSTAGING_ORG_ROOT, agentDir);
    
    if (!existsSync(targetPath)) {
      const sourcePath = join(templatesDir, agentDir);
      cpSync(sourcePath, targetPath, { recursive: true });
      console.log(chalk.green(`  ✓ Created ${agentDir} directory`));
    } else {
      console.log(chalk.gray(`  ✓ ${agentDir} already exists`));
    }
  }
}
