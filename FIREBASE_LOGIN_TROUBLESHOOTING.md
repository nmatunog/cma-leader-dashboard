# Fix: Firebase Network Error on Login

## 🚨 Error You're Seeing

```
Firebase: Error (auth/network-request-failed)
Failed to load resource: net::ERR_TIMED_OUT
```

This indicates Firebase Authentication cannot connect to Firebase servers.

## Possible Causes

1. **Firebase environment variables not set correctly in Vercel**
2. **Firebase project configuration issue**
3. **Network/CORS restrictions**
4. **Firebase Authentication not enabled**

## Quick Fixes to Try

### Fix 1: Verify Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select project: `cma-leader-dashboard`
   - Settings → Environment Variables

2. **Verify all 6 variables are set:**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `cma-dashboard-01-5a57b`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **After verifying, trigger a NEW deployment** (variables are embedded at build time)

### Fix 2: Check Firebase Console

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`

2. **Check Authentication:**
   - Go to **Authentication** → **Sign-in method**
   - Verify **Email/Password** is enabled
   - If not, enable it

3. **Check Authorized Domains:**
   - Go to **Authentication** → **Settings** → **Authorized domains**
   - Make sure your Vercel domain is listed:
     - `cma-leader-dashboard.vercel.app`
     - `*.vercel.app` (if using preview deployments)
   - Add it if missing

### Fix 3: Check Firebase Project ID

Verify the project ID matches:
- Vercel env var: `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `cma-dashboard-01-5a57b`
- Firebase Console project ID should match

### Fix 4: Test Firebase Connection

The network timeout suggests Firebase can't be reached. This could be:
- **Firewall/Network issue** - Try from a different network
- **Firebase service outage** - Check Firebase status
- **Incorrect API key** - Verify API key in Vercel matches Firebase Console

## Immediate Action

1. **Check Vercel environment variables** (most likely issue)
2. **Verify Firebase Authentication is enabled**
3. **Check authorized domains in Firebase**
4. **Trigger a new deployment** after fixing variables

---

**Most likely issue: Environment variables not set correctly in Vercel production environment.**

