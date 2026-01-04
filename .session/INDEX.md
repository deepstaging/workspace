# Deepstaging Workspace Documentation Index

**Welcome!** This index helps you find the right documentation quickly.

## 🚀 Quick Start

**New to the workspace?** Start here:
1. Read: [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md) - Learn the repo structure standard
2. Read: [`GETTING_STARTED.md`](GETTING_STARTED.md) - Daily workflow guide
3. Try: `../scripts/publish.sh deepstaging --restore-deps`

## 📚 Documentation by Topic

### Repository Structure & Conventions

**Start here for new projects:**

- **[`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md)** ⭐
  - Quick reference for the standard repo structure
  - Why we adopted this convention
  - TL;DR for busy developers

- **[`REPO_STRUCTURE_CONVENTION.md`](REPO_STRUCTURE_CONVENTION.md)**
  - Detailed convention documentation
  - Comparison of different approaches
  - Examples and rationale

- **[`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md)**
  - Step-by-step guide for restructuring existing repos
  - Deepstaging and Effects migration plans
  - Testing and rollback procedures

### Package Publishing

**How to publish and manage packages:**

- **[`GETTING_STARTED.md`](GETTING_STARTED.md)** ⭐
  - Daily usage guide for auto-discovery publishing
  - Common workflows
  - Troubleshooting tips

- **[`AUTO_DISCOVERY.md`](AUTO_DISCOVERY.md)**
  - How the auto-discovery system works
  - Why it's better than manual configuration
  - Architecture and benefits

- **[`LOCAL_NUGET_PATTERN.md`](LOCAL_NUGET_PATTERN.md)**
  - Complete guide to local NuGet development pattern
  - When to use it
  - Adding new packages
  - Performance characteristics

- **[`PACKAGE_REGISTRY.md`](PACKAGE_REGISTRY.md)**
  - Human-readable package reference
  - Dependency graph
  - Auto-discovery commands

- **[`PUBLISHING_STATUS.md`](PUBLISHING_STATUS.md)**
  - Current implementation status
  - Known issues
  - What's working, what's pending

### Scripts & Automation

**Understanding and using the scripts:**

- **[`SCRIPT_CONSOLIDATION.md`](SCRIPT_CONSOLIDATION.md)**
  - How scripts were simplified
  - What was removed and why
  - Architecture improvements

- **[`../scripts/README.md`](../scripts/README.md)**
  - Overview of all scripts
  - Which to use when
  - Decision tree

### Project Creation

**Creating new Roslyn projects:**

- **[`NEW_PROJECT_GUIDE.md`](NEW_PROJECT_GUIDE.md)**
  - Comprehensive guide to creating projects
  - Understanding the template structure
  - Customization options

- **[`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)**
  - Quick reference for `new-roslyn-project.sh`
  - Common commands
  - Cheat sheet

## 🎯 Find What You Need

### I want to...

#### **Create a new package**
→ Read: [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md)
→ Use: `../scripts/new-roslyn-project.sh ProjectName`

#### **Publish a package**
→ Read: [`GETTING_STARTED.md`](GETTING_STARTED.md)
→ Use: `../scripts/publish.sh repo-name --restore-deps`

#### **Find out what depends on my package**
→ Read: [`AUTO_DISCOVERY.md`](AUTO_DISCOVERY.md)
→ Use: `../scripts/discover-dependents.sh PackageName`

#### **Understand the repo structure standard**
→ Read: [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md) (quick)
→ Or: [`REPO_STRUCTURE_CONVENTION.md`](REPO_STRUCTURE_CONVENTION.md) (detailed)

#### **Migrate an existing repo to the standard**
→ Read: [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md)
→ Plan: Migration during next refactor (no urgency)

#### **Understand how auto-discovery works**
→ Read: [`AUTO_DISCOVERY.md`](AUTO_DISCOVERY.md)
→ See: Code in `../scripts/discover-dependents.sh`

#### **Debug a publishing issue**
→ Read: [`GETTING_STARTED.md`](GETTING_STARTED.md) → Troubleshooting section
→ Check: [`PUBLISHING_STATUS.md`](PUBLISHING_STATUS.md) for known issues

#### **Understand the local NuGet pattern**
→ Read: [`LOCAL_NUGET_PATTERN.md`](LOCAL_NUGET_PATTERN.md)
→ Why: 2-second overhead vs. complexity of project references

## 📖 Reading Order

### For New Team Members

1. [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md) - 5 min
2. [`GETTING_STARTED.md`](GETTING_STARTED.md) - 10 min
3. [`AUTO_DISCOVERY.md`](AUTO_DISCOVERY.md) - 10 min
4. Skim the rest as needed

### For Creating Your First Package

1. [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md)
2. [`NEW_PROJECT_GUIDE.md`](NEW_PROJECT_GUIDE.md)
3. [`GETTING_STARTED.md`](GETTING_STARTED.md)

### For Deep Understanding

1. [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md)
2. [`REPO_STRUCTURE_CONVENTION.md`](REPO_STRUCTURE_CONVENTION.md)
3. [`AUTO_DISCOVERY.md`](AUTO_DISCOVERY.md)
4. [`LOCAL_NUGET_PATTERN.md`](LOCAL_NUGET_PATTERN.md)
5. [`SCRIPT_CONSOLIDATION.md`](SCRIPT_CONSOLIDATION.md)

## 🔍 Quick Reference

### Standard Repo Structure
```
repo-name/
├── src/                        # Source code
├── tests/                      # Tests
├── RepoName.sln               # Solution at root
├── Directory.Build.props
└── Directory.Packages.props
```

### Publishing Commands
```bash
# Publish any package
./scripts/publish.sh repo-name --restore-deps

# Discover dependents
./scripts/discover-dependents.sh PackageName --restore

# Create new project
./scripts/new-roslyn-project.sh ProjectName
```

### Documentation Structure
```
docs/
├── INDEX.md                          # This file
├── CONVENTION_SUMMARY.md             # ⭐ Start here
├── GETTING_STARTED.md                # ⭐ Daily workflows
├── AUTO_DISCOVERY.md                 # How discovery works
├── LOCAL_NUGET_PATTERN.md            # Publishing pattern
├── REPO_STRUCTURE_CONVENTION.md      # Full convention details
├── MIGRATION_GUIDE.md                # Restructuring guide
├── SCRIPT_CONSOLIDATION.md           # Script architecture
├── PACKAGE_REGISTRY.md               # Package reference
├── PUBLISHING_STATUS.md              # Current status
├── NEW_PROJECT_GUIDE.md              # Project creation
└── QUICK_REFERENCE.md                # Command cheat sheet
```

## 💡 Tips

### First Time Here?
Start with [`CONVENTION_SUMMARY.md`](CONVENTION_SUMMARY.md) and [`GETTING_STARTED.md`](GETTING_STARTED.md).

### Need Something Quick?
Check the "I want to..." section above.

### Contributing?
Read the conventions first, then follow them for consistency.

### Confused?
- Check [`GETTING_STARTED.md`](GETTING_STARTED.md) → Troubleshooting
- Look at working examples in existing repos
- Ask for help!

## 🎓 Learning Path

**Beginner:** Understand the basics
- CONVENTION_SUMMARY → GETTING_STARTED → Hands-on practice

**Intermediate:** Create and publish packages
- NEW_PROJECT_GUIDE → Try creating a package → Publish it

**Advanced:** Understand the architecture
- AUTO_DISCOVERY → SCRIPT_CONSOLIDATION → LOCAL_NUGET_PATTERN

## 📝 Document Status

- **Current:** All docs reflect current implementation (2026-01-04)
- **Maintained:** Updated as system evolves
- **Tested:** Examples verified to work

---

**Questions or suggestions?** Update this index or the relevant documentation!
