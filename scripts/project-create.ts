#!/usr/bin/env tsx

/**
 * Create a new Roslyn tooling project from Deepstaging template
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { printHeader, printSuccess, printError, printWarning, createSpinner } from './lib/ui.js';
import { confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';

const program = new Command();

program
  .name('new-project')
  .description('Create a new Roslyn tooling project from Deepstaging template')
  .argument('<project-name>', 'Name of the new project (e.g., MyAwesomeTool)')
  .option('--no-sample', 'Skip creating sample analyzer')
  .option('--with-docs', 'Include documentation template')
  .option('--output <dir>', 'Output directory (default: sibling to workspace)')
  .parse(process.argv);

const [projectName] = program.args;
const options = program.opts();

async function main() {
  printHeader();
  console.log(chalk.blue('🚀 Create New Roslyn Project'));
  console.log(chalk.blue('='.repeat(30)));
  console.log();

  // Validate project name
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(projectName)) {
    printError('Project name must start with uppercase letter and contain only letters/numbers');
    process.exit(1);
  }

  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(import.meta.dirname, '..', '..');
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR || path.join(orgRoot, 'repositories');
  const deepstagingRepo = path.join(repositoriesDir, 'deepstaging');
  const templatePath = path.join(deepstagingRepo, 'packages', 'Deepstaging.Templates');
  
  const outputDir = options.output || repositoriesDir;
  const projectDir = path.join(outputDir, projectName.toLowerCase());

  console.log(`Project name: ${chalk.cyan(projectName)}`);
  console.log(`Output directory: ${projectDir}`);
  console.log(`Template: ${templatePath}`);
  console.log();

  // Check if template exists
  try {
    await fs.access(templatePath);
  } catch {
    printError(`Template not found: ${templatePath}`);
    console.log('Make sure the deepstaging repository is cloned.');
    process.exit(1);
  }

  // Check if directory already exists
  try {
    await fs.access(projectDir);
    printError(`Directory already exists: ${projectDir}`);
    process.exit(1);
  } catch {
    // Good, doesn't exist
  }

  // Confirm creation
  const shouldCreate = await confirm({
    message: `Create project "${projectName}"?`,
    default: true,
  });

  if (!shouldCreate) {
    console.log('Cancelled');
    process.exit(0);
  }

  console.log();

  // Create project directory
  const spinner = createSpinner('Creating project structure...');
  spinner.start();

  try {
    await fs.mkdir(projectDir, { recursive: true });

    // Create solution
    execSync(`dotnet new sln -n ${projectName}`, {
      cwd: projectDir,
      stdio: 'pipe',
    });

    // Create main library
    const libDir = path.join(projectDir, projectName);
    await fs.mkdir(libDir);
    execSync(`dotnet new classlib -n ${projectName} -f net8.0`, {
      cwd: libDir,
      stdio: 'pipe',
    });

    // Add to solution
    execSync(`dotnet sln add ${projectName}/${projectName}.csproj`, {
      cwd: projectDir,
      stdio: 'pipe',
    });

    // Create tests project
    const testsDir = path.join(projectDir, `${projectName}.Tests`);
    await fs.mkdir(testsDir);
    execSync(`dotnet new xunit -n ${projectName}.Tests -f net8.0`, {
      cwd: testsDir,
      stdio: 'pipe',
    });

    execSync(`dotnet sln add ${projectName}.Tests/${projectName}.Tests.csproj`, {
      cwd: projectDir,
      stdio: 'pipe',
    });

    // Add project reference
    execSync(`dotnet add ${projectName}.Tests/${projectName}.Tests.csproj reference ${projectName}/${projectName}.csproj`, {
      cwd: projectDir,
      stdio: 'pipe',
    });

    spinner.succeed('Project structure created');

    // Add Deepstaging references
    const refSpinner = createSpinner('Adding Deepstaging references...');
    refSpinner.start();

    // Add reference to main Deepstaging package (as ProjectReference for now)
    const deepstagingCsproj = path.join(deepstagingRepo, 'packages', 'Deepstaging', 'Deepstaging.csproj');
    execSync(`dotnet add ${projectName}/${projectName}.csproj reference ${deepstagingCsproj}`, {
      cwd: projectDir,
      stdio: 'pipe',
    });

    refSpinner.succeed('Added Deepstaging references');

    // Create sample analyzer if requested
    if (options.sample !== false) {
      const sampleSpinner = createSpinner('Creating sample analyzer...');
      sampleSpinner.start();

      const sampleCode = `using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace ${projectName};

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class SampleAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "${projectName.toUpperCase()}001";
    
    private static readonly DiagnosticDescriptor Rule = new DiagnosticDescriptor(
        DiagnosticId,
        "Sample Rule",
        "This is a sample diagnostic",
        "Sample",
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        
        // Add your analyzer logic here
    }
}
`;

      await fs.writeFile(path.join(libDir, 'SampleAnalyzer.cs'), sampleCode);
      sampleSpinner.succeed('Created sample analyzer');
    }

    // Create README
    const readme = `# ${projectName}

A Roslyn-based code analysis tool built with Deepstaging.

## Getting Started

\`\`\`bash
dotnet build
dotnet test
\`\`\`

## Publishing

\`\`\`bash
workspace-publish ${projectName.toLowerCase()}
\`\`\`
`;

    await fs.writeFile(path.join(projectDir, 'README.md'), readme);

    console.log();
    printSuccess('Project created successfully!');
    console.log();
    console.log('Next steps:');
    console.log(`  cd ${path.relative(process.cwd(), projectDir)}`);
    console.log(`  dotnet build`);
    console.log(`  dotnet test`);
    console.log();
    console.log('To publish to local NuGet feed:');
    console.log(`  workspace-publish ${projectName.toLowerCase()}`);

  } catch (error: any) {
    spinner.fail('Failed to create project');
    printError(error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
