# Fix: Firebase Environment Variables Not Available in Client-Side

## Problem
The deployed app shows errors that Firebase environment variables are missing, even though they're set in Netlify. This happens because:

1. **Environment variables must be set BEFORE the build** - If variables are added after a build, they won't be embedded in the client bundle
2. **Next.js embeds `NEXT_PUBLIC_*` variables at build time** - They become part of the JavaScript bundle
3. **Variables need to be redeployed** - After adding/changing variables, a new build is required

## Solution Steps

### Step 1: Verify Variables in Netlify UI
1. Go to **Netlify Dashboard** → Your site
2. **Site settings** → **Environment variables**
3. Verify all 6 variables are present:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 2: Trigger a New Deploy
**CRITICAL**: After verifying variables are set, you MUST trigger a new deploy:

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for the build to complete

**Why?** Next.js embeds environment variables during the build process. If variables were added after the last build, they won't be in the deployed bundle.

### Step 3: Verify Variables Are Embedded
After deployment, check the browser console:
- ✅ No Firebase errors = Variables are embedded correctly
- ❌ Still seeing errors = Variables may not be set correctly

## Common Issues

### Issue 1: Variables Added After Build
**Symptom**: Variables are set in Netlify but app still shows errors  
**Fix**: Trigger a new deploy after adding variables

### Issue 2: Typo in Variable Name
**Symptom**: One variable missing (e.g., `EXT_PUBLIC_` instead of `NEXT_PUBLIC_`)  
**Fix**: Check variable names match exactly (case-sensitive)

### Issue 3: Variables Not Set for All Scopes
**Symptom**: Variables work in some contexts but not others  
**Fix**: Set scope to "All scopes" for each variable

## Quick Checklist

- [ ] All 6 Firebase variables are set in Netlify
- [ ] Variable names are spelled correctly (case-sensitive)
- [ ] Scope is set to "All scopes" for each variable
- [ ] A new deploy was triggered after setting variables
- [ ] Build completed successfully
- [ ] No Firebase errors in browser console

## Testing

After redeploying, test by:
1. Opening the deployed site
2. Opening browser DevTools → Console
3. Checking for Firebase errors
4. If errors persist, verify variables are set correctly in Netlify UI

---

**Remember**: Environment variables are embedded at BUILD TIME, not runtime. Always redeploy after adding/changing variables!

