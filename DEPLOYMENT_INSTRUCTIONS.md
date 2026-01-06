# Deployment Instructions

## ✅ Commits Ready to Push

You have 2 commits ready to push:
1. `cd82fb5` - Add admin temporary password management and emergency reset features
2. `d4709b9` - Simplify login to email-only, remove code-based login

## Step 1: Push to GitHub

Since the automated push failed due to SSL issues, push manually:

```bash
git push origin main
```

Or use GitHub Desktop or your IDE's Git interface.

## Step 2: Update Firestore Rules in Firebase Console

**IMPORTANT:** The `firestore.rules` file in your codebase has been updated, but you need to apply these rules in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-dashboard-01-5a57b`)
3. Go to **Firestore Database** → **Rules** tab
4. Copy the rules from `firestore.rules` file in this repository
5. Paste them into the Firebase Console
6. Click **Publish**

**Key change:** Removed the `allow list: if true;` permission that was causing issues with code-based login queries (no longer needed since we removed code-based login).

## Step 3: Add Environment Variables in Vercel (if not already done)

If you haven't added the Firebase Admin SDK variables yet, add them now:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (if not already present):

```
FIREBASE_PROJECT_ID=cma-dashboard-01-5a57b
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cma-dashboard-01-5a57b.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PASSWORD_ENCRYPTION_KEY=086284f3ea8b651e55b7e2cacc4da423b211e36a706a232caaca067438e3eb0d
ADMIN_EMERGENCY_RESET_PASSWORD=CMA2026-Reset-Emergency!
```

5. Select **Production**, **Preview**, and **Development** for all variables
6. Click **Save**

## Step 4: Deploy to Production

After pushing to GitHub:

1. Vercel will automatically deploy when you push (if auto-deploy is enabled)
2. Or go to Vercel Dashboard → **Deployments** tab
3. Find your latest deployment
4. Click the three dots (⋯) → **Redeploy** if needed

## Step 5: Verify Deployment

After deployment completes:

1. Visit your production URL
2. Test login with email/password (code-based login is removed)
3. Log in as admin
4. Test the temporary password feature:
   - Go to User Management
   - Click "Set Temp" on a user
   - Verify password is generated and displayed
5. Test emergency reset:
   - Click "Emergency" button
   - Verify it works

## What Changed

### Login Changes
- ✅ Removed code-based login (email-only now)
- ✅ Simplified login UI (removed Code/Email toggle)
- ✅ Updated forgot password to email-only
- ✅ Fixed permission errors

### Temp Password Feature
- ✅ Firebase Admin SDK integration
- ✅ Temporary password generation
- ✅ Emergency reset password
- ✅ Encrypted password storage

## Important Notes

- **Firestore Rules:** Must be updated in Firebase Console (not just in code)
- **Environment Variables:** Required for temp password feature to work
- **Code Field:** Still stored in user data, just not used for login
- **Email-Only Login:** All users must use email to log in now


