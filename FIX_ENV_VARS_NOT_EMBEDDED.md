# Fix: Environment Variables Not Embedded in Build

If Firebase environment variables are verified during build but not embedded in the JavaScript bundle, follow these steps:

## Step 1: Verify Variables Are Set in Netlify

1. Go to Netlify Dashboard → Site settings → Environment variables
2. Verify ALL 6 variables are present:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. Check that each has "All scopes" selected

## Step 2: Delete and Re-add Variables (Sometimes Helps)

Sometimes Netlify needs variables to be re-added:

1. **Delete all 6 Firebase variables** (one by one)
2. **Add them back** with the exact same values
3. **Ensure "All scopes" is selected** for each
4. **Save each one**

## Step 3: Trigger a Fresh Deployment

1. Go to Deploys tab
2. Click "Trigger deploy" → "Clear cache and deploy site"
   - **Important:** Use "Clear cache" option to ensure a clean build
3. Wait for build to complete

## Step 4: Verify in Build Logs

During the build, check the logs for:

```
✅ NEXT_PUBLIC_FIREBASE_API_KEY
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
...
✅ All required environment variables are set!
```

Then check that Next.js build completes successfully.

## Step 5: Alternative - Check Build Command

If still not working, the issue might be that Next.js needs the variables during its build step.

Verify in Netlify that the build command is: `npm run build`

This should automatically make `NEXT_PUBLIC_*` variables available to Next.js.

## Step 6: Manual Verification

After deployment, check the JavaScript bundle again:

1. Open site in browser
2. DevTools → Network → JS filter
3. Click on a `.js` file
4. Response tab → Search for `AIzaSyB`
5. Should see the Firebase values embedded

## If Still Not Working

Try this workaround - add variables directly in netlify.toml (NOT RECOMMENDED FOR PRODUCTION, but useful for testing):

```toml
[build.environment]
NODE_VERSION = "20"
NEXT_PUBLIC_FIREBASE_API_KEY = "your-key-here"
# ... etc
```

But the proper way is to have them in Netlify UI Environment Variables.



