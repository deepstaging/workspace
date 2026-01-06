/**
 * Type definitions for bootstrap
 */

export interface DeepstagingEnv {
  DEEPSTAGING_ORG_ROOT: string;
  DEEPSTAGING_WORKSPACE_DIR: string;
  DEEPSTAGING_REPOSITORIES_DIR: string;
  DEEPSTAGING_GITHUB_ORG: string;
  DEEPSTAGING_LOCAL_NUGET_FEED: string;
  DEEPSTAGING_ARTIFACTS_DIR: string;
}

export interface BootstrapOptions {
  autoYes: boolean;
}

export interface DependencyCheck {
  missing: string[];
  installed: string[];
}
