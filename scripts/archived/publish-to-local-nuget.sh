#!/bin/bash
set -e

# Convenience wrapper for publishing Deepstaging core
# This is just a shortcut - you can also use: ./publish.sh deepstaging [--restore-deps]
#
# Usage:
#   ./scripts/publish-to-local-nuget.sh [--restore-deps]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME=$(basename "$0")

show_help() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Convenience wrapper to publish the Deepstaging core repository.

OPTIONS:
    --restore-deps     Restore packages in dependent repositories after publishing
    --help, -h         Show this help message

DESCRIPTION:
    This is a shortcut for: publish.sh deepstaging [--restore-deps]
    
    It builds and publishes Deepstaging packages to the local NuGet feed.

EXAMPLES:
    $SCRIPT_NAME                      # Publish Deepstaging
    $SCRIPT_NAME --restore-deps       # Publish and restore dependents

SEE ALSO:
    publish.sh --help                 # General publish script

EOF
}

# Check for help
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# Just delegate to publish.sh
"$SCRIPT_DIR/publish.sh" deepstaging "$@"
