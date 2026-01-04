# .copilot Directory

This directory stores GitHub Copilot agent-specific configuration and memory for the Deepstaging workspace.

## Purpose

- Persistent agent state across sessions
- Workspace-wide context that spans multiple repositories
- Custom settings and configurations specific to GitHub Copilot

## Usage

GitHub Copilot CLI and extensions will use this directory when working in this workspace.

## Note

This directory is workspace-scoped. Individual repositories (deepstaging, effects, etc.) should not have their own `.copilot` directories to maintain clean, portable repos.
