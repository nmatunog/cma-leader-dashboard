# How to Select a Different Commit in Vercel

## Current Situation

You're on a **specific deployment page** (showing commit `79c2fed`). To deploy a different commit, you need to start a **NEW deployment** from the main Deployments page.

## Step-by-Step Instructions

### Step 1: Go to Main Deployments Page

1. **Click on "cma-leader-dashboard"** at the top (or use the breadcrumb navigation)
   - This takes you back to the project overview

2. **Click "Deployments" tab** (top navigation bar)
   - This shows ALL deployments, not just one

### Step 2: Start New Deployment

1. **Look for the "Deploy" button** (usually top right, blue/green button)
   - It might say "Deploy" or have a "+" icon

2. **Click "Deploy"**

3. **A modal/popup will appear** with options:
   - **Branch:** Select `main`
   - **Commit:** This is where you can select which commit!
     - You should see a dropdown or list
     - **Select the LATEST commit** (`98cfed9` or `15edeb2`)
     - **NOT** `79c2fed` (that's the old one)

4. **Click "Deploy"** in the modal

### Alternative: If You Don't See Commit Selection

If the Deploy button doesn't show commit selection:

1. **Make sure you push the latest commit first:**
   ```bash
   cd /Users/nmatunog2/2CMA/cma-leader-dashboard
   git push origin main
   ```

2. **Then click "Deploy"** - it should automatically use the latest commit from GitHub

## Visual Guide

```
Vercel Dashboard
  └─ cma-leader-dashboard (project)
      └─ Deployments Tab (click here!)
          └─ [Deploy] button (top right)
              └─ Modal appears:
                  ├─ Branch: main
                  ├─ Commit: [Dropdown - SELECT LATEST HERE]
                  └─ [Deploy] button
```

## Important Notes

- **"Redeploy"** button = Uses the SAME commit (don't use this)
- **"Deploy"** button = Creates NEW deployment (use this, and select commit)

## If You Still Can't Find It

1. **Push the latest commit first:**
   ```bash
   git push origin main
   ```

2. **Wait 30 seconds** for Vercel to detect the push

3. **Check if auto-deploy started** - Vercel might automatically deploy the latest commit

4. **If not, go to Deployments tab → Click "Deploy"**

---

**Go to: Project → Deployments Tab → Click "Deploy" → Select Latest Commit!**

