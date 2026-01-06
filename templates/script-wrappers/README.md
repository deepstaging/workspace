# Wrapper Script Templates

This directory contains templates for wrapper scripts that are generated in each repository.

## Available Templates

### publish.sh.template
Wrapper for `workspace-packages-publish` that provides repository-specific defaults.

**Template Variables:**
- `{{REPO_NAME}}` - PascalCase repository name (e.g., "Deepstaging")
- `{{REPO_KEY}}` - Kebab-case repository key for workspace scripts (e.g., "deepstaging")

## Usage

These templates are automatically processed by `repository-create.ts` when creating new repositories. The script:

1. Reads the template files from this directory
2. Replaces template variables with repository-specific values
3. Writes the generated scripts to the new repository's `scripts/` directory
4. Sets appropriate file permissions (e.g., `chmod +x` for shell scripts)

## Adding New Wrapper Scripts

To add a new wrapper script template:

1. Create a new `.template` file in this directory
2. Use `{{REPO_NAME}}` and `{{REPO_KEY}}` as needed
3. Update `repository-create.ts` to process the new template
4. Document the template and its variables in this README
