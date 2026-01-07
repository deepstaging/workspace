#!/usr/bin/env tsx
/**
 * Check and update outdated NuGet packages across all repositories
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import { select, confirm, checkbox } from '@inquirer/prompts';

interface PackageVersion {
  name: string;
  currentVersion: string;
  latestVersion?: string;
  isOutdated: boolean;
}

interface RepositoryPackages {
  repoName: string;
  repoPath: string;
  directoryPackagesPath: string;
  relativePath: string;
  packages: PackageVersion[];
}

interface DirectoryPackagesFile {
  repoName: string;
  fullPath: string;
  relativePath: string;
}

async function findDirectoryPackagesFiles(
  repositoriesDir: string,
  maxDepth: number = 4
): Promise<DirectoryPackagesFile[]> {
  const files: DirectoryPackagesFile[] = [];
  
  async function search(dir: string, repoName: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || 
            entry.name === 'bin' || entry.name === 'obj') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await search(path.join(dir, entry.name), repoName, depth + 1);
        } else if (entry.name === 'Directory.Packages.props') {
          const fullPath = path.join(dir, entry.name);
          const repoPath = path.join(repositoriesDir, repoName);
          const relativePath = path.relative(repoPath, fullPath);
          
          files.push({
            repoName,
            fullPath,
            relativePath,
          });
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  try {
    const entries = await fs.readdir(repositoriesDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await search(path.join(repositoriesDir, entry.name), entry.name, 0);
      }
    }
  } catch (error) {
    throw new Error(`Failed to read repositories directory: ${error}`);
  }
  
  return files.sort((a, b) => {
    const repoCompare = a.repoName.localeCompare(b.repoName);
    return repoCompare !== 0 ? repoCompare : a.relativePath.localeCompare(b.relativePath);
  });
}

async function parseDirectoryPackages(filePath: string): Promise<PackageVersion[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const packages: PackageVersion[] = [];
  
  const packageRegex = /<PackageVersion\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/>/g;
  let match;
  
  while ((match = packageRegex.exec(content)) !== null) {
    packages.push({
      name: match[1],
      currentVersion: match[2],
      isOutdated: false,
    });
  }
  
  return packages;
}

async function checkForUpdates(packages: PackageVersion[]): Promise<void> {
  // Get unique package names
  const uniquePackages = new Set(packages.map(p => p.name));
  
  console.log(chalk.dim(`  Checking ${uniquePackages.size} unique packages for updates...`));
  
  // Query each unique package once and cache results
  const versionCache = new Map<string, string>();
  
  for (const pkgName of uniquePackages) {
    try {
      const result = execSync(
        `dotnet package search ${pkgName} --exact-match --take 100 --format json`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const data = JSON.parse(result);
      
      // Find the highest version from all sources
      let latestVersion: string | null = null;
      
      if (data.searchResult) {
        for (const source of data.searchResult) {
          if (source.packages && Array.isArray(source.packages)) {
            for (const p of source.packages) {
              if (p.id === pkgName && p.version) {
                if (!latestVersion || compareVersions(p.version, latestVersion) > 0) {
                  latestVersion = p.version;
                }
              }
            }
          }
        }
      }
      
      if (latestVersion) {
        versionCache.set(pkgName, latestVersion);
      }
    } catch (error) {
      // Skip packages we can't find or check
    }
  }
  
  // Apply cached results to all packages
  for (const pkg of packages) {
    const latestVersion = versionCache.get(pkg.name);
    if (latestVersion) {
      pkg.latestVersion = latestVersion;
      pkg.isOutdated = compareVersions(latestVersion, pkg.currentVersion) > 0;
    } else {
      pkg.latestVersion = pkg.currentVersion;
    }
  }
}

function compareVersions(v1: string, v2: string): number {
  // Parse semantic versions (e.g., "4.14.0", "3.11.0", "1.0.0-preview")
  const parseVersion = (v: string) => {
    const parts = v.split('-')[0].split('.').map(p => parseInt(p) || 0);
    return parts;
  };
  
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  // Handle pre-release versions (v1.0.0-preview is less than v1.0.0)
  const hasPreRelease1 = v1.includes('-');
  const hasPreRelease2 = v2.includes('-');
  
  if (!hasPreRelease1 && hasPreRelease2) return 1;
  if (hasPreRelease1 && !hasPreRelease2) return -1;
  
  return 0;
}

async function updatePackageVersion(
  filePath: string,
  packageName: string,
  newVersion: string
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf8');
  const regex = new RegExp(
    `(<PackageVersion\\s+Include="${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+Version=")[^"]+(")`,
    'g'
  );
  
  const updated = content.replace(regex, `$1${newVersion}$2`);
  await fs.writeFile(filePath, updated, 'utf8');
}

async function main() {
  console.log(chalk.blue('📦 NuGet Package Update Tool\n'));
  
  const repositoriesDir = process.env.DEEPSTAGING_REPOSITORIES_DIR;
  if (!repositoriesDir) {
    console.error(chalk.red('❌ DEEPSTAGING_REPOSITORIES_DIR not set'));
    process.exit(1);
  }
  
  console.log(chalk.dim('Finding Directory.Packages.props files...\n'));
  
  const packageFiles = await findDirectoryPackagesFiles(repositoriesDir);
  
  if (packageFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No Directory.Packages.props files found'));
    return;
  }
  
  console.log(chalk.green(`✓ Found ${packageFiles.length} Directory.Packages.props files\n`));
  
  // Select files to check
  const selectedFiles = await checkbox({
    message: 'Select files to check:',
    choices: packageFiles.map(file => ({
      name: file.relativePath === 'Directory.Packages.props' 
        ? `${file.repoName}`
        : `${file.repoName}/${file.relativePath}`,
      value: file.fullPath,
      checked: true,
    })),
    pageSize: 15,
  });
  
  if (selectedFiles.length === 0) {
    console.log(chalk.yellow('\n⚠️  No files selected'));
    return;
  }
  
  console.log();
  
  // Collect all packages from all files for batch checking
  console.log(chalk.dim('Parsing package versions...\n'));
  
  const allPackages: PackageVersion[] = [];
  const filePackageMap = new Map<string, PackageVersion[]>();
  
  for (const filePath of selectedFiles) {
    const packages = await parseDirectoryPackages(filePath);
    filePackageMap.set(filePath, packages);
    allPackages.push(...packages);
  }
  
  // Check for updates once for all unique packages
  await checkForUpdates(allPackages);
  
  // Group by file for display
  const repoPackages: RepositoryPackages[] = [];
  
  for (const filePath of selectedFiles) {
    const fileInfo = packageFiles.find(f => f.fullPath === filePath)!;
    const packages = filePackageMap.get(filePath)!;
    const displayName = fileInfo.relativePath === 'Directory.Packages.props'
      ? fileInfo.repoName
      : `${fileInfo.repoName}/${fileInfo.relativePath}`;
    
    const outdatedCount = packages.filter(p => p.isOutdated).length;
    
    if (outdatedCount > 0) {
      console.log(chalk.yellow(`${displayName}: ${outdatedCount} outdated packages`));
      repoPackages.push({
        repoName: fileInfo.repoName,
        repoPath: path.dirname(filePath),
        directoryPackagesPath: filePath,
        relativePath: fileInfo.relativePath,
        packages,
      });
    } else {
      console.log(chalk.green(`${displayName}: All packages up to date`));
    }
  }
  
  console.log();
  
  if (repoPackages.length === 0) {
    console.log(chalk.green('✓ All selected files have up-to-date packages'));
    return;
  }
  
  // Display outdated packages
  console.log(chalk.bold('Outdated Packages:\n'));
  
  for (const repo of repoPackages) {
    const displayName = repo.relativePath === 'Directory.Packages.props'
      ? repo.repoName
      : `${repo.repoName}/${repo.relativePath}`;
    
    console.log(chalk.cyan(`${displayName}:`));
    
    const outdated = repo.packages.filter(p => p.isOutdated);
    for (const pkg of outdated) {
      console.log(
        `  ${pkg.name}: ${chalk.red(pkg.currentVersion)} → ${chalk.green(pkg.latestVersion)}`
      );
    }
    console.log();
  }
  
  // Build choices for package selection
  const packageChoices: Array<{ name: string; value: string; checked: boolean }> = [];
  
  for (const repo of repoPackages) {
    const displayName = repo.relativePath === 'Directory.Packages.props'
      ? repo.repoName
      : `${repo.repoName}/${repo.relativePath}`;
    
    const outdated = repo.packages.filter(p => p.isOutdated);
    for (const pkg of outdated) {
      if (pkg.latestVersion) {
        packageChoices.push({
          name: `${displayName}: ${pkg.name} (${pkg.currentVersion} → ${pkg.latestVersion})`,
          value: `${repo.directoryPackagesPath}|${pkg.name}|${pkg.latestVersion}`,
          checked: false,
        });
      }
    }
  }
  
  // Select packages to update
  const selectedPackages = await checkbox({
    message: 'Select packages to update (default: none):',
    choices: packageChoices,
    pageSize: 20,
  });
  
  if (selectedPackages.length === 0) {
    console.log(chalk.dim('\nNo packages selected for update'));
    return;
  }
  
  console.log(chalk.blue('\n📝 Updating selected packages...\n'));
  
  // Group by file for cleaner output
  const updatesByFile = new Map<string, Array<{ name: string; version: string }>>();
  
  for (const selection of selectedPackages) {
    const [filePath, packageName, version] = selection.split('|');
    
    if (!updatesByFile.has(filePath)) {
      updatesByFile.set(filePath, []);
    }
    
    updatesByFile.get(filePath)!.push({ name: packageName, version });
  }
  
  // Apply updates
  for (const [filePath, updates] of updatesByFile) {
    const fileInfo = packageFiles.find(f => f.fullPath === filePath)!;
    const displayName = fileInfo.relativePath === 'Directory.Packages.props'
      ? fileInfo.repoName
      : `${fileInfo.repoName}/${fileInfo.relativePath}`;
    
    console.log(chalk.dim(`Updating ${displayName}...`));
    
    for (const update of updates) {
      const repo = repoPackages.find(r => r.directoryPackagesPath === filePath)!;
      const pkg = repo.packages.find(p => p.name === update.name)!;
      
      await updatePackageVersion(filePath, update.name, update.version);
      console.log(
        chalk.green(`  ✓ ${update.name}: ${pkg.currentVersion} → ${update.version}`)
      );
    }
    console.log();
  }
  
  console.log(chalk.green('✓ Package updates complete\n'));
  console.log(chalk.dim('Note: You may need to restore and rebuild projects to verify compatibility'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});
