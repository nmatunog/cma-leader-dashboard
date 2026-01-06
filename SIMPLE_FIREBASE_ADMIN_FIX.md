# Simple Fix for Firebase Admin SDK Error

## The Problem
Error: "The default Firebase app does not exist. Make sure you call initializeApp() before using any of the Firebase services."

## The Solution

**You don't need to do anything in Firebase Console!** Everything is already configured.

The only issue is that **Next.js only loads `.env.local` when the server STARTS**.

## Steps to Fix:

1. **Stop your dev server completely:**
   - Find the terminal where `npm run dev` is running
   - Press `Ctrl+C` to stop it
   - Wait until it's completely stopped

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to fully start:**
   - Look for messages like "Ready" or "Local: http://localhost:3000"
   - Wait a few seconds after that

4. **Try the "Set Temp" button again**

## Why This Happens

- Environment variables in `.env.local` are only read when Next.js starts
- If you change `.env.local` while the server is running, it won't see the changes
- You MUST restart the server for changes to take effect

## Verification

The environment variables are already in your `.env.local` file:
- ✅ `FIREBASE_PROJECT_ID=cma-dashboard-01-5a57b`
- ✅ `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@...`
- ✅ `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."`

They just need the server to restart to be loaded into memory.

## Nothing Else Needed in Firebase

You don't need to:
- ❌ Enable any APIs (they're already enabled)
- ❌ Change any permissions (service account already has them)
- ❌ Create any new keys (the key is already downloaded)
- ❌ Configure any settings (everything is set up)

The service account key you downloaded has all the permissions it needs.


