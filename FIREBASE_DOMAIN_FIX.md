# Firebase Authorized Domains - Correct Setup

## ❌ Cannot Add Wildcard Domains

Firebase **does NOT support** wildcard domains like `*.vercel.app` in authorized domains.

## ✅ Solution: Add Your Specific Domain

Instead, add your **exact Vercel domain**:

### Step 1: Find Your Exact Vercel Domain

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select project: `cma-leader-dashboard`
   - Go to **Settings** → **Domains**

2. **Check your production domain**
   - It should be something like: `cma-leader-dashboard.vercel.app`
   - Or a custom domain if you set one up

### Step 2: Add to Firebase

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`
   - Authentication → Settings → Authorized domains

2. **Add your exact domain:**
   - Click "Add domain"
   - Enter: **`cma-leader-dashboard.vercel.app`** (or your exact domain)
   - Click "Add"

3. **If you have a custom domain**, add that too:
   - Example: `dashboard.yourcompany.com`

## What About Preview Deployments?

For preview deployments (pull requests), you have two options:

### Option 1: Add Each Preview Domain (Manual)
- Each preview gets a unique domain like `cma-leader-dashboard-git-branch-name.vercel.app`
- You'd need to add each one manually (not practical)

### Option 2: Use Production Domain Only (Recommended)
- Just add your production domain: `cma-leader-dashboard.vercel.app`
- Preview deployments will use the same Firebase config
- This is usually fine for testing

### Option 3: Use Custom Domain (Best for Production)
- Set up a custom domain in Vercel
- Add that custom domain to Firebase
- All deployments (production and preview) can use it

## Quick Fix

**Just add:** `cma-leader-dashboard.vercel.app`

That's all you need for now. Preview deployments will work with the same Firebase config.

---

**Add only your specific production domain - no wildcards needed!**

