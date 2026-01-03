#!/bin/bash

# Alternative: Watch for file changes and commit after inactivity
# This version uses fswatch (macOS) or inotifywait (Linux)

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

INACTIVITY_SECONDS=${AUTO_COMMIT_INACTIVITY:-300}  # Default: 5 minutes (300 seconds)
COMMIT_MESSAGE_PREFIX="Auto-save:"
LAST_ACTIVITY=$(date +%s)

# Function to commit changes
auto_commit() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local message="${COMMIT_MESSAGE_PREFIX} Work in progress at ${timestamp}"
    
    git add -A
    
    if ! git diff --cached --quiet; then
        git commit -m "$message" --no-verify
        echo "[Auto-commit] Committed at ${timestamp}"
    fi
}

# Function to check and commit if needed
check_and_commit() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - LAST_ACTIVITY))
    
    if [ $elapsed -ge $INACTIVITY_SECONDS ]; then
        if ! git diff --quiet && ! git diff --cached --quiet; then
            auto_commit
        fi
    fi
}

# Check for fswatch (macOS) or inotifywait (Linux)
if command -v fswatch &> /dev/null; then
    echo "Using fswatch (macOS). Auto-committing after ${INACTIVITY_SECONDS}s of inactivity..."
    fswatch -o "$PROJECT_DIR" --exclude='\.git' --exclude='node_modules' | while read; do
        LAST_ACTIVITY=$(date +%s)
        # Start a background timer
        (sleep $INACTIVITY_SECONDS && check_and_commit) &
    done
elif command -v inotifywait &> /dev/null; then
    echo "Using inotifywait (Linux). Auto-committing after ${INACTIVITY_SECONDS}s of inactivity..."
    inotifywait -m -r -e modify,create,delete "$PROJECT_DIR" --exclude '\.git|node_modules' | while read; do
        LAST_ACTIVITY=$(date +%s)
        (sleep $INACTIVITY_SECONDS && check_and_commit) &
    done
else
    echo "Error: fswatch (macOS) or inotifywait (Linux) not found."
    echo "Install fswatch: brew install fswatch"
    echo "Or use the simpler auto-commit.sh script instead."
    exit 1
fi


