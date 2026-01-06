#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { select, input, checkbox } from '@inquirer/prompts';
import ora from 'ora';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DotnetTemplate {
  templateName: string;
  shortName: string;
  language: string;
  tags: string;
}

interface CreateRepositoryOptions {
  template?: string;
  name?: string;
  noGit?: boolean;
  withDocs?: boolean;
  noSample?: boolean;
}

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function pascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function discoverTemplates(): DotnetTemplate[] {
  const spinner = ora('Discovering installed templates...').start();
  
  try {
    // Just use basic list format - it's more reliable across versions
    const output = execSync('dotnet new list', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = output.split('\n').filter(line => line.trim());
    const templates: DotnetTemplate[] = [];

    // Find the header line to know column positions
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Template Name') && lines[i].includes('Short Name')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      spinner.fail('Could not parse template list');
      return [];
    }

    // Parse templates (skip header and separator line)
    for (let i = headerIndex + 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('-')) continue;

      // Parse columns by splitting on multiple spaces
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 3) {
        const templateName = parts[0]?.trim() || '';
        const shortName = parts[1]?.trim() || '';
        const language = parts[2]?.trim() || '';
        const tags = parts[3]?.trim() || '';

        // Filter to C# project templates only (exclude item templates)
        if (language.includes('C#') && templateName && shortName) {
          templates.push({ templateName, shortName, language, tags });
        }
      }
    }

    spinner.succeed(`Found ${chalk.cyan(templates.length)} C# project templates`);
    
    // Sort: Deepstaging templates first (by tag), then everything else alphabetically
    templates.sort((a, b) => {
      const aIsDeepstaging = a.tags.toLowerCase().includes('deepstaging');
      const bIsDeepstaging = b.tags.toLowerCase().includes('deepstaging');
      
      if (aIsDeepstaging && !bIsDeepstaging) return -1;
      if (!aIsDeepstaging && bIsDeepstaging) return 1;
      
      // Both same category, sort by template name
      return a.templateName.localeCompare(b.templateName);
    });
    
    return templates;
  } catch (error) {
    spinner.fail('Failed to discover templates');
    throw error;
  }
}

async function promptForTemplate(templates: DotnetTemplate[]): Promise<string> {
  // Create searchable choices
  const choices = templates.map(t => {
    const isDeepstaging = t.tags.toLowerCase().includes('deepstaging');
    const prefix = isDeepstaging ? '⭐' : '  ';
    
    return {
      name: `${prefix} ${t.shortName}`,
      value: t.shortName,
      description: t.templateName
    };
  });

  const template = await select({
    message: 'Choose a template (type to filter):',
    choices: choices as any,
    pageSize: 15,
    loop: false
  });

  return template as string;
}

async function promptForName(): Promise<string> {
  const name = await input({
    message: 'Repository name (PascalCase):',
    validate: (input: string) => {
      if (!input.trim()) return 'Name is required';
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(input.trim())) {
        return 'Must be PascalCase (e.g., MyAwesomeTool)';
      }
      return true;
    }
  });

  return name.trim();
}

async function promptForOptions(): Promise<{ withDocs: boolean; noSample: boolean }> {
  const options = await checkbox({
    message: 'Template options:',
    choices: [
      { name: 'Include DocFX documentation site', value: 'withDocs', checked: false },
      { name: 'Exclude sample consumer project', value: 'noSample', checked: false }
    ]
  });

  return {
    withDocs: options.includes('withDocs'),
    noSample: options.includes('noSample')
  };
}

async function createRepository(options: CreateRepositoryOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 Create Repository\n'));

  // 1. Discover templates if not specified
  const templates = discoverTemplates();
  if (templates.length === 0) {
    console.log(chalk.yellow('\n⚠️  No templates found. Install templates first:'));
    console.log(chalk.dim('   dotnet new install Deepstaging.Templates'));
    process.exit(1);
  }

  if (!options.template) {
    options.template = await promptForTemplate(templates);
  }

  // 2. Get repository name if not provided
  if (!options.name) {
    options.name = await promptForName();
  }

  // 3. Get template options if not provided and not already specified via CLI
  if (options.withDocs === undefined && options.noSample === undefined) {
    const templateOptions = await promptForOptions();
    options.withDocs = templateOptions.withDocs;
    options.noSample = templateOptions.noSample;
  } else {
    // Set defaults for undefined options
    options.withDocs = options.withDocs ?? false;
    options.noSample = options.noSample ?? false;
  }

  // 4. Calculate paths
  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(__dirname, '../..');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || path.join(orgRoot, 'repositories');
  const repoName = options.name;
  const repoDirName = kebabCase(repoName);
  const repoDir = path.join(repositoriesDir, repoDirName);

  console.log(chalk.dim(`\n📁 Target: ${repoDir}\n`));

  // 5. Check if directory exists
  if (fs.existsSync(repoDir)) {
    console.log(chalk.red(`❌ Directory already exists: ${repoDir}`));
    process.exit(1);
  }

  // 6. Build dotnet new command
  let command = `dotnet new ${options.template} -n ${repoName} -o "${repoDir}"`;
  
  // Add NuGetFeedName parameter for deepstaging templates
  const orgName = process.env.DEEPSTAGING_LOCAL_NUGET_FEED_NAME || 
                  process.env.DEEPSTAGING_GITHUB_ORG || 
                  'deepstaging';
  if (options.template?.includes('deepstaging')) {
    command += ` -Nu ${orgName}`;  // -Nu flag for NuGetFeedName
  }
  
  // Add template-specific options (using Deepstaging template conventions)
  if (options.noSample !== undefined) {
    command += ` -I ${!options.noSample}`;  // -I flag: true=include, false=exclude
  }
  if (options.withDocs) {
    command += ' -In true';  // -In flag for IncludeDocs
  }

  // 7. Execute template
  const spinner = ora(`Creating repository from template ${chalk.cyan(options.template)}...`).start();
  
  try {
    execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    spinner.succeed('Repository structure created');
  } catch (error: any) {
    spinner.fail('Failed to create repository');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // 8. Initialize git
  if (!options.noGit) {
    const gitSpinner = ora('Initializing git repository...').start();
    
    try {
      execSync(`git init "${repoDir}"`, { encoding: 'utf8', stdio: 'pipe' });
      execSync(`git -C "${repoDir}" add -A`, { encoding: 'utf8', stdio: 'pipe' });
      execSync(`git -C "${repoDir}" commit -m "feat: initialize from ${options.template} template"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      gitSpinner.succeed('Git repository initialized');
    } catch (error: any) {
      gitSpinner.warn('Git initialization skipped (may already exist)');
    }
  }

  // 9. Success message
  console.log(chalk.bold.green(`\n✅ Repository created successfully!\n`));
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.dim(`  cd ${repoDirName}`));
  console.log(chalk.dim(`  dotnet build`));
  console.log(chalk.dim(`  dotnet test`));
  
  if (!options.noSample) {
    const sampleName = `${repoName}.Sample`;
    console.log(chalk.dim(`  dotnet run --project ${sampleName}/${sampleName}.csproj`));
  }

  console.log(chalk.dim(`\n📝 The repository will be auto-discovered by direnv on next directory entry.\n`));
}

// Parse command line arguments
function parseArgs(): CreateRepositoryOptions {
  const args = process.argv.slice(2);
  const options: CreateRepositoryOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--template':
      case '-t':
        options.template = args[++i];
        break;
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--no-git':
        options.noGit = true;
        break;
      case '--with-docs':
        options.withDocs = true;
        break;
      case '--no-sample':
        options.noSample = true;
        break;
      case '--help':
      case '-h':
        console.log(chalk.bold('Usage:'));
        console.log('  workspace-create-repository [options]\n');
        console.log(chalk.bold('Options:'));
        console.log('  -t, --template <name>   Template short name');
        console.log('  -n, --name <name>       Repository name (PascalCase)');
        console.log('  --no-git                Skip git initialization');
        console.log('  --with-docs             Include DocFX documentation site');
        console.log('  --no-sample             Exclude sample consumer project');
        console.log('  -h, --help              Show this help\n');
        console.log(chalk.bold('Examples:'));
        console.log(chalk.dim('  workspace-create-repository'));
        console.log(chalk.dim('  workspace-create-repository -t deepstaging-roslyn -n MyTool'));
        console.log(chalk.dim('  workspace-create-repository --no-sample --with-docs'));
        process.exit(0);
        break;
      default:
        console.log(chalk.red(`Unknown option: ${arg}`));
        console.log(chalk.dim('Use --help for usage information'));
        process.exit(1);
    }
  }

  return options;
}

// Main
const options = parseArgs();
createRepository(options).catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});
