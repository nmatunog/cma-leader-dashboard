#!/bin/bash

# Auto-commit script - Commits changes after a period of inactivity
# Usage: Run this script in the background while working
# It will commit changes when files haven't been modified for X minutes

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Configuration
INACTIVITY_MINUTES=${AUTO_COMMIT_INACTIVITY:-5}  # Default: 5 minutes of inactivity
COMMIT_MESSAGE_PREFIX="Auto-save:"
LAST_COMMIT_FILE="$PROJECT_DIR/.last-auto-commit"

# Function to check if there are uncommitted changes
has_changes() {
    git diff --quiet && git diff --cached --quiet
    return $?
}

# Function to get last file modification time
get_last_modification() {
    # Find the most recent modification time of tracked files
    git ls-files -z | xargs -0 stat -f "%m" 2>/dev/null | sort -n | tail -1
}

# Function to commit changes
auto_commit() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local message="${COMMIT_MESSAGE_PREFIX} Work in progress at ${timestamp}"
    
    # Stage all changes (respects .gitignore)
    git add -A
    
    # Check if there's anything to commit
    if git diff --cached --quiet; then
        return 0  # Nothing to commit
    fi
    
    # Commit
    git commit -m "$message" --no-verify
    
    # Update last commit timestamp
    echo "$(date +%s)" > "$LAST_COMMIT_FILE"
    
    echo "[Auto-commit] Committed changes at ${timestamp}"
}

# Main loop
echo "Auto-commit started. Monitoring for ${INACTIVITY_MINUTES} minutes of inactivity..."
echo "Press Ctrl+C to stop"

while true; do
    # Check if there are changes
    if ! has_changes; then
        # Get last modification time
        last_mod=$(get_last_modification)
        current_time=$(date +%s)
        inactivity_seconds=$((current_time - last_mod))
        inactivity_minutes=$((inactivity_seconds / 60))
        
        # If inactive for the threshold, commit
        if [ $inactivity_minutes -ge $INACTIVITY_MINUTES ]; then
            auto_commit
        fi
    fi
    
    # Check every minute
    sleep 60
done

