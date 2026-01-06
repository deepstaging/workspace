/**
 * AI commit message generation using GitHub Copilot CLI
 */

import { execSync, spawnSync } from 'child_process';
import { input } from '@inquirer/prompts';
import path from 'path';

export async function checkCopilotAvailable(): Promise<boolean> {
  try {
    execSync('which copilot', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function generateCommitMessage(
  repoPath: string,
  repoName: string
): Promise<string | null> {
  try {
    // Get git diff info
    const gitDiff = execSync('git diff --name-status', {
      cwd: repoPath,
      encoding: 'utf8',
    });

    const gitStats = execSync('git diff --stat', {
      cwd: repoPath,
      encoding: 'utf8',
    });

    if (!gitDiff.trim()) {
      return null;
    }

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

    console.log('🤖 Generating commit message with Copilot...');

    const result = spawnSync('copilot', ['-p', prompt, '--allow-all-tools'], {
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    if (result.error) {
      console.error('Error calling copilot:', result.error.message);
      return null;
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
      return null;
    }

    // Show the message and ask for confirmation
    console.log('');
    console.log('Suggested commit message:');
    console.log('─'.repeat(30));
    console.log(commitMsg);
    console.log('─'.repeat(30));
    console.log('');

    const useIt = await input({
      message: 'Use this message? (Y/n):',
      default: 'Y',
    });

    if (useIt.toLowerCase() === 'n') {
      return null;
    }

    return commitMsg;
  } catch (error) {
    console.error('Error generating AI commit message:', error);
    return null;
  }
}

export async function generateDefaultMessage(): Promise<string> {
  const date = new Date().toISOString().split('T')[0];
  return `Sync changes from ${date}`;
}

export async function promptCustomMessage(): Promise<string> {
  return await input({
    message: 'Enter commit message:',
    required: true,
  });
}
