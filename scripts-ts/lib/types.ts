/**
 * Type definitions for the workspace scripts
 */

export interface RepositoryInfo {
  name: string;
  path: string;
  branch: string;
  commitCount: number;
  hasUncommittedChanges: boolean;
  commitsAhead: number;
  hasRemote: boolean;
  statusMessage: string;
}

export interface SyncOptions {
  allowFreshHistory: boolean;
  orgRoot: string;
  githubOrg: string;
}

export interface CommitStrategy {
  type: 'ai' | 'custom' | 'default';
  message?: string;
  perRepo?: boolean;
}

export interface RepoCommitMessages {
  [repoName: string]: string;
}
