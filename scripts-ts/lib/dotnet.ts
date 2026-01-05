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
}

export async function buildProject(projectPath: string): Promise<void> {
  execSync('dotnet build', {
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
  outputDir: string
): Promise<string> {
  const result = execSync(`dotnet pack -o "${outputDir}" --no-build`, {
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

    // Determine project type
    let type: DotNetProject['type'] = 'classlib';
    if (content.includes('<OutputType>Exe</OutputType>')) type = 'console';
    if (csprojFile.includes('.Tests.')) type = 'test';
    if (content.includes('Microsoft.CodeAnalysis')) type = 'analyzer';

    return {
      name: csprojFile.replace('.csproj', ''),
      path: projectPath,
      type,
      targetFramework,
    };
  } catch (error) {
    return null;
  }
}

export async function findProjects(rootDir: string): Promise<DotNetProject[]> {
  const projects: DotNetProject[] = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const projectPath = path.join(rootDir, entry.name);
    const info = await getProjectInfo(projectPath);

    if (info) {
      projects.push(info);
    }
  }

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
