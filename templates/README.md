# Templates Directory

This directory contains template files and directories that are copied by the bootstrap script to set up the workspace environment.

## Contents

### `agent-directories/`
Agent-specific configuration directories that get copied to the org root:
- `.copilot/` - GitHub Copilot agent configuration
- `.cursor/` - Cursor editor agent configuration  
- `.claude/` - Claude (Anthropic) agent configuration

These directories establish workspace-scoped agent context that spans multiple repositories.

### `script-wrappers/`
Template shell scripts used by repository-create to generate wrapper commands for each repository.

## Usage

Bootstrap and other workspace scripts automatically reference these templates during setup operations.
