/**
 * NuGet operations
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface NuGetPackage {
  id: string;
  version: string;
  path: string;
}

export interface NuGetCachePaths {
  globalPackages: string;
  httpCache: string;
  temp: string;
  pluginsCache: string;
}

export function getGlobalPackagesPath(): string {
  const output = execSync('dotnet nuget locals global-packages --list', { encoding: 'utf8' });
  const match = output.match(/global-packages: (.+)/);
  if (!match) {
    throw new Error('Could not determine global packages path');
  }
  return match[1].trim();
}

export function getAllCachePaths(): NuGetCachePaths {
  const output = execSync('dotnet nuget locals all --list', { encoding: 'utf8' });
  const lines = output.split('\n');
  
  const paths: NuGetCachePaths = {
    globalPackages: '',
    httpCache: '',
    temp: '',
    pluginsCache: ''
  };

  for (const line of lines) {
    if (line.includes('global-packages:')) {
      paths.globalPackages = line.split(':')[1].trim();
    } else if (line.includes('http-cache:')) {
      paths.httpCache = line.split(':')[1].trim();
    } else if (line.includes('temp:')) {
      paths.temp = line.split(':')[1].trim();
    } else if (line.includes('plugins-cache:')) {
      paths.pluginsCache = line.split(':')[1].trim();
    }
  }

  return paths;
}

export async function findPackagesInCache(cacheDir: string, pattern: string): Promise<string[]> {
  const packages: string[] = [];
  
  try {
    const entries = await fs.readdir(cacheDir, { withFileTypes: true });
    const regex = new RegExp(pattern, 'i');
    
    for (const entry of entries) {
      if (entry.isDirectory() && regex.test(entry.name)) {
        packages.push(path.join(cacheDir, entry.name));
      }
    }
  } catch (error) {
    // Directory doesn't exist or not accessible
  }

  return packages;
}

export async function findNupkgInFeed(feedPath: string, pattern: string): Promise<string[]> {
  const packages: string[] = [];
  
  try {
    const files = await fs.readdir(feedPath);
    const regex = new RegExp(pattern, 'i');
    
    for (const file of files) {
      if (file.endsWith('.nupkg') && regex.test(file)) {
        packages.push(path.join(feedPath, file));
      }
    }
  } catch (error) {
    // Directory doesn't exist
  }

  return packages;
}

export async function removeDirectories(dirs: string[]): Promise<number> {
  let removed = 0;
  for (const dir of dirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      removed++;
    } catch (error) {
      console.error(`Failed to remove ${dir}:`, error);
    }
  }
  return removed;
}

export async function removeFiles(files: string[]): Promise<number> {
  let removed = 0;
  for (const file of files) {
    try {
      await fs.unlink(file);
      removed++;
    } catch (error) {
      console.error(`Failed to remove ${file}:`, error);
    }
  }
  return removed;
}

export async function pushToLocalFeed(
  packagePath: string,
  feedPath: string
): Promise<void> {
  // Ensure feed directory exists
  await fs.mkdir(feedPath, { recursive: true });

  // Copy package to feed
  const fileName = path.basename(packagePath);
  const destPath = path.join(feedPath, fileName);

  await fs.copyFile(packagePath, destPath);
  
  // Clear NuGet caches to ensure fresh package is used
  try {
    execSync('dotnet nuget locals all --clear', { stdio: 'pipe' });
  } catch (error) {
    // Non-critical if cache clear fails
  }
  
  console.log(`📦 Pushed: ${fileName}`);
}

export async function getLocalPackages(feedPath: string): Promise<NuGetPackage[]> {
  const packages: NuGetPackage[] = [];

  try {
    const files = await fs.readdir(feedPath);
    const nupkgFiles = files.filter((f) => f.endsWith('.nupkg'));

    for (const file of nupkgFiles) {
      // Parse package ID and version from filename
      // Format: PackageName.1.0.0.nupkg
      const match = file.match(/^(.+?)\.(\d+\.\d+\.\d+.*?)\.nupkg$/);
      if (match) {
        packages.push({
          id: match[1],
          version: match[2],
          path: path.join(feedPath, file),
        });
      }
    }
  } catch (error) {
    // Feed directory doesn't exist yet
  }

  return packages;
}

export async function clearLocalFeed(feedPath: string): Promise<void> {
  try {
    const files = await fs.readdir(feedPath);
    const nupkgFiles = files.filter((f) => f.endsWith('.nupkg'));

    for (const file of nupkgFiles) {
      await fs.unlink(path.join(feedPath, file));
    }

    console.log(`🗑️  Cleared ${nupkgFiles.length} packages from local feed`);
  } catch (error) {
    // Feed directory doesn't exist
  }
}

export function getDefaultFeedPath(): string {
  return process.env.DEEPSTAGING_LOCAL_NUGET_FEED || 
         path.join(process.env.HOME || '~', '.nuget', 'local-feed');
}
