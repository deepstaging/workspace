#!/bin/bash
# SPDX-FileCopyrightText: 2024-present Deepstaging
# SPDX-License-Identifier: RPL-1.5
#
# Checks that staged files have SPDX license headers.
# Used as a pre-commit hook via Husky.Net.

set -e

# SPDX identifier for this project
EXPECTED_LICENSE="RPL-1.5"

# File extensions to check (excluding json - no comment support)
EXTENSIONS="cs|csx|ps1|sh|yaml|yml|xml|props|targets"

# Get staged files (excluding deleted files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=d 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

MISSING_HEADER=()

for FILE in $STAGED_FILES; do
    # Check if file matches our extensions
    if ! echo "$FILE" | grep -qE "\.($EXTENSIONS)$"; then
        continue
    fi
    
    # Skip generated files and external dependencies
    if echo "$FILE" | grep -qE "(\.verified\.|\.g\.cs|obj/|bin/|node_modules/|\.husky/_)"; then
        continue
    fi
    
    # Check for SPDX-License-Identifier in first 10 lines
    if ! head -n 10 "$FILE" 2>/dev/null | grep -q "SPDX-License-Identifier"; then
        MISSING_HEADER+=("$FILE")
    fi
done

if [ ${#MISSING_HEADER[@]} -gt 0 ]; then
    echo "❌ Missing SPDX license header in the following files:"
    echo ""
    for FILE in "${MISSING_HEADER[@]}"; do
        echo "   $FILE"
    done
    echo ""
    echo "Add the following header to each file:"
    echo ""
    echo "  For C#/C# Script files:"
    echo "    // SPDX-FileCopyrightText: 2024-present Deepstaging"
    echo "    // SPDX-License-Identifier: $EXPECTED_LICENSE"
    echo ""
    echo "  For Shell/YAML/Props files:"
    echo "    # SPDX-FileCopyrightText: 2024-present Deepstaging"
    echo "    # SPDX-License-Identifier: $EXPECTED_LICENSE"
    echo ""
    echo "  For XML/JSON files (after opening tag/brace):"
    echo "    <!-- SPDX-FileCopyrightText: 2024-present Deepstaging -->"
    echo "    <!-- SPDX-License-Identifier: $EXPECTED_LICENSE -->"
    echo ""
    exit 1
fi

echo "✅ All staged files have SPDX license headers"
exit 0
