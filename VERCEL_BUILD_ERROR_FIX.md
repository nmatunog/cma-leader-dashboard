# Fix: Vercel Build Error - @radix-ui Package Version

## 🚨 Error You're Seeing

```
npm error code ETARGET
npm error notarget No matching version found for @radix-ui/react-dialog
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
```

This means the `@radix-ui/react-dialog` version `^1.1.15` specified in `package.json` doesn't exist.

---

## ✅ Solution: Update Package Versions

The Radix UI packages need to be updated to valid versions. Here's the fix:

### Step 1: Update package.json

Open `package.json` and update these lines in the `dependencies` section:

**Change FROM:**
```json
"@radix-ui/react-dialog": "^1.1.15",
"@radix-ui/react-dropdown-menu": "^2.1.16",
"@radix-ui/react-label": "^2.2.8",
"@radix-ui/react-slot": "^1.2.4",
```

**Change TO:**
```json
"@radix-ui/react-dialog": "^1.1.2",
"@radix-ui/react-dropdown-menu": "^2.1.2",
"@radix-ui/react-label": "^2.1.0",
"@radix-ui/react-slot": "^1.1.0",
```

Or use the latest stable versions (recommended):
```json
"@radix-ui/react-dialog": "^1.1.2",
"@radix-ui/react-dropdown-menu": "^2.1.2",
"@radix-ui/react-label": "^2.1.0",
"@radix-ui/react-slot": "^1.1.0",
```

### Step 2: Update package-lock.json

Run this command in your terminal:

```bash
cd /Users/nmatunog2/2CMA/cma-leader-dashboard
rm package-lock.json
npm install
```

This will:
- Remove the old lock file
- Install with the updated versions
- Generate a new package-lock.json

### Step 3: Commit and Push

```bash
git add package.json package-lock.json
git commit -m "Fix @radix-ui package versions for Vercel deployment"
git push origin main
```

### Step 4: Redeploy in Vercel

After pushing:
- Vercel will automatically trigger a new deployment (if auto-deploy is enabled)
- Or go to Vercel dashboard → Deployments → Click "Redeploy"

---

## Alternative: Use Latest Compatible Versions

If you want to use the latest versions, you can also try:

```json
"@radix-ui/react-dialog": "^1.1.2",
"@radix-ui/react-dropdown-menu": "^2.1.2",
"@radix-ui/react-label": "^2.1.0",
"@radix-ui/react-slot": "^1.1.0",
```

These are known stable versions that work with Next.js 16 and React 19.

---

## Why This Happened

The versions specified (`1.1.15`, `2.1.16`, etc.) don't exist in the npm registry. The `^` caret allows minor and patch updates, but npm couldn't find any version that matches the range starting from those base versions.

---

## Verify It Works

After updating and pushing:

1. **Check Vercel build logs** - Should show successful `npm install`
2. **Verify build completes** - No more ETARGET errors
3. **Test your site** - Make sure Radix UI components still work

---

## Quick Fix Command

Run this in your terminal to update all at once:

```bash
cd /Users/nmatunog2/2CMA/cma-leader-dashboard

# Update package.json (you'll need to edit it manually first, then run):
npm install @radix-ui/react-dialog@^1.1.2 @radix-ui/react-dropdown-menu@^2.1.2 @radix-ui/react-label@^2.1.0 @radix-ui/react-slot@^1.1.0

# Commit and push
git add package.json package-lock.json
git commit -m "Fix @radix-ui package versions for Vercel"
git push origin main
```

---

**After fixing the package versions, the Vercel build should succeed!**

