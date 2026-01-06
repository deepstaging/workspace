#!/usr/bin/env bash

# Helper script for .envrc to set up workspace script aliases
# This is called from .envrc to keep that file clean and simple

# Arguments:
#   $1 - SCRIPT_BIN_DIR: Directory where symlinks/wrappers will be created
#   $2 - DEEPSTAGING_ORG_ROOT: Root directory of the organization
#   $3 - DEBUG_ENVRC: Debug flag (0 or 1)

SCRIPT_BIN_DIR="$1"
DEEPSTAGING_ORG_ROOT="$2"
DEBUG_ENVRC="${3:-0}"

debug() {
    if [[ "$DEBUG_ENVRC" == "1" ]]; then
        echo "[direnv debug] $*" >&2
    fi
}

# Clean bin directory first to remove stale aliases
if [ -d "$SCRIPT_BIN_DIR" ]; then
    debug "Cleaning stale aliases from $SCRIPT_BIN_DIR"
    rm -rf "$SCRIPT_BIN_DIR"/*
fi

mkdir -p "$SCRIPT_BIN_DIR"

script_count=0

# Scan all subdirectories for scripts directories
for dir in "$DEEPSTAGING_ORG_ROOT"/*/; do
    dir_name=$(basename "$dir")
    # Normalize to lowercase snake_case for prefix
    normalized_name=$(echo "$dir_name" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//' | tr '-' '_')
    
    scripts_dir="${dir}scripts"
    
    # Check if scripts directory exists
    if [[ -d "$scripts_dir" ]]; then
        debug "Found scripts directory: $scripts_dir"
        
        # Check if parent has package.json (TypeScript scripts)
        has_package_json=false
        if [[ -f "${dir}package.json" ]]; then
            has_package_json=true
            debug "  Repository has package.json (TypeScript scripts available)"
        fi
        
        # Create symlinks/wrappers for each script
        for script in "$scripts_dir"/*; do
            # Skip directories, lib/, and non-executable files
            [[ -d "$script" ]] && continue
            [[ "$(basename "$script")" == "lib" ]] && continue
            [[ ! -x "$script" && ! "$script" =~ \.ts$ ]] && continue
            
            script_name=$(basename "$script")
            
            # Handle TypeScript scripts (.ts files)
            if [[ "$script_name" == *.ts && "$has_package_json" == true ]]; then
                # TypeScript script - create tsx wrapper
                base_name="${script_name%.ts}"
                # Normalize name: replace underscores/spaces with dashes, convert to lowercase
                normalized_base=$(echo "$base_name" | tr '_' '-' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
                prefixed_name="${normalized_name}-${normalized_base}"
                
                cat > "$SCRIPT_BIN_DIR/$prefixed_name" << WRAPPER
#!/usr/bin/env bash
# Auto-generated wrapper for TypeScript script: $base_name
REPO_DIR="\${DEEPSTAGING_ORG_ROOT}/$dir_name"
cd "\$REPO_DIR" && npx tsx "scripts/$script_name" "\$@"
WRAPPER
                chmod +x "$SCRIPT_BIN_DIR/$prefixed_name"
                debug "  Created command: $prefixed_name -> tsx scripts/$script_name"
                ((script_count++))
                
            # Handle bash scripts (.sh or executable files)
            elif [[ "$script_name" =~ \.sh$ ]] || [[ -x "$script" ]]; then
                base_name="${script_name%.sh}"
                # Normalize name: replace underscores/spaces with dashes, convert to lowercase
                normalized_base=$(echo "$base_name" | tr '_' '-' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
                prefixed_name="${normalized_name}-${normalized_base}"
                ln -sf "$script" "$SCRIPT_BIN_DIR/$prefixed_name"
                debug "  Created command: $prefixed_name -> $script"
                ((script_count++))
            fi
        done
    fi
done

debug "Created $script_count script commands"
echo "$script_count"
