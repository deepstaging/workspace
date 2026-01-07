#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { select, input, checkbox } from '@inquirer/prompts';
import search from '@inquirer/search';
import ora from 'ora';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TemplateParameter {
  name: string;
  shortName?: string;
  type: 'string' | 'bool' | 'choice';
  description: string;
  defaultValue?: string;
  choices?: string[];
}

/**
 * Set up Deepstaging foundation files if they don't exist
 */
function setupDeepstagingFoundation(repoDir: string, repoName: string): void {
  const spinner = ora('Setting up Deepstaging foundation...').start();
  
  try {
    // 1. Ensure scripts directory exists
    const scriptsDir = path.join(repoDir, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    // 2. Create publish.sh if it doesn't exist
    const publishScript = path.join(scriptsDir, 'publish.sh');
    if (!fs.existsSync(publishScript)) {
      const publishContent = `#!/usr/bin/env bash
set -euo pipefail

# Publish ${repoName} packages to local NuGet feed
# Calls the workspace publish script

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_SCRIPT_DIR="\${DEEPSTAGING_WORKSPACE_DIR:-\${WORKSPACE_SCRIPT_DIR:-$REPO_DIR/../../workspace}}/scripts"

if [ ! -d "$WORKSPACE_SCRIPT_DIR" ]; then
  echo "Error: WORKSPACE_SCRIPT_DIR not found at $WORKSPACE_SCRIPT_DIR"
  exit 1
fi

# Use DEEPSTAGING_ARTIFACTS_DIR if set, otherwise default to repo-level artifacts
ARTIFACTS_ARG=""
if [ -n "\${DEEPSTAGING_ARTIFACTS_DIR:-}" ]; then
  ARTIFACTS_ARG="--artifacts $DEEPSTAGING_ARTIFACTS_DIR"
else
  ARTIFACTS_ARG="--artifacts $REPO_DIR/artifacts"
fi

exec tsx "$WORKSPACE_SCRIPT_DIR/packages-publish.ts" ${repoName.toLowerCase()} $ARTIFACTS_ARG "$@"
`;
      fs.writeFileSync(publishScript, publishContent, { mode: 0o755 });
    }
    
    // 3. Create/update Directory.Build.props at repository root if it doesn't exist
    const directoryBuildProps = path.join(repoDir, 'Directory.Build.props');
    const srcDirectoryBuildProps = path.join(repoDir, 'src', 'Directory.Build.props');
    
    // Check if either exists
    if (!fs.existsSync(directoryBuildProps) && !fs.existsSync(srcDirectoryBuildProps)) {
      const propsContent = `<Project>
    <PropertyGroup>
        <!-- Respect DEEPSTAGING_ARTIFACTS_DIR for bin/obj output -->
        <ArtifactsDir Condition="'$(DEEPSTAGING_ARTIFACTS_DIR)' != ''">$(DEEPSTAGING_ARTIFACTS_DIR)/${repoName}</ArtifactsDir>
        <ArtifactsDir Condition="'$(DEEPSTAGING_ARTIFACTS_DIR)' == ''">$(MSBuildThisFileDirectory)artifacts</ArtifactsDir>
        
        <BaseOutputPath>$(ArtifactsDir)/bin/$(MSBuildProjectName)/</BaseOutputPath>
        <BaseIntermediateOutputPath>$(ArtifactsDir)/obj/$(MSBuildProjectName)/</BaseIntermediateOutputPath>
        <PackageOutputPath>$(ArtifactsDir)/packages/</PackageOutputPath>

        <LangVersion>latest</LangVersion>
        <Nullable>enable</Nullable>
        <ImplicitUsings>enable</ImplicitUsings>
        <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
        
        <!-- Default to not packable (enable per-project) -->
        <IsPackable>false</IsPackable>
        
        <!-- Enable source debugging -->
        <DebugType>embedded</DebugType>
        <EmbedAllSources>true</EmbedAllSources>
        
        <!-- Include symbols in NuGet packages -->
        <IncludeSymbols>true</IncludeSymbols>
        <SymbolPackageFormat>snupkg</SymbolPackageFormat>
    </PropertyGroup>
</Project>
`;
      
      // Determine where to place it (root or src/ if src exists)
      const srcDir = path.join(repoDir, 'src');
      const targetPropsFile = fs.existsSync(srcDir) ? srcDirectoryBuildProps : directoryBuildProps;
      fs.writeFileSync(targetPropsFile, propsContent);
    }
    
    // 4. Create .gitignore if it doesn't exist
    const gitignore = path.join(repoDir, '.gitignore');
    if (!fs.existsSync(gitignore)) {
      const gitignoreContent = `# Build artifacts
bin/
obj/
artifacts/

# User-specific files
*.suo
*.user
*.userosscache
*.sln.docstates

# IDE files
.vs/
.vscode/
.idea/
*.swp
*.swo
*~

# NuGet
*.nupkg
*.snupkg
project.lock.json
project.fragment.lock.json

# Test results
TestResults/
*.trx
*.coverage

# OS files
.DS_Store
Thumbs.db
`;
      fs.writeFileSync(gitignore, gitignoreContent);
    }
    
    spinner.succeed('Deepstaging foundation configured');
  } catch (error: any) {
    spinner.warn('Failed to set up Deepstaging foundation');
    console.log(chalk.yellow(`  ${error.message}`));
  }
}

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
  templateParams?: Record<string, any>;
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

function getTemplateParameters(templateShortName: string): TemplateParameter[] {
  try {
    const output = execSync(`dotnet new ${templateShortName} --help`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const parameters: TemplateParameter[] = [];
    const lines = output.split('\n');
    
    let inTemplateOptions = false;
    let currentParam: Partial<TemplateParameter> | null = null;
    
    for (const line of lines) {
      // Detect "Template options:" section
      if (line.trim() === 'Template options:') {
        inTemplateOptions = true;
        continue;
      }
      
      // Stop at next major section
      if (inTemplateOptions && line.trim() && !line.startsWith(' ')) {
        break;
      }
      
      if (!inTemplateOptions) continue;
      
      // Parse parameter line (starts with - or --)
      if (line.match(/^\s+(-\w+,?\s*)?--(\w+)/)) {
        // Save previous parameter if exists
        if (currentParam?.name) {
          parameters.push(currentParam as TemplateParameter);
        }
        
        // Parse new parameter
        const match = line.match(/^\s+(?:-(\w+),?\s*)?--(\w+)(?:\s+<([^>]+)>)?(?:\s+(.*))?/);
        if (match) {
          currentParam = {
            shortName: match[1],
            name: match[2],
            description: match[4] || ''
          };
        }
      } else if (currentParam && line.trim()) {
        // Continue description or parse Type/Default/Choices
        const typeMatch = line.match(/^\s+Type:\s*(\w+)/);
        const defaultMatch = line.match(/^\s+Default:\s*(.+)/);
        const choiceMatch = line.match(/^\s+(\w+)\s+(.+)/);
        
        if (typeMatch) {
          currentParam.type = typeMatch[1] as any;
        } else if (defaultMatch) {
          currentParam.defaultValue = defaultMatch[1].trim();
        } else if (currentParam.type === 'choice' && choiceMatch && line.trim().match(/^\w/)) {
          if (!currentParam.choices) currentParam.choices = [];
          currentParam.choices.push(choiceMatch[1]);
        } else {
          // Continuation of description
          currentParam.description += ' ' + line.trim();
        }
      }
    }
    
    // Save last parameter
    if (currentParam?.name) {
      parameters.push(currentParam as TemplateParameter);
    }
    
    return parameters;
  } catch (error) {
    return [];
  }
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

  const template = await search({
    message: 'Choose a template:',
    source: async (input) => {
      if (!input) {
        return choices;
      }
      
      const searchTerm = input.toLowerCase();
      return choices.filter(choice => 
        choice.value.toLowerCase().includes(searchTerm) ||
        choice.description.toLowerCase().includes(searchTerm)
      );
    },
    pageSize: 15
  });

  return template as string;
}

async function promptForName(): Promise<string> {
  const name = await input({
    message: 'Repository name (PascalCase):',
    validate: (input: string) => {
      if (!input.trim()) return 'Name is required';
      // Allow PascalCase with optional dots (e.g., Roslyn.Testing)
      if (!/^[A-Z][a-zA-Z0-9]*(\.[A-Z][a-zA-Z0-9]*)*$/.test(input.trim())) {
        return 'Must be PascalCase with optional dots (e.g., MyAwesomeTool or Roslyn.Testing)';
      }
      return true;
    }
  });

  return name.trim();
}

async function promptForTemplateOptions(parameters: TemplateParameter[]): Promise<Record<string, any>> {
  const options: Record<string, any> = {};
  
  // Filter out parameters we don't want to prompt for:
  // 1. Common .NET internal parameters
  // 2. Deepstaging workspace parameters (auto-populated from environment)
  const relevantParams = parameters.filter(p => 
    !['Framework', 'no-restore', 'no-https', 'no-update-check'].includes(p.name) &&
    !p.name.startsWith('Deepstaging')
  );
  
  if (relevantParams.length === 0) {
    return options;
  }
  
  console.log(chalk.bold('\n📋 Template Options:\n'));
  
  for (const param of relevantParams) {
    if (param.type === 'bool') {
      const { confirm } = await import('@inquirer/prompts');
      const value = await confirm({
        message: param.description || param.name,
        default: param.defaultValue === 'true'
      });
      options[param.name] = value;
    } else if (param.type === 'choice' && param.choices) {
      const value = await select({
        message: param.description || param.name,
        choices: param.choices.map(c => ({ name: c, value: c })),
        default: param.defaultValue
      });
      options[param.name] = value;
    } else if (param.type === 'string') {
      const value = await input({
        message: param.description || param.name,
        default: param.defaultValue
      });
      if (value) options[param.name] = value;
    }
  }
  
  return options;
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

  // 3. Introspect template parameters
  const templateParams = getTemplateParameters(options.template);
  
  // 4. Prompt for template options if not provided via CLI
  if (!options.templateParams || Object.keys(options.templateParams).length === 0) {
    options.templateParams = await promptForTemplateOptions(templateParams);
  }

  // 5. Calculate paths
  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(__dirname, '../..');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || path.join(orgRoot, 'repositories');
  const repoName = options.name;
  const repoDirName = kebabCase(repoName);
  const repoDir = path.join(repositoriesDir, repoDirName);

  console.log(chalk.dim(`\n📁 Target: ${repoDir}\n`));

  // 6. Check if directory exists
  if (fs.existsSync(repoDir)) {
    console.log(chalk.red(`❌ Directory already exists: ${repoDir}`));
    process.exit(1);
  }

  // 7. Build dotnet new command
  let command = `dotnet new ${options.template} -n ${repoName} -o "${repoDir}"`;
  
  // Add Deepstaging workspace parameters if template supports them
  // These follow the naming convention: Deepstaging<ParameterName>
  
  const hasDeepstagingOrgName = templateParams.some(p => p.name === 'DeepstagingOrgName');
  if (hasDeepstagingOrgName) {
    const orgName = process.env.DEEPSTAGING_ORG_NAME;
    if (!orgName) {
      console.log(chalk.red('❌ DEEPSTAGING_ORG_NAME environment variable is required'));
      console.log(chalk.dim('   Set this in your .envrc file'));
      process.exit(1);
    }
    command += ` --DeepstagingOrgName "${orgName}"`;
  }
  
  const hasDeepstagingFeedName = templateParams.some(p => p.name === 'DeepstagingFeedName');
  if (hasDeepstagingFeedName) {
    const orgName = process.env.DEEPSTAGING_ORG_NAME;
    if (!orgName) {
      console.log(chalk.red('❌ DEEPSTAGING_ORG_NAME environment variable is required'));
      console.log(chalk.dim('   Set this in your .envrc file'));
      process.exit(1);
    }
    // Feed name is always the same as org name
    command += ` --DeepstagingFeedName "${orgName}"`;
  }
  
  const hasDeepstagingLocalNugetFeed = templateParams.some(p => p.name === 'DeepstagingLocalNugetFeed');
  if (hasDeepstagingLocalNugetFeed) {
    const localFeed = process.env.DEEPSTAGING_LOCAL_NUGET_FEED;
    if (!localFeed) {
      console.log(chalk.red('❌ DEEPSTAGING_LOCAL_NUGET_FEED environment variable is required'));
      console.log(chalk.dim('   Set this in your .envrc file'));
      process.exit(1);
    }
    command += ` --DeepstagingLocalNugetFeed "${localFeed}"`;
  }
  
  // Add user-provided template parameters
  if (options.templateParams) {
    for (const [key, value] of Object.entries(options.templateParams)) {
      const param = templateParams.find(p => p.name === key);
      if (param) {
        const flag = param.shortName ? `-${param.shortName}` : `--${key}`;
        if (param.type === 'bool') {
          // Only add boolean flags when true (no value needed)
          if (value === true || value === 'true') {
            command += ` ${flag}`;
          }
        } else {
          command += ` ${flag} "${value}"`;
        }
      }
    }
  }

  // 8. Execute template
  const spinner = ora(`Creating repository from template ${chalk.cyan(options.template)}...`).start();
  
  try {
    execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    spinner.succeed('Repository structure created');
  } catch (error: any) {
    spinner.fail('Failed to create repository');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // 9. Set up Deepstaging foundation
  setupDeepstagingFoundation(repoDir, repoName);

  // 10. Initialize git
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

  // 11. Generate wrapper scripts
  const wrapperSpinner = ora('Generating wrapper scripts...').start();
  
  try {
    const templatesDir = path.join(__dirname, '..', 'templates', 'script-wrappers');
    const scriptsDir = path.join(repoDir, 'scripts');
    
    // Ensure scripts directory exists
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    // Read all template files
    const templates = fs.readdirSync(templatesDir)
      .filter(f => f.endsWith('.template'));
    
    for (const templateFile of templates) {
      const templatePath = path.join(templatesDir, templateFile);
      const outputFile = templateFile.replace('.template', '');
      const outputPath = path.join(scriptsDir, outputFile);
      
      // Read template content
      let content = fs.readFileSync(templatePath, 'utf8');
      
      // Replace template variables
      content = content
        .replace(/\{\{REPO_NAME\}\}/g, repoName)
        .replace(/\{\{REPO_KEY\}\}/g, repoDirName);
      
      // Write output file
      fs.writeFileSync(outputPath, content, { mode: 0o755 });
    }
    
    wrapperSpinner.succeed(`Generated ${templates.length} wrapper script(s)`);
  } catch (error: any) {
    wrapperSpinner.warn('Failed to generate wrapper scripts');
    console.log(chalk.yellow(`  ${error.message}`));
  }

  // 12. Success message
  console.log(chalk.bold.green(`\n✅ Repository created successfully!\n`));
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.dim(`  cd ${repoDirName}`));
  console.log(chalk.dim(`  dotnet build`));
  console.log(chalk.dim(`  dotnet test`));

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
      case '--help':
      case '-h':
        console.log(chalk.bold('Usage:'));
        console.log('  workspace-repository-create [options]\n');
        console.log(chalk.bold('Options:'));
        console.log('  -t, --template <name>   Template short name');
        console.log('  -n, --name <name>       Repository name (PascalCase)');
        console.log('  --no-git                Skip git initialization');
        console.log('  -h, --help              Show this help\n');
        console.log(chalk.bold('Examples:'));
        console.log(chalk.dim('  workspace-repository-create'));
        console.log(chalk.dim('  workspace-repository-create -t deepstaging-roslyn -n MyTool'));
        console.log(chalk.dim('  workspace-repository-create -t web -n MyWebApp'));
        console.log(chalk.dim('\nTemplate-specific options will be prompted interactively.'));
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
