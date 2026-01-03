# Auto-Commit Setup Guide

This setup helps prevent losing work by automatically committing changes after periods of inactivity.

## Option 1: Simple Timer-Based Auto-Commit (Recommended)

This script checks for changes every minute and commits if files haven't been modified for a set period.

### Setup:

1. **Start the auto-commit script**:
   ```bash
   # Default: commits after 5 minutes of inactivity
   ./scripts/auto-commit.sh
   
   # Or set custom inactivity time (in minutes)
   AUTO_COMMIT_INACTIVITY=10 ./scripts/auto-commit.sh
   ```

2. **Run in background** (so you can keep working):
   ```bash
   nohup ./scripts/auto-commit.sh > .auto-commit.log 2>&1 &
   ```

3. **Stop the script**:
   ```bash
   pkill -f auto-commit.sh
   ```

### How it works:
- Monitors your project files every minute
- If files haven't been modified for X minutes (default: 5), it commits all changes
- Commit messages: `Auto-save: Work in progress at [timestamp]`
- Respects `.gitignore` - won't commit ignored files

---

## Option 2: File-Watch Based Auto-Commit

This version watches for file changes and commits after inactivity.

### Prerequisites:

**macOS:**
```bash
brew install fswatch
```

**Linux:**
```bash
sudo apt-get install inotify-tools  # Ubuntu/Debian
```

### Setup:

1. **Start the watcher**:
   ```bash
   # Default: commits after 5 minutes (300 seconds) of inactivity
   ./scripts/auto-commit-watch.sh
   
   # Custom inactivity time (in seconds)
   AUTO_COMMIT_INACTIVITY=600 ./scripts/auto-commit-watch.sh  # 10 minutes
   ```

2. **Run in background**:
   ```bash
   nohup ./scripts/auto-commit-watch.sh > .auto-commit.log 2>&1 &
   ```

---

## Option 3: Git Hooks (Automatic on certain events)

The `.git/hooks/post-merge` hook will auto-commit uncommitted changes after git pull/merge.

### Enable:

```bash
export AUTO_COMMIT_ENABLED=true
```

Or add to your `~/.zshrc` or `~/.bashrc`:
```bash
export AUTO_COMMIT_ENABLED=true
```

---

## Recommended Workflow

1. **Start auto-commit when you begin working**:
   ```bash
   cd /Users/nmatunog2/2CMA/cma-leader-dashboard
   nohup ./scripts/auto-commit.sh > .auto-commit.log 2>&1 &
   ```

2. **Check if it's running**:
   ```bash
   ps aux | grep auto-commit
   ```

3. **View recent auto-commits**:
   ```bash
   git log --oneline --grep="Auto-save" -10
   ```

4. **Stop when done working**:
   ```bash
   pkill -f auto-commit.sh
   ```

---

## Configuration

### Environment Variables:

- `AUTO_COMMIT_INACTIVITY`: Minutes (for timer) or seconds (for watcher) of inactivity before commit
- `AUTO_COMMIT_ENABLED`: Enable/disable git hooks (`true` or `false`)

### Example `.env.local` or shell config:

```bash
# Auto-commit after 10 minutes of inactivity
export AUTO_COMMIT_INACTIVITY=10

# Enable git hook auto-commits
export AUTO_COMMIT_ENABLED=true
```

---

## Safety Features

- ✅ Respects `.gitignore` - won't commit ignored files
- ✅ Uses `--no-verify` to skip pre-commit hooks (faster)
- ✅ Only commits if there are actual changes
- ✅ Clear commit messages with timestamps
- ✅ Easy to start/stop

---

## Viewing Auto-Commit History

```bash
# See all auto-commits
git log --oneline --grep="Auto-save"

# See what changed in auto-commits
git log --grep="Auto-save" --stat

# Revert an auto-commit if needed
git revert <commit-hash>
```

---

## Troubleshooting

### Script not running:
- Check permissions: `chmod +x scripts/auto-commit.sh`
- Check if already running: `ps aux | grep auto-commit`

### Too many commits:
- Increase `AUTO_COMMIT_INACTIVITY` time
- Stop the script when taking breaks

### Want to disable temporarily:
```bash
pkill -f auto-commit.sh
```

---

## Notes

- Auto-commits are regular git commits - you can revert, squash, or rebase them
- Consider squashing auto-commits before pushing to main branch
- The script runs in the background and won't interrupt your work


