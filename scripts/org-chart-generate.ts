#!/usr/bin/env tsx

/**
 * Generate organization chart with dependencies
 * 
 * Scans all repositories in the workspace and generates an interactive
 * D3.js visualization showing:
 * - Repository structure
 * - Project dependencies (ProjectReference)
 * - Package dependencies (PackageReference)
 * - Cross-repository dependencies
 * 
 * Usage:
 *   ./generate-org-chart.ts [output-dir]
 *   npm run org-chart
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Project {
  name: string;
  projectReferences: string[];
  packageReferences: string[];
}

interface Repository {
  name: string;
  projects: Project[];
}

interface DependencyData {
  repositories: Repository[];
}

/**
 * Extract project and package references from a .csproj file
 */
function extractReferences(csprojPath: string): { projectRefs: string[], packageRefs: string[] } {
  const projectRefs: string[] = [];
  const packageRefs: string[] = [];

  try {
    const content = fs.readFileSync(csprojPath, 'utf-8');

    // Extract ProjectReference
    const projRefRegex = /<ProjectReference Include="([^"]+)"/g;
    let match;
    while ((match = projRefRegex.exec(content)) !== null) {
      const refPath = match[1];
      // Extract just the project name from the path
      const projName = path.basename(refPath, '.csproj');
      projectRefs.push(projName);
    }

    // Extract PackageReference (filter for internal packages)
    const pkgRefRegex = /<PackageReference Include="([^"]+)"/g;
    while ((match = pkgRefRegex.exec(content)) !== null) {
      const pkgName = match[1];
      if (pkgName.includes('Deepstaging') || pkgName.includes('Effects') || pkgName.includes('Fixes')) {
        packageRefs.push(pkgName);
      }
    }
  } catch (err) {
    console.error(`Error reading ${csprojPath}:`, err);
  }

  return { projectRefs, packageRefs };
}

/**
 * Scan all repositories for projects and dependencies
 */
async function scanRepositories(workspaceRoot: string): Promise<DependencyData> {
  const repos = ['deepstaging', 'effects', 'templates', 'fixes'];
  const data: DependencyData = { repositories: [] };

  for (const repoName of repos) {
    const repoPath = path.join(workspaceRoot, repoName);
    
    if (!fs.existsSync(repoPath)) {
      console.log(`⏭️  Skipping ${repoName} (not found)`);
      continue;
    }

    console.log(`📂 Scanning ${repoName}...`);
    
    const repo: Repository = {
      name: repoName,
      projects: []
    };

    // Find all .csproj files
    const csprojFiles = await glob('**/*.csproj', {
      cwd: repoPath,
      ignore: ['**/obj/**', '**/bin/**'],
      absolute: true
    });

    for (const csprojPath of csprojFiles) {
      const projName = path.basename(csprojPath, '.csproj');
      const { projectRefs, packageRefs } = extractReferences(csprojPath);

      repo.projects.push({
        name: projName,
        projectReferences: projectRefs,
        packageReferences: packageRefs
      });
    }

    console.log(`   Found ${repo.projects.length} projects`);
    data.repositories.push(repo);
  }

  return data;
}

/**
 * Generate HTML visualization
 */
function generateHTML(data: DependencyData): string {
  const template = fs.readFileSync(path.join(__dirname, 'lib', 'org-chart-template.html'), 'utf-8');
  
  // Inject the dependency data
  return template.replace(
    '/* DEPENDENCY_DATA_PLACEHOLDER */',
    `const dependencyData = ${JSON.stringify(data, null, 2)};`
  );
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || path.join(__dirname, '..', '..');
  
  console.log('🔍 Scanning repositories for dependencies...\n');

  // Scan from parent directory (workspace root)
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const data = await scanRepositories(workspaceRoot);

  console.log(`\n✅ Scanned ${data.repositories.length} repositories`);
  
  // Count totals
  const totalProjects = data.repositories.reduce((sum, repo) => sum + repo.projects.length, 0);
  const totalCrossRepoDeps = data.repositories.reduce((sum, repo) => {
    return sum + repo.projects.reduce((projSum, proj) => {
      return projSum + proj.packageReferences.filter(pkg => 
        !repo.projects.some(p => p.name === pkg || pkg.startsWith(repo.name))
      ).length;
    }, 0);
  }, 0);

  console.log(`   ${totalProjects} total projects`);
  console.log(`   ${totalCrossRepoDeps} cross-repository dependencies`);

  // Generate HTML
  console.log('\n📊 Generating visualization...');
  const html = generateHTML(data);

  // Write output
  const outputPath = path.join(outputDir, 'org-chart-deps.html');
  fs.writeFileSync(outputPath, html);

  console.log(`\n✨ Generated: ${outputPath}`);
  console.log('   Open with: open org-chart-deps.html\n');
}

main().catch(console.error);
