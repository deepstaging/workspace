/**
 * Type definitions for bootstrap
 */

export interface DeepstagingEnv {
  DEEPSTAGING_ORG_ROOT: string;
  DEEPSTAGING_WORKSPACE_DIR: string;
  DEEPSTAGING_REPOSITORIES_DIR: string;
  DEEPSTAGING_GITHUB_ORG: string;
  DEEPSTAGING_LOCAL_NUGET_FEED: string;
}

export interface BootstrapOptions {
  autoYes: boolean;
}

export interface DependencyCheck {
  missing: string[];
  installed: string[];
}

export interface BootstrapHint {
  type: 'info' | 'warning' | 'action';
  title: string;
  message: string;
  commands?: string[];
}

export class BootstrapContext {
  hints: BootstrapHint[] = [];
  
  addHint(hint: BootstrapHint): void {
    this.hints.push(hint);
  }
}
