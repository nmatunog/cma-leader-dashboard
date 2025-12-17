# Deployment Checklist

Use this checklist to ensure everything is properly configured before and after deployment.

## Pre-Deployment Checklist

### ✅ Firebase Setup

- [ ] Firebase project created (`cma-leader-dashboard`)
- [ ] Firestore Database enabled
- [ ] Anonymous Authentication enabled
  - Go to: Firebase Console → Authentication → Sign-in method → Enable Anonymous
- [ ] Firestore Security Rules updated
  - Rules require authentication: `allow read, write: if request.auth != null;`
  - Go to: Firebase Console → Firestore Database → Rules → Publish

### ✅ Firebase Configuration Values

Get these from: Firebase Console → Project Settings → Your apps → Web app

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` = (starts with `AIzaSy...`)
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = (e.g., `cma-leader-dashboard.firebaseapp.com`)
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `cma-leader-dashboard`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = (e.g., `cma-leader-dashboard.firebasestorage.app`)
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = (e.g., `214624637758`)
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` = (e.g., `1:214624637758:web:1982fcfbc796f866dad26f`)

### ✅ Netlify Environment Variables

- [ ] All 6 Firebase environment variables are set in Netlify
  - Go to: Netlify Dashboard → Site settings → Environment variables
  - Verify variable names match EXACTLY (case-sensitive)
  - Each variable has scope set to "All scopes"
- [ ] `NEXT_PUBLIC_ADMIN_PASSWORD` is set (if using custom admin password)
  - Default: `@Nbm0823`

### ✅ Code Changes

- [ ] All code changes committed and pushed to GitHub
- [ ] No uncommitted changes that need to be deployed

## Deployment Steps

### Step 1: Trigger Deployment

1. [ ] Go to Netlify Dashboard → Your site
2. [ ] Go to **Deploys** tab
3. [ ] Click **Trigger deploy** → **Deploy site**
4. [ ] Wait for build to start

### Step 2: Monitor Build

During the build, check the logs for:

- [ ] Type-check passes (no TypeScript errors)
- [ ] Environment variable verification shows all ✅
  - Look for: `✅ NEXT_PUBLIC_FIREBASE_API_KEY`
  - Look for: `✅ All required environment variables are set!`
- [ ] Next.js build completes successfully
- [ ] Deployment completes without timeout

### Step 3: Verify Deployment

After deployment completes, verify:

- [ ] Site is live (no 404 errors)
- [ ] Build status shows "Published"

## Post-Deployment Verification

### Test in Browser

1. [ ] Open site in **incognito/private window** (to avoid cache)
2. [ ] Open browser console (F12)
3. [ ] Check for errors:
   - ✅ No Firebase environment variable warnings
   - ✅ No uncaught errors
   - ✅ No Firebase initialization errors

### Test Login Flow

1. [ ] Go to `/strategic-planning` page
2. [ ] Login modal appears
3. [ ] Enter name and select agency
4. [ ] Click "Advisor" or "Leader" button
5. [ ] User is signed in (loading state shows, then disappears)
6. [ ] Dashboard loads successfully
7. [ ] No Firebase errors in console

### Test Goal Submission

1. [ ] Go to "Goal Setting" tab
2. [ ] Fill in goal data
3. [ ] Click "Submit Goals & Generate PDF"
4. [ ] Submission completes successfully
5. [ ] Success message appears
6. [ ] No errors in console
7. [ ] PDF generates (optional check)

### Test Firebase Connection

In browser console, type:

```javascript
// Should show user object (not null)
console.log(window.firebase?.auth()?.currentUser);
```

Or check:
- [ ] Network tab shows Firebase API calls succeeding (status 200)
- [ ] No 403 (Forbidden) errors from Firestore

### Test Logout

1. [ ] Click "Exit" button
2. [ ] User is signed out from Firebase
3. [ ] Login modal appears again
4. [ ] No errors in console

## Troubleshooting

### If Firebase warnings appear:

- [ ] Verify environment variables are set in Netlify
- [ ] Check that variable names match EXACTLY (no typos)
- [ ] Verify new deployment ran AFTER variables were added
- [ ] Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### If goal submission fails:

- [ ] Check browser console for specific error messages
- [ ] Verify Firebase Anonymous Auth is enabled in Firebase Console
- [ ] Verify Firestore rules allow authenticated users
- [ ] Check Network tab for failed Firestore requests

### If deployment fails:

- [ ] Check build logs for specific errors
- [ ] Verify TypeScript compilation passes locally (`npm run type-check`)
- [ ] Verify build works locally (`npm run build`)
- [ ] Check for timeout issues (should complete in < 5 minutes)

## Quick Verification Commands (Local Testing)

Before deploying, test locally:

```bash
# Type check
npm run type-check

# Build
npm run build

# Verify environment variables (if .env.local exists)
npm run verify-env
```

## Success Indicators

✅ **All checks passed?** Your deployment is successful!

- Firebase is properly configured
- Authentication is working
- Firestore is accessible
- Goal submissions work
- App is secure with authentication required

---

**Need Help?**
- Check Firebase Console for Authentication and Firestore status
- Check Netlify build logs for errors
- Verify all environment variables are set correctly
- Ensure Anonymous Auth is enabled in Firebase



