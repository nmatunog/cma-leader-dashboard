# Fix: Build Error - Module not found: firebase-admin

## Problem

Vercel build is failing with:
```
Module not found: Can't resolve 'firebase-admin'
```

## Root Cause

The `firebase-admin` package is in your local `package.json`, but the changes to `package.json` and `package-lock.json` weren't committed and pushed to GitHub. Vercel builds from GitHub, so it doesn't have `firebase-admin` in its dependencies.

## Solution

Commit and push `package.json` and `package-lock.json`:

```bash
git add package.json package-lock.json
git commit -m "Add firebase-admin dependency for temp password feature"
git push origin main
```

## Verify

After pushing:
1. Check Vercel build logs - it should install `firebase-admin`
2. Build should succeed
3. Temp password features should work in production

## Alternative: Install Locally First

If package-lock.json is out of sync, you might need to:

```bash
npm install firebase-admin
git add package.json package-lock.json
git commit -m "Add firebase-admin dependency"
git push origin main
```


