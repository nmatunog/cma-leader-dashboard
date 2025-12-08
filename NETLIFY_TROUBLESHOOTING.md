# Netlify Deployment Troubleshooting Guide

## Current Issue: Build Failing

The build log you provided only shows pre-build steps. We need the **full build log** to diagnose the exact error.

## Step 1: Get the Full Build Log

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Click on your site

2. **Open the Failed Deploy**
   - Click on the failed deploy (it will show a red ❌ or "Failed" status)
   - Or go to **"Deploys"** tab → Click the latest failed deploy

3. **View Full Logs**
   - Click **"Deploy log"** or **"View build log"**
   - Scroll down to see the **complete log** (not just the first 13 lines)
   - Look for lines that show:
     - `npm install` or `npm ci`
     - `npm run build`
     - Any error messages (usually in red)
     - Stack traces

4. **Copy the Full Error**
   - Scroll to the bottom of the log
   - Copy the error message and stack trace
   - Paste it here for diagnosis

## Step 2: Verify Environment Variables Are Set

**CRITICAL**: Before the build can succeed, you must add Firebase environment variables to Netlify.

### Quick Check:
1. Go to **Site settings** → **Environment variables**
2. Verify these 6 variables are present:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### If Missing:
1. Open `netlify-env-variables.txt` in your project folder
2. Copy each variable and add it to Netlify:
   - **Key**: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - **Value**: `AIzaSyB-O0OCE5tvs5gXwcMKXvhnEM_GhBQtSCU`
   - **Scope**: "All scopes"
   - Click **"Save variable"**
3. Repeat for all 6 variables
4. **Trigger a new deploy** after adding all variables

## Step 3: Test Build Locally

Run this to see if your build works locally:

```bash
cd cma-dashboard
npm run build
```

**Expected behavior:**
- If `.env.local` has Firebase variables → Build should succeed
- If `.env.local` is missing variables → Build will fail (expected)

**To fix local build:**
- Make sure `.env.local` contains all Firebase variables (see `netlify-env-variables.txt`)

## Common Netlify Build Errors

### Error: "Missing required environment variables"
**Cause**: Firebase variables not set in Netlify  
**Fix**: Add all 6 Firebase variables to Netlify (see Step 2)

### Error: "Failed to parse configuration"
**Cause**: Invalid `netlify.toml` syntax  
**Fix**: Check `netlify.toml` for syntax errors (should be clean TOML)

### Error: "Module not found" or "Cannot resolve"
**Cause**: Missing dependency or file  
**Fix**: 
- Verify `package.json` has all dependencies
- Check that all files are committed to GitHub
- Run `npm install` locally to verify dependencies

### Error: "TypeScript errors"
**Cause**: Type errors in code  
**Fix**: Run `npm run type-check` locally and fix reported errors

## Step 4: After Adding Variables

1. **Trigger a new deploy** in Netlify
2. **Watch the build log** in real-time
3. **Copy the full error** if it still fails
4. **Share the error** for further diagnosis

## Quick Reference: Netlify Build Settings

Your `netlify.toml` should have:
```toml
[build]
command = "npm run build"
publish = ".next"
```

**Verify in Netlify UI:**
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Base directory**: (leave empty or set to repository root)

## Need Help?

1. **Get the full build log** (see Step 1)
2. **Verify environment variables** (see Step 2)
3. **Share the complete error message** for diagnosis

---

**Next Steps:**
1. ✅ Add Firebase variables to Netlify
2. ✅ Get full build log from failed deploy
3. ✅ Share the error message for diagnosis

