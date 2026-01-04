# Workspace Agent Directory Structure

This workspace repository uses centralized agent configuration for multi-repo development.

## Structure

**After bootstrap, the directory layout is:**
```
~/code/org/deepstaging/              # Parent directory (NOT a git repo)
├── workspace/           # Workspace repo (THIS REPO - git)
│   ├── .claude/                     # Agent state
│   ├── .copilot/                    # Agent state
│   ├── .cursor/                     # Agent state
│   ├── .docs/                       # Session documentation
│   └── scripts/                     # Cross-repo automation
├── deepstaging/                     # Core package (git)
├── effects/                         # Effects package (git)
└── github-profile/                  # Org profile (git)
```

## Agent Directories

### `.claude/`
Claude (Anthropic) agent-specific context, memory, and configuration.
- Session memory spanning all repositories
- Project context across the ecosystem
- Custom instructions

### `.copilot/`
GitHub Copilot agent-specific configuration.
- Copilot settings
- Agent memory across all repos
- Workspace context

### `.cursor/`
Cursor editor agent-specific configuration.
- Cursor settings
- Agent context spanning repositories
- Workspace memory

### `.docs/`
**Permanent workspace knowledge** (git tracked):
- Convention decisions
- Architecture patterns
- Getting started guides
- Cross-repository documentation

### `.session/`
**Temporary session documentation** (gitignored):
- Implementation status
- Planning explorations
- Work-in-progress notes
- Session-specific tracking

## Why Centralized in Workspace Repo?

**Agent directories live in the workspace repository** (not in sibling repos) because:

1. **Shared Context**: Agents work across multiple repositories (`deepstaging/`, `effects/`, etc.)
2. **Clean Repos**: Individual repos remain clean, portable, and can be used standalone
3. **Single Source of Truth**: One place for agent memory spanning the ecosystem
4. **Bootstrap Pattern**: Clone workspace, run script, everything is configured
5. **Easier Management**: Configure once, applies to all repos

## Individual Repository Docs

Each repository has its own `docs/` directory for:
- Public-facing documentation
- API documentation  
- User guides
- Technical specifications

These are **not** agent-generated session docs - they're versioned documentation that ships with the package.

## Pattern

```
workspace/           # This repo - git tracked
├── .claude/                     # Gitignored agent state
├── .copilot/                    # Gitignored agent state
├── .cursor/                     # Gitignored agent state
├── .docs/                       # Git tracked permanent knowledge
├── .session/                    # Gitignored temporary session notes
├── scripts/                     # Git tracked automation
│   └── bootstrap.sh             # Clones sibling repos
└── README.md

../deepstaging/                  # Sibling repo - separate git
└── docs/                        # User-facing docs (git tracked)

../effects/                      # Sibling repo - separate git
└── docs/                        # User-facing docs (git tracked)
```

This structure treats the workspace repo as the "control plane" for development tooling and cross-cutting concerns.
