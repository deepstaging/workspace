#!/bin/bash
# SPDX-FileCopyrightText: 2024-present Deepstaging
# SPDX-License-Identifier: RPL-1.5
#
# Adds SPDX license headers to files that are missing them.
# Usage: ./build/add-license-headers.sh [--staged | --all | file1 file2 ...]

set -e

COPYRIGHT="2024-present Deepstaging"
LICENSE="RPL-1.5"

add_header() {
    local file="$1"
    local ext="${file##*.}"
    
    # Skip if already has header
    # For markdown: check for ## License section
    # For other files: check for SPDX-License-Identifier in first 10 lines
    if [ "$ext" = "md" ]; then
        if grep -q "^## License" "$file" 2>/dev/null; then
            return 0
        fi
    else
        if head -n 10 "$file" 2>/dev/null | grep -q "SPDX-License-Identifier"; then
            return 0
        fi
    fi
    
    local header=""
    local tmp_file=$(mktemp)
    
    case "$ext" in
        cs|csx)
            header="// SPDX-FileCopyrightText: $COPYRIGHT
// SPDX-License-Identifier: $LICENSE
"
            echo -n "$header" > "$tmp_file"
            cat "$file" >> "$tmp_file"
            ;;
        sh|ps1|yaml|yml)
            # For shell scripts, preserve shebang
            if head -n 1 "$file" | grep -q "^#!"; then
                head -n 1 "$file" > "$tmp_file"
                echo "# SPDX-FileCopyrightText: $COPYRIGHT" >> "$tmp_file"
                echo "# SPDX-License-Identifier: $LICENSE" >> "$tmp_file"
                tail -n +2 "$file" >> "$tmp_file"
            else
                header="# SPDX-FileCopyrightText: $COPYRIGHT
# SPDX-License-Identifier: $LICENSE
"
                echo -n "$header" > "$tmp_file"
                cat "$file" >> "$tmp_file"
            fi
            ;;
        props|targets|xml|csproj)
            # For XML, insert after XML declaration if present, otherwise at top
            if head -n 1 "$file" | grep -q "^<?xml"; then
                head -n 1 "$file" > "$tmp_file"
                echo "<!-- SPDX-FileCopyrightText: $COPYRIGHT -->" >> "$tmp_file"
                echo "<!-- SPDX-License-Identifier: $LICENSE -->" >> "$tmp_file"
                tail -n +2 "$file" >> "$tmp_file"
            else
                header="<!-- SPDX-FileCopyrightText: $COPYRIGHT -->
<!-- SPDX-License-Identifier: $LICENSE -->
"
                echo -n "$header" > "$tmp_file"
                cat "$file" >> "$tmp_file"
            fi
            ;;
        json)
            # JSON doesn't support comments, so we skip or use a workaround
            # Some tools recognize a top-level "__license" field
            echo "⚠️  Skipping $file (JSON doesn't support comments)"
            rm "$tmp_file"
            return 0
            ;;
        *)
            rm "$tmp_file"
            return 0
            ;;
    esac
    
    mv "$tmp_file" "$file"
    echo "✅ Added header to $file"
}

# File extensions to process
EXTENSIONS="cs|csx|ps1|sh|yaml|yml|props|targets|xml|csproj"

get_files() {
    local mode="$1"
    
    case "$mode" in
        --staged)
            git diff --cached --name-only --diff-filter=d 2>/dev/null | grep -E "\.($EXTENSIONS)$" || true
            ;;
        --all)
            find . -type f \( -name "*.cs" -o -name "*.csx" -o -name "*.sh" -o -name "*.ps1" \
                -o -name "*.yaml" -o -name "*.yml" -o -name "*.props" -o -name "*.targets" \
                -o -name "*.xml" -o -name "*.csproj" \) \
                ! -path "./obj/*" ! -path "./bin/*" ! -path "./artifacts/*" \
                ! -path "./.git/*" ! -path "./.husky/_/*" \
                ! -name "*.verified.*" ! -name "*.g.cs" 2>/dev/null
            ;;
        *)
            echo "$@"
            ;;
    esac
}

# Parse arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [--staged | --all | file1 file2 ...]"
    echo ""
    echo "  --staged  Add headers to staged git files"
    echo "  --all     Add headers to all matching files in repo"
    echo "  file...   Add headers to specific files"
    exit 1
fi

FILES=$(get_files "$@")

if [ -z "$FILES" ]; then
    echo "No matching files found"
    exit 0
fi

for file in $FILES; do
    # Skip generated/external files
    if echo "$file" | grep -qE "(\.verified\.|\.g\.cs|/obj/|/bin/|node_modules/)"; then
        continue
    fi
    
    if [ -f "$file" ]; then
        add_header "$file"
    fi
done

echo ""
echo "Done! Run 'git diff' to review changes."
