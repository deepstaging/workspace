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
