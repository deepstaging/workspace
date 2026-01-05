#!/usr/bin/env tsx

/**
 * Sync local repositories to GitHub organization
 */

import { Command } from 'commander';
import path from 'path';
import { scanRepositories, commitChanges, pushRepository, getGithubRepoName } from './lib/git.js';
import { checkGitHubAuth, getExistingRepos, ensureRepoExists, configureRemote } from './lib/github.js';
import {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  displayRepositoryStatus,
  selectCommitStrategy,
  selectRepositories,
} from './lib/ui.js';
import {
  checkCopilotAvailable,
  generateCommitMessage,
  generateDefaultMessage,
  promptCustomMessage,
} from './lib/ai.js';
import { confirm, input } from '@inquirer/prompts';

const program = new Command();

program
  .name('sync-repos')
  .description('Sync local repositories to GitHub organization')
  .option('--fresh-history', 'Enable dangerous fresh initial commit and force push option')
  .parse(process.argv);

const options = program.opts();

async function main() {
  printHeader();

  // Determine org root (parent of workspace directory)
  const orgRoot = path.resolve(import.meta.dirname, '..', '..');
  const githubOrg = process.env.DEEPSTAGING_GITHUB_ORG || 'deepstaging';

  console.log(`Organization root: ${orgRoot}`);
  console.log(`GitHub org: ${githubOrg}`);
  console.log();

  // Check GitHub authentication
  if (!(await checkGitHubAuth())) {
    printError('GitHub CLI not authenticated');
    console.log('Run: gh auth login');
    process.exit(1);
  }
  printSuccess('GitHub CLI authenticated');
  console.log();

  // Fetch existing repos from GitHub
  console.log('Fetching existing repositories from GitHub...');
  const existingRepos = await getExistingRepos(githubOrg);
  console.log(`Found ${existingRepos.length} repositories on GitHub`);
  console.log();

  // Scan local repositories
  const repos = await scanRepositories(orgRoot);

  if (repos.length === 0) {
    printWarning('No git repositories found');
    process.exit(0);
  }

  printSuccess(`Scanned ${repos.length} repositories`);
  displayRepositoryStatus(repos);

  // Check if any repos need attention
  const needsAttention = repos.filter(
    r => r.hasUncommittedChanges || r.commitsAhead > 0
  );

  if (needsAttention.length === 0) {
    printSuccess('All repositories are up to date!');
    process.exit(0);
  }

  // Check for uncommitted changes
  const hasUncommitted = repos.some(r => r.hasUncommittedChanges);

  if (hasUncommitted) {
    printWarning('Some repositories have uncommitted changes');
    console.log();

    const shouldCommit = await confirm({
      message: 'Create commits for repositories with changes?',
      default: false,
    });

    if (shouldCommit) {
      const strategy = await selectCommitStrategy();
      let commitMessage: string;

      switch (strategy) {
        case 'ai':
          if (!(await checkCopilotAvailable())) {
            printError('GitHub Copilot CLI not available');
            console.log('Install with: brew install --cask copilot-cli');
            console.log('Falling back to default message...');
            commitMessage = await generateDefaultMessage();
          } else {
            // Generate AI messages for each repo
            for (const repo of repos) {
              if (!repo.hasUncommittedChanges) continue;

              const aiMessage = await generateCommitMessage(repo.path, repo.name);
              if (aiMessage) {
                await commitChanges(repo.path, aiMessage);
                printSuccess(`Committed changes in: ${repo.name}`);
              } else {
                printWarning(`Skipped ${repo.name} (no AI message generated)`);
              }
            }
            printSuccess('Commits created');
            console.log();
            
            // Re-scan to update status
            const updatedRepos = await scanRepositories(orgRoot);
            displayRepositoryStatus(updatedRepos);
            
            // Continue with push
            const selected = await selectRepositories(updatedRepos.filter(r => r.commitsAhead > 0));
            if (selected.length === 0) {
              console.log('No repositories selected. Exiting.');
              process.exit(0);
            }
            
            await pushRepositories(selected, updatedRepos, orgRoot, githubOrg, existingRepos);
            return;
          }
          break;

        case 'custom':
          commitMessage = await promptCustomMessage();
          break;

        case 'default':
          commitMessage = await generateDefaultMessage();
          console.log(`Using default message: "${commitMessage}"`);
          break;
      }

      // Commit all repos with uncommitted changes using the same message (unless AI was used)
      if (strategy !== 'ai') {
        for (const repo of repos) {
          if (repo.hasUncommittedChanges) {
            await commitChanges(repo.path, commitMessage);
            printSuccess(`Committed changes in: ${repo.name}`);
          }
        }
        printSuccess('Commits created');
        console.log();
      }
    }
  }

  // Select repos to push
  console.log('Select repositories to push:');
  const selected = await selectRepositories(needsAttention);

  if (selected.length === 0) {
    console.log('No repositories selected. Exiting.');
    process.exit(0);
  }

  await pushRepositories(selected, repos, orgRoot, githubOrg, existingRepos);
}

async function pushRepositories(
  selected: string[],
  repos: any[],
  orgRoot: string,
  githubOrg: string,
  existingRepos: string[]
) {
  console.log();
  console.log(`Selected ${selected.length} repository(ies) to push`);
  console.log();

  for (const repoName of selected) {
    const repo = repos.find(r => r.name === repoName);
    if (!repo) continue;

    console.log(`📦 Processing: ${repoName}`);
    console.log('─'.repeat(60));

    // Get GitHub repo name (handle special mappings)
    const githubRepoName = getGithubRepoName(repoName);

    // Ensure repo exists on GitHub
    if (!(await ensureRepoExists(githubRepoName, githubOrg, existingRepos))) {
      printWarning(`Skipping ${repoName} (not on GitHub)`);
      console.log();
      continue;
    }

    // Configure remote
    await configureRemote(repo.path, githubRepoName, githubOrg);

    // Push
    if (repo.hasRemote) {
      try {
        console.log(`  Pushing to origin/${repo.branch}...`);
        await pushRepository(repo.path, repo.branch);
        printSuccess(`Pushed ${repoName}`);
      } catch (error: any) {
        printError(`Failed to push ${repoName}: ${error.message}`);
      }
    }

    console.log();
  }

  printSuccess('Sync complete!');
}

// Run the main function
main().catch((error) => {
  printError(`Error: ${error.message}`);
  process.exit(1);
});
