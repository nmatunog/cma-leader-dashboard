# Debugging Environment Variables

If Firebase environment variables are not loading, try these steps:

## Issue: Environment Variables Not Loading in Next.js

In Next.js, `NEXT_PUBLIC_` variables are embedded into the JavaScript bundle at **build time** or **dev server start time**. They are NOT available at runtime from `.env.local` in the browser.

## Solution Steps

### 1. Verify .env.local File

Check that `.env.local` exists in the project root and contains all required variables:

```bash
cat .env.local
```

Should show:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 2. Restart Dev Server

**CRITICAL**: After creating or modifying `.env.local`, you MUST restart the dev server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

Environment variables are only loaded when the dev server starts.

### 3. Hard Refresh Browser

After restarting the server, hard refresh your browser:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

This clears cached JavaScript that might not have the environment variables.

### 4. Verify Variables Are Loaded

Create a test page to verify variables are accessible:

1. Create `app/test-env/page.tsx`:
```typescript
export default function TestEnv() {
  return (
    <div>
      <h1>Environment Variables Test</h1>
      <p>API_KEY: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'LOADED' : 'MISSING'}</p>
      <p>PROJECT_ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING'}</p>
    </div>
  );
}
```

2. Visit `http://localhost:3000/test-env`
3. Check if variables show "LOADED" or actual values

### 5. Check for Typos

Common issues:
- ❌ `.env` instead of `.env.local`
- ❌ Variables not starting with `NEXT_PUBLIC_`
- ❌ Spaces around `=` sign: `KEY = value` (should be `KEY=value`)
- ❌ Quotes around values when not needed
- ❌ Missing variables

### 6. Check File Location

`.env.local` must be in the **project root** (same directory as `package.json`), not in `app/` or `public/`.

### 7. Clear Next.js Cache

If variables still don't load, clear the Next.js cache:

```bash
rm -rf .next
npm run dev
```

### 8. Check Terminal Output

When you start `npm run dev`, you should see:
```
- Environments: .env.local
```

This confirms Next.js found and loaded `.env.local`.

## Still Not Working?

1. Verify the file is actually named `.env.local` (not `.env.local.txt` or something else)
2. Check file permissions
3. Try creating a simple test variable:
   ```
   NEXT_PUBLIC_TEST=hello
   ```
   Then in your code: `console.log(process.env.NEXT_PUBLIC_TEST)`
4. If test variable works but Firebase vars don't, check for hidden characters or encoding issues

## For Production Deployment

- **Vercel**: Add variables in Vercel dashboard → Settings → Environment Variables
- **Firebase Hosting**: Set in Cloud Run service environment variables
- Variables must be set in the deployment platform, not just `.env.local`

