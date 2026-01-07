/**
 * .NET CLI operations
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface DotNetProject {
  name: string;
  path: string;
  type: 'console' | 'classlib' | 'test' | 'analyzer';
  targetFramework: string;
  packageId?: string;
}

export async function buildProject(projectPath: string, configuration: string = 'Debug'): Promise<void> {
  execSync(`dotnet build --configuration ${configuration}`, {
    cwd: projectPath,
    stdio: 'inherit',
  });
}

export async function restoreProject(projectPath: string): Promise<void> {
  execSync('dotnet restore', {
    cwd: projectPath,
    stdio: 'inherit',
  });
}

export async function packProject(
  projectPath: string,
  outputDir: string,
  versionSuffix?: string,
  noBuild: boolean = true,
  configuration: string = 'Debug'
): Promise<string> {
  const versionArg = versionSuffix ? `--version-suffix ${versionSuffix}` : '';
  const noBuildArg = noBuild ? '--no-build' : '';
  const result = execSync(`dotnet pack -o "${outputDir}" ${noBuildArg} ${versionArg} --configuration ${configuration}`, {
    cwd: projectPath,
    encoding: 'utf8',
  });

  // Extract package file name from output
  const match = result.match(/Successfully created package '(.+)'/);
  return match ? match[1] : '';
}

export async function getProjectInfo(
  projectPath: string
): Promise<DotNetProject | null> {
  try {
    const files = await fs.readdir(projectPath);
    const csprojFile = files.find((f) => f.endsWith('.csproj'));

    if (!csprojFile) return null;

    const csprojPath = path.join(projectPath, csprojFile);
    const content = await fs.readFile(csprojPath, 'utf8');

    // Parse basic info from csproj
    const tfmMatch = content.match(/<TargetFramework>(.+?)<\/TargetFramework>/);
    const targetFramework = tfmMatch ? tfmMatch[1] : 'net8.0';
    
    // Extract PackageId if present
    const packageIdMatch = content.match(/<PackageId>(.+?)<\/PackageId>/);
    const packageId = packageIdMatch ? packageIdMatch[1] : undefined;

    // Determine project type
    let type: DotNetProject['type'] = 'classlib';
    if (content.includes('<OutputType>Exe</OutputType>')) type = 'console';
    if (csprojFile.includes('.Tests.')) type = 'test';
    // Analyzers have EnforceExtendedAnalyzerRules set to true
    if (content.includes('<EnforceExtendedAnalyzerRules>true</EnforceExtendedAnalyzerRules>')) type = 'analyzer';

    return {
      name: csprojFile.replace('.csproj', ''),
      path: projectPath,
      type,
      targetFramework,
      packageId,
    };
  } catch (error) {
    return null;
  }
}

export async function findProjects(rootDir: string): Promise<DotNetProject[]> {
  const projects: DotNetProject[] = [];
  
  // Recursively find all packable projects (IsPackable=true)
  async function findPackableProjects(dir: string, depth: number = 0): Promise<void> {
    if (depth > 3) return; // Limit recursion depth
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'bin' || entry.name === 'obj') continue;
        
        const entryPath = path.join(dir, entry.name);
        
        // Check if this directory contains a .csproj file that is packable
        const files = await fs.readdir(entryPath).catch(() => []);
        const csprojFile = files.find(f => f.endsWith('.csproj'));
        
        if (csprojFile) {
          // Check if it's packable
          const csprojPath = path.join(entryPath, csprojFile);
          try {
            const content = await fs.readFile(csprojPath, 'utf8');
            const isPackable = content.includes('<IsPackable>true</IsPackable>');
            const isTest = csprojFile.includes('.Tests.');
            
            // Include if it's packable and not a test project
            if (isPackable && !isTest) {
              const info = await getProjectInfo(entryPath);
              if (info) {
                projects.push(info);
              }
            }
          } catch (error) {
            // Skip if we can't read the file
          }
        }
        
        // Recurse into subdirectories
        await findPackableProjects(entryPath, depth + 1);
      }
    } catch (error) {
      // Ignore errors (permission denied, etc.)
    }
  }
  
  await findPackableProjects(rootDir);
  return projects;
}

export async function findDependents(
  projectName: string,
  searchDir: string
): Promise<string[]> {
  const dependents: string[] = [];
  const projects = await findProjects(searchDir);

  for (const project of projects) {
    const csprojPath = path.join(project.path, `${project.name}.csproj`);
    const content = await fs.readFile(csprojPath, 'utf8');

    if (content.includes(`<ProjectReference.*${projectName}.csproj`)) {
      dependents.push(project.name);
    }
  }

  return dependents;
}

export async function getProjectDependencies(projectPath: string): Promise<string[]> {
  const files = await fs.readdir(projectPath);
  const csprojFile = files.find((f) => f.endsWith('.csproj'));
  
  if (!csprojFile) return [];
  
  const csprojPath = path.join(projectPath, csprojFile);
  const content = await fs.readFile(csprojPath, 'utf8');
  
  const dependencies: string[] = [];
  const projectRefRegex = /<ProjectReference\s+Include="([^"]+)"/g;
  let match;
  
  while ((match = projectRefRegex.exec(content)) !== null) {
    dependencies.push(match[1]);
  }
  
  return dependencies;
}

export async function sortProjectsByDependencies(projects: DotNetProject[]): Promise<DotNetProject[]> {
  const projectMap = new Map<string, DotNetProject>();
  const dependencyMap = new Map<string, Set<string>>();
  
  // Build maps
  for (const project of projects) {
    projectMap.set(project.name, project);
    const deps = await getProjectDependencies(project.path);
    const depNames = new Set<string>();
    
    for (const dep of deps) {
      const depName = path.basename(dep, '.csproj');
      if (projectMap.has(depName) || projects.some(p => p.name === depName)) {
        depNames.add(depName);
      }
    }
    
    dependencyMap.set(project.name, depNames);
  }
  
  // Topological sort
  const sorted: DotNetProject[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      // Circular dependency - just skip
      return;
    }
    
    visiting.add(name);
    
    const deps = dependencyMap.get(name) || new Set();
    for (const dep of deps) {
      visit(dep);
    }
    
    visiting.delete(name);
    visited.add(name);
    
    const project = projectMap.get(name);
    if (project) {
      sorted.push(project);
    }
  }
  
  for (const project of projects) {
    visit(project.name);
  }
  
  return sorted;
}
