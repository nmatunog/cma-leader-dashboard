# Netlify Configuration via UI

Since netlify.toml was causing parsing errors, configure everything via Netlify UI instead.

## Build Settings

1. Go to **Site settings** > **Build & deploy** > **Build settings**
2. Click **"Edit settings"**
3. Configure:
   - **Base directory**: Leave empty (or `cma-dashboard` if repo root is parent)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

## Environment Variables

1. Go to **Site settings** > **Environment variables**
2. Add each variable:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
3. Set **Scope** to **"All scopes"** for each

## Node Version

1. Go to **Site settings** > **Build & deploy** > **Build settings**
2. Under **"Build environment variables"**, add:
   - Key: `NODE_VERSION`
   - Value: `18`

## Next.js Plugin

1. Go to **Site settings** > **Plugins**
2. Search for **"@netlify/plugin-nextjs"**
3. Click **"Install"**

## Headers & Redirects (Optional)

If you need security headers or redirects:

1. Go to **Site settings** > **Headers & redirects**
2. Add headers/redirects as needed

---

**Note**: With the Next.js plugin installed, Netlify will handle routing automatically. You don't need manual redirects.

