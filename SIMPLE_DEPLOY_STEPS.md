# Simple Steps to Deploy Latest Commit

## Quick Solution

### Step 1: Push Latest Commit (If Not Already Pushed)

```bash
cd /Users/nmatunog2/2CMA/cma-leader-dashboard
git push origin main
```

### Step 2: In Vercel Dashboard

1. **Click "cma-leader-dashboard"** (top left, project name)
   - This goes back to project overview

2. **Click "Deployments"** (top navigation)

3. **Click the big "Deploy" button** (top right, usually blue/green)

4. **In the popup:**
   - Branch: `main` (should be default)
   - **Look for "Commit" or "Revision" dropdown**
   - **Select the LATEST one** (should be at the top)
   - Click "Deploy"

## If You Don't See Commit Selection

Just click "Deploy" - it should automatically use the latest commit from GitHub after you push.

---

**Push first, then Deploy from main Deployments page!**

