# How to Verify Environment Variables in Vercel

## ✅ Good News: Environment Variables Are Saved!

Once you add environment variables in Vercel, **they are saved permanently** and used for all deployments. You **DO NOT need to add them again** unless:
- You deleted them
- You want to change the values
- They were never added in the first place

---

## How to Check if Environment Variables Are Set

### Step 1: Go to Vercel Dashboard

1. Go to **https://vercel.com/dashboard**
2. Click on your project: **`cma-leader-dashboard`**

### Step 2: Check Environment Variables

1. Click **"Settings"** (top navigation bar)
2. Click **"Environment Variables"** (left sidebar, under "Configuration")
3. You should see a list of all your environment variables

### Step 3: Verify All 6 Variables Are Present

Check that you have these **6 variables**:

```
✅ NEXT_PUBLIC_FIREBASE_API_KEY
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
✅ NEXT_PUBLIC_FIREBASE_APP_ID
```

### Step 4: Verify Environment Selection

For each variable, check that it's applied to:
- ✅ Production
- ✅ Preview
- ✅ Development

(You should see checkmarks or indicators showing which environments each variable is applied to)

---

## What to Look For

### ✅ Correct Setup
- All 6 variables are listed
- Each variable shows it's applied to Production, Preview, and Development
- Variable names are **exact** (case-sensitive): `NEXT_PUBLIC_FIREBASE_API_KEY` (not `EXT_PUBLIC_...`)

### ❌ Missing Variables
- Less than 6 variables
- Some variables are missing
- **Action:** Add the missing ones

### ❌ Wrong Environment Selection
- Variables only show "Production" checked
- Missing "Preview" or "Development"
- **Action:** Click "Edit" on each variable and select all 3 environments

---

## Quick Verification Checklist

- [ ] All 6 Firebase variables are present
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` value is: `cma-dashboard-01-5a57b`
- [ ] Each variable shows it's applied to Production, Preview, and Development
- [ ] Variable names match exactly (no typos, correct case)

---

## If Variables Are Missing

If you don't see all 6 variables, you need to add them:

1. Click **"Add New"** button
2. Enter the variable name (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. Enter the value
4. **Select all 3 environments:** Production, Preview, Development
5. Click **"Save"**
6. Repeat for each missing variable

---

## Important Notes

### Environment Variables Persist
- ✅ Once added, they stay saved
- ✅ Used for all future deployments
- ✅ No need to re-add for each deployment
- ✅ Survive redeployments

### When You Need to Update
- Changing a value
- Adding a new variable
- Removing an old variable
- Changing which environments they apply to

### After Adding/Changing Variables
- **Important:** You need to trigger a NEW deployment for changes to take effect
- Environment variables are embedded at build time
- Existing deployments won't be affected until you redeploy

---

## Your Current Situation

Since you mentioned you "done the environment variables" earlier, they should already be saved. 

**You do NOT need to add them again** - just verify they're all there using the steps above.

---

**Check your Vercel dashboard now to confirm all 6 variables are saved!**

