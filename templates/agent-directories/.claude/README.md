# .claude Directory

This directory stores Claude (Anthropic) agent-specific context and memory for the Deepstaging workspace.

## Purpose

- Persistent agent memory across sessions
- Workspace-wide context that spans multiple repositories
- Custom instructions and configurations specific to Claude

## Usage

Claude Code and other Claude-based tools will automatically use this directory when working in this workspace.

## Note

This directory is workspace-scoped. Individual product repositories should not have their own `.claude` directories to maintain clean, portable repos.
