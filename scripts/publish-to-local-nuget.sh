#!/bin/bash
set -e

# Convenience wrapper for publishing Deepstaging core
# This is just a shortcut - you can also use: ./publish.sh deepstaging [--restore-deps]
#
# Usage:
#   ./scripts/publish-to-local-nuget.sh [--restore-deps]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Just delegate to publish.sh
"$SCRIPT_DIR/publish.sh" deepstaging "$@"
