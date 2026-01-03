# Quick Fix: Firebase Login Network Error

## 🚨 Problem

Cannot login - getting `Firebase: Error (auth/network-request-failed)`

## ✅ Most Likely Fix: Add Vercel Domain to Firebase

The network error usually means Firebase doesn't recognize your Vercel domain.

### Step 1: Add Vercel Domain to Firebase

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`

2. **Go to Authentication**
   - Click **Authentication** in left sidebar
   - Click **Settings** tab
   - Scroll to **Authorized domains**

3. **Add Your Vercel Domain**
   - Click **"Add domain"**
   - Enter: `cma-leader-dashboard.vercel.app`
   - Click **"Add"**
   - Also add: `*.vercel.app` (for preview deployments)

### Step 2: Verify Environment Variables

1. **Go to Vercel Dashboard**
   - Settings → Environment Variables

2. **Verify these are set:**
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `cma-dashboard-01-5a57b`
   - All other Firebase variables

3. **If you changed anything, trigger a new deployment**

### Step 3: Verify Email/Password is Enabled

1. **In Firebase Console**
   - Authentication → Sign-in method
   - Make sure **Email/Password** is **Enabled**

## After Fixing

1. **Wait 1-2 minutes** for Firebase to update
2. **Try logging in again**
3. **If still fails, check browser console for new errors**

---

**Most common issue: Vercel domain not in Firebase authorized domains list!**

