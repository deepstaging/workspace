#!/usr/bin/env node

/**
 * Generate AI commit message using GitHub Copilot CLI
 * Usage: node generate-commit-message.js <repo-path>
 * Returns: Commit message on stdout, exits 0 on success, 1 on failure
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const repoPath = process.argv[2];

if (!repoPath) {
  console.error('Usage: generate-commit-message.js <repo-path>');
  process.exit(1);
}

// Check if copilot is available
try {
  execSync('which copilot', { stdio: 'pipe' });
} catch (error) {
  console.error('⚠️  GitHub Copilot CLI not available');
  console.error('Install with: brew install --cask copilot-cli');
  process.exit(1);
}

// Get git diff info
let gitDiff, gitStats;
try {
  process.chdir(repoPath);
  gitDiff = execSync('git diff --name-status', { encoding: 'utf8' });
  gitStats = execSync('git diff --stat', { encoding: 'utf8' });
} catch (error) {
  console.error('Error reading git diff:', error.message);
  process.exit(1);
}

if (!gitDiff.trim()) {
  console.error('No changes to commit');
  process.exit(1);
}

const repoName = path.basename(repoPath);
const prompt = `Generate a git commit message for these changes in repository '${repoName}':

Files changed:
${gitDiff}

${gitStats}

Provide:
1. A concise subject line (max 50 chars, conventional commit format: type(scope): description)
2. An optional body with bullet points explaining key changes (if substantial changes)

Format exactly as:
subject line here

- bullet point 1
- bullet point 2
(etc)

If changes are minor, just provide the subject line.`;

// Call copilot
console.error('🤖 Generating commit message with Copilot...');
const result = spawnSync('copilot', ['-p', prompt, '--allow-all-tools'], {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'pipe']
});

if (result.error) {
  console.error('Error calling copilot:', result.error.message);
  process.exit(1);
}

const output = result.stdout;

// Extract the commit message (look for conventional commit pattern)
const lines = output.split('\n');
let commitMsg = '';
let inMessage = false;

for (const line of lines) {
  // Look for conventional commit format
  if (/^[a-z]+(\([^)]*\))?:/.test(line)) {
    inMessage = true;
    commitMsg = line + '\n';
  } else if (inMessage && line.trim() === '') {
    commitMsg += '\n';
  } else if (inMessage && line.startsWith('-')) {
    commitMsg += line + '\n';
  } else if (inMessage && line.trim() !== '' && !line.startsWith('```')) {
    // Stop at non-message content
    break;
  }
}

commitMsg = commitMsg.trim();

if (!commitMsg) {
  console.error('Failed to generate valid commit message');
  process.exit(1);
}

// Show the message and ask for confirmation
console.error('');
console.error('Suggested commit message:');
console.error('─────────────────────────────');
console.error(commitMsg);
console.error('─────────────────────────────');
console.error('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr
});

rl.question('Use this message? (Y/n): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() === 'n') {
    console.error('Message rejected');
    process.exit(1);
  }
  
  // Output the message to stdout (this is what the shell script will capture)
  console.log(commitMsg);
  process.exit(0);
});
