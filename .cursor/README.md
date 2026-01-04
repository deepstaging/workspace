# .cursor Directory

This directory stores Cursor editor agent-specific configuration and memory for the Deepstaging workspace.

## Purpose

- Persistent agent state across sessions
- Workspace-wide context that spans multiple repositories
- Custom settings and configurations specific to Cursor AI

## Usage

Cursor editor and its AI features will use this directory when working in this workspace.

## Note

This directory is workspace-scoped. Individual repositories (deepstaging, effects, etc.) should not have their own `.cursor` directories to maintain clean, portable repos.
