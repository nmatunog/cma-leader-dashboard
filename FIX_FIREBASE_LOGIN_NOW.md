# Fix: Cannot Login - Firebase Network Error

## 🚨 Problem

Getting `Firebase: Error (auth/network-request-failed)` when trying to login.

## ✅ Solution: Add Vercel Domain to Firebase

This is the **most common cause** - Firebase doesn't recognize your Vercel domain.

### Step 1: Add Vercel Domain to Firebase (5 minutes)

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: **`cma-dashboard-01-5a57b`**

2. **Go to Authentication**
   - Click **"Authentication"** in left sidebar
   - Click **"Settings"** tab (at the top)
   - Scroll down to **"Authorized domains"** section

3. **Add Your Vercel Domain**
   - Click **"Add domain"** button
   - Enter: **`cma-leader-dashboard.vercel.app`**
   - Click **"Add"**
   - Also add: **`*.vercel.app`** (for preview deployments)

4. **Save** - Changes take effect immediately

### Step 2: Verify Email/Password is Enabled

1. **Still in Firebase Console**
   - Go to **Authentication** → **Sign-in method** tab
   - Find **"Email/Password"** in the list
   - Make sure it's **Enabled** (toggle should be ON)
   - If not, click on it and enable it

### Step 3: Verify Environment Variables in Vercel

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

3. **If you changed anything, trigger a new deployment**

## After Fixing

1. **Wait 1-2 minutes** for Firebase to update
2. **Try logging in again**
3. **Should work now!**

## About Creating New Account

If you tried to create a new account using your code:
- The signup page requires selecting an agency and unit from the hierarchy
- Make sure the hierarchy is initialized (from `/admin/import` page)
- The account will be created with your code and name

---

**Most likely fix: Add `cma-leader-dashboard.vercel.app` to Firebase Authorized Domains!**

