#!/usr/bin/env bash
set -euo pipefail

# Create a new Roslyn tooling project from Deepstaging template
# Usage: ./new-roslyn-project.sh ProjectName [options]
# Run from: workspace/scripts directory
# Creates: ../project-name (sibling to workspace)
#
# Examples:
#   ./new-roslyn-project.sh MyAwesomeTool
#   ./new-roslyn-project.sh MyTool --no-sample
#   ./new-roslyn-project.sh MyTool --with-docs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve script location (follow symlinks)
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
    SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
    SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
    [[ $SCRIPT_PATH != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Running from workspace/scripts directory
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ORG_DIR="$(cd "$WORKSPACE_DIR/.." && pwd)"
DEEPSTAGING_REPO="$ORG_DIR/deepstaging"

TEMPLATE_PATH="$DEEPSTAGING_REPO/packages/Deepstaging.Templates"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Show usage
usage() {
    cat << EOF
Usage: $0 <ProjectName> [options]

Creates a new Roslyn tooling project from the Deepstaging template.

Arguments:
  ProjectName         Name of the project (e.g., MyAwesomeTool)

Options:
  --no-sample         Exclude the sample consumer project
  --with-docs         Include DocFX documentation site setup
  --help              Show this help message

Examples:
  $0 MyAwesomeTool
  $0 MyTool --no-sample
  $0 MyTool --with-docs

Output Location:
  Project will be created at: $ORG_DIR/<project-name>/

Template Location:
  Using template from: $TEMPLATE_PATH
EOF
}

# Parse arguments
if [ $# -lt 1 ]; then
    usage
    exit 1
fi

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    usage
    exit 0
fi

PROJECT_NAME="$1"
shift

# Validate project name
if [ -z "$PROJECT_NAME" ]; then
    error "Project name cannot be empty"
fi

# Convert to kebab-case for directory name
PROJECT_DIR_NAME=$(echo "$PROJECT_NAME" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]')
PROJECT_DIR="$ORG_DIR/$PROJECT_DIR_NAME"

# Parse template options
TEMPLATE_ARGS=""
while [ $# -gt 0 ]; do
    case "$1" in
        --no-sample)
            TEMPLATE_ARGS="$TEMPLATE_ARGS --IncludeSample false"
            shift
            ;;
        --with-docs)
            TEMPLATE_ARGS="$TEMPLATE_ARGS --IncludeDocs true"
            shift
            ;;
        *)
            warn "Unknown option: $1"
            shift
            ;;
    esac
done

# Validate template exists
if [ ! -d "$TEMPLATE_PATH" ]; then
    error "Template not found at: $TEMPLATE_PATH"
fi

if [ ! -f "$TEMPLATE_PATH/Deepstaging.Templates.csproj" ]; then
    error "Template package not found. Expected: $TEMPLATE_PATH/Deepstaging.Templates.csproj"
fi

# Validate output directory doesn't exist
if [ -d "$PROJECT_DIR" ]; then
    error "Directory already exists: $PROJECT_DIR"
fi

# Display configuration
info "Configuration:"
echo "  Project name:    $PROJECT_NAME"
echo "  Directory name:  $PROJECT_DIR_NAME"
echo "  Output location: $PROJECT_DIR"
echo "  Template path:   $TEMPLATE_PATH"
if [ -n "$TEMPLATE_ARGS" ]; then
    echo "  Template args:  $TEMPLATE_ARGS"
fi
echo ""

# Ensure template is installed
info "Checking template installation..."
if ! dotnet new list | grep -q "deepstaging-roslyn"; then
    info "Installing template from local path..."
    dotnet new install "$TEMPLATE_PATH" || error "Failed to install template"
    success "Template installed"
else
    # Uninstall and reinstall to ensure we have the latest version
    info "Reinstalling template to ensure latest version..."
    dotnet new uninstall Deepstaging.Templates 2>/dev/null || true
    dotnet new install "$TEMPLATE_PATH" --force || error "Failed to install template"
    success "Template updated"
fi

# Create project directory
info "Creating project directory: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR" || error "Failed to create directory"

# Generate project from template (dotnet new creates files in current directory)
info "Generating project from template..."
cd "$PROJECT_DIR"

# The template outputs to current directory with the project name
# We want files directly in PROJECT_DIR, so pass output to current dir
dotnet new deepstaging-roslyn -n "$PROJECT_NAME" -o . $TEMPLATE_ARGS || error "Failed to generate project"

success "Project created successfully!"
echo ""

# Show next steps
info "Next steps:"
echo "  cd $PROJECT_DIR"
echo "  dotnet build"
echo "  dotnet test"
if [[ "$TEMPLATE_ARGS" != *"--IncludeSample false"* ]]; then
    echo "  dotnet run --project $PROJECT_NAME.Sample"
fi
echo ""

# Initialize git if not already a repo
if [ ! -d ".git" ]; then
    info "Initializing git repository..."
    git init -q
    git add .
    git commit -q -m "Initial commit: $PROJECT_NAME from Deepstaging template"
    success "Git repository initialized"
    echo ""
fi

success "Done! Project is ready at: $PROJECT_DIR"
