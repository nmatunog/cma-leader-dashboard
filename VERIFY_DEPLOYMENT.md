# How to Verify Environment Variables Are in the Client Bundle

If you're still seeing Firebase errors after deployment, verify that the environment variables are actually embedded in the JavaScript bundle.

## Step 1: Check Which Deployment is Live

1. Go to Netlify Dashboard → **Deploys** tab
2. Find the deployment with all ✅ checks (from around 6:14 PM)
3. **Verify it says "Published"** (not "Building" or "Deploying")
4. If it's not published, wait for it to complete

## Step 2: Verify Variables in JavaScript Bundle

1. Open your live site in a browser
2. Open DevTools (F12)
3. Go to **Network** tab
4. Refresh the page
5. Find a JavaScript file (like `_next/static/chunks/...js`)
6. Click on it to view the content
7. Press `Ctrl+F` (or `Cmd+F` on Mac) to search
8. Search for: `NEXT_PUBLIC_FIREBASE_API_KEY`
9. You should see the actual value embedded, like: `AIzaSyB-000CE5tvs5gXwcMKXvhnEM_GhBQtSCU`

**If you DON'T see the values embedded:**
- The environment variables weren't available during the build
- Try triggering another deployment

**If you DO see the values embedded:**
- The variables are there, but the code isn't reading them correctly
- Check browser cache issues

## Step 3: Hard Refresh

Even in incognito mode, try:
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`
- Or: DevTools → Right-click refresh button → "Empty Cache and Hard Reload"

## Step 4: Check Build Logs Again

1. Go to the deployment logs
2. Look for the "Deploy site" section at the bottom
3. Verify it completed successfully
4. Check if there were any warnings about environment variables

## Alternative: Test Directly in Browser Console

Open browser console and type:

```javascript
// Check if variables are accessible (they should be embedded, not accessible this way)
// But this will show if process.env is available
console.log(process.env);
```

Note: `NEXT_PUBLIC_*` variables are embedded at build time, so they won't show in `process.env` in the browser console, but they should be in the JavaScript bundle code itself.

## If Still Not Working

1. Double-check Netlify environment variables are set correctly
2. Make sure you triggered a NEW deployment AFTER setting the variables
3. Wait for deployment to fully complete (status: "Published")
4. Try accessing from a different browser/device
5. Check if there are multiple Netlify sites (make sure you're testing the right one)

