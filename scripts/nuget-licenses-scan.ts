#!/usr/bin/env node --experimental-strip-types

/**
 * NuGet License Scanner
 * 
 * Scans all .csproj files in the repositories directory, extracts NuGet package
 * references, fetches their license information from NuGet.org, and displays
 * them grouped by license type.
 * 
 * Usage: ./scan-nuget-licenses.ts
 * 
 * Must be run from the org directory containing the 'repositories' folder.
 */

import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

interface PackageReference {
  name: string;
  version?: string;
  projectFile: string;
}

interface PackageLicense {
  name: string;
  version: string;
  license: string;
  licenseUrl?: string;
}

interface NuGetIndexData {
  versions: string[];
}

interface LicenseGroup {
  [license: string]: PackageLicense[];
}

async function findCsProjFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.csproj')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  await scan(dir);
  return files;
}

async function extractPackageReferences(csprojPath: string): Promise<PackageReference[]> {
  const content = await readFile(csprojPath, 'utf-8');
  const packages: PackageReference[] = [];
  
  // Match <PackageReference Include="PackageName" Version="1.0.0" />
  // Also matches without Version attribute
  const regex = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    packages.push({
      name: match[1],
      version: match[2],
      projectFile: csprojPath
    });
  }
  
  return packages;
}

async function fetchPackageLicense(packageName: string, version?: string): Promise<PackageLicense> {
  try {
    // Try to get specific version first if provided
    let url = `https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/index.json`;
    
    const indexResponse = await fetch(url);
    if (!indexResponse.ok) {
      return {
        name: packageName,
        version: version || 'unknown',
        license: 'Unknown - Package not found'
      };
    }
    
    const indexData = await indexResponse.json() as NuGetIndexData;
    const availableVersion = version || indexData.versions[indexData.versions.length - 1];
    
    // Fetch nuspec for license info
    const nuspecUrl = `https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/${availableVersion}/${packageName.toLowerCase()}.nuspec`;
    const nuspecResponse = await fetch(nuspecUrl);
    
    if (!nuspecResponse.ok) {
      return {
        name: packageName,
        version: availableVersion,
        license: 'Unknown - Nuspec not found'
      };
    }
    
    const nuspecXml = await nuspecResponse.text();
    
    // Extract license information
    let license = 'Not specified';
    let licenseUrl: string | undefined;
    
    // Try <license type="expression">
    const licenseExprMatch = nuspecXml.match(/<license\s+type="expression">([^<]+)<\/license>/);
    if (licenseExprMatch) {
      license = licenseExprMatch[1].trim();
    } else {
      // Try <license type="file"> or <license> with URL
      const licenseUrlMatch = nuspecXml.match(/<licenseUrl>([^<]+)<\/licenseUrl>/);
      if (licenseUrlMatch) {
        licenseUrl = licenseUrlMatch[1].trim();
        // Try to extract license type from URL
        if (licenseUrl.includes('MIT')) license = 'MIT';
        else if (licenseUrl.includes('Apache')) license = 'Apache-2.0';
        else if (licenseUrl.includes('BSD')) license = 'BSD';
        else if (licenseUrl.includes('GPL')) license = 'GPL';
        else if (licenseUrl.includes('LGPL')) license = 'LGPL';
        else license = 'See URL';
      }
    }
    
    return {
      name: packageName,
      version: availableVersion,
      license,
      licenseUrl
    };
  } catch (error) {
    return {
      name: packageName,
      version: version || 'unknown',
      license: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function main() {
  const startDir = process.cwd();
  const repositoriesDir = join(startDir, '..', 'repositories');
  
  console.log('🔍 Scanning for .csproj files...\n');
  const csprojFiles = await findCsProjFiles(repositoriesDir);
  console.log(`Found ${csprojFiles.length} .csproj files\n`);
  
  console.log('📦 Extracting package references...\n');
  const allPackages = new Map<string, PackageReference>();
  
  for (const csprojFile of csprojFiles) {
    const packages = await extractPackageReferences(csprojFile);
    for (const pkg of packages) {
      const key = `${pkg.name}@${pkg.version || 'latest'}`;
      if (!allPackages.has(key)) {
        allPackages.set(key, pkg);
      }
    }
  }
  
  console.log(`Found ${allPackages.size} unique packages\n`);
  console.log('📄 Fetching license information...\n');
  
  const licenses: PackageLicense[] = [];
  let processed = 0;
  
  for (const pkg of allPackages.values()) {
    const license = await fetchPackageLicense(pkg.name, pkg.version);
    licenses.push(license);
    processed++;
    if (processed % 5 === 0 || processed === allPackages.size) {
      process.stdout.write(`\rProcessed ${processed}/${allPackages.size} packages...`);
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 NUGET PACKAGES GROUPED BY LICENSE');
  console.log('='.repeat(80) + '\n');
  
  // Group by license
  const grouped: LicenseGroup = {};
  for (const license of licenses) {
    if (!grouped[license.license]) {
      grouped[license.license] = [];
    }
    grouped[license.license].push(license);
  }
  
  // Sort license groups by number of packages (descending)
  const sortedLicenses = Object.entries(grouped)
    .sort(([, a], [, b]) => b.length - a.length);
  
  for (const [licenseName, packages] of sortedLicenses) {
    console.log(`\n${licenseName} (${packages.length} package${packages.length !== 1 ? 's' : ''})`);
    console.log('-'.repeat(80));
    
    // Sort packages by name
    packages.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const pkg of packages) {
      console.log(`  • ${pkg.name} (${pkg.version})`);
      if (pkg.licenseUrl) {
        console.log(`    ${pkg.licenseUrl}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${licenses.length} packages across ${sortedLicenses.length} license types`);
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
