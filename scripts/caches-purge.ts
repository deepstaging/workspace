#!/usr/bin/env tsx

/**
 * Purge Deepstaging NuGet Packages from Local Cache
 * 
 * Removes Deepstaging.* packages from:
 * - NuGet global packages cache
 * - Local NuGet feed
 * - Artifacts directory (DEEPSTAGING_ARTIFACTS_DIR or $ORG_ROOT/artifacts)
 * 
 * Usage:
 *   ./purge-caches.ts
 *   npm run purge-caches
 */

import * as nuget from './lib/nuget.js';
import path from 'path';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

async function removeArtifactsDirectory(orgRoot: string): Promise<boolean> {
  // Use DEEPSTAGING_ARTIFACTS_DIR or default to artifacts in org root
  const artifactsDir = process.env.DEEPSTAGING_ARTIFACTS_DIR || path.join(orgRoot, 'artifacts');
  
  // Check if directory exists
  const exists = await fs.access(artifactsDir).then(() => true).catch(() => false);
  
  if (!exists) {
    return false;
  }
  
  // Remove the artifacts directory
  try {
    await fs.rm(artifactsDir, { recursive: true, force: true });
    console.log(`   - ${artifactsDir}`);
    return true;
  } catch (error) {
    console.warn(`   ⚠️  Failed to remove ${artifactsDir}: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🧹 Purging Deepstaging packages from NuGet caches...\n');

  const orgRoot = process.env.DEEPSTAGING_ORG_ROOT || path.resolve(import.meta.dirname, '..', '..');

  try {
    // Get global packages cache location
    const globalPackagesPath = nuget.getGlobalPackagesPath();
    console.log(`📍 Global packages cache: ${globalPackagesPath}\n`);

    // Find and remove Deepstaging packages from global cache
    console.log('🔍 Finding Deepstaging packages in global cache...');
    const cachedPackages = await nuget.findPackagesInCache(globalPackagesPath, '^deepstaging');

    if (cachedPackages.length === 0) {
      console.log('ℹ️  No Deepstaging packages found in global cache\n');
    } else {
      console.log(`🗑️  Removing ${cachedPackages.length} package(s) from global cache:`);
      for (const pkg of cachedPackages) {
        console.log(`   - ${path.basename(pkg)}`);
      }
      const removed = await nuget.removeDirectories(cachedPackages);
      console.log(`✅ Removed ${removed} package(s)\n`);
    }

    // Get local feed location
    const localFeedPath = nuget.getDefaultFeedPath();
    
    console.log(`📍 Local feed: ${localFeedPath}\n`);

    // Find and remove Deepstaging packages from local feed
    console.log('🔍 Finding Deepstaging packages in local feed...');
    const feedPackages = await nuget.findNupkgInFeed(localFeedPath, '^deepstaging');

    if (feedPackages.length === 0) {
      console.log('ℹ️  No Deepstaging packages found in local feed\n');
    } else {
      console.log(`🗑️  Removing ${feedPackages.length} package(s) from local feed:`);
      for (const pkg of feedPackages) {
        console.log(`   - ${path.basename(pkg)}`);
      }
      const removed = await nuget.removeFiles(feedPackages);
      console.log(`✅ Removed ${removed} package(s)\n`);
    }

    // Remove artifacts directory
    const artifactsDir = process.env.DEEPSTAGING_ARTIFACTS_DIR || path.join(orgRoot, 'artifacts');
    console.log(`📍 Artifacts directory: ${artifactsDir}\n`);
    console.log('🗑️  Removing artifacts directory:');
    const artifactsRemoved = await removeArtifactsDirectory(orgRoot);
    
    if (!artifactsRemoved) {
      console.log('ℹ️  No artifacts directory found\n');
    } else {
      console.log(`✅ Removed artifacts directory\n`);
    }

    console.log('✅ Deepstaging packages and artifacts have been purged!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
