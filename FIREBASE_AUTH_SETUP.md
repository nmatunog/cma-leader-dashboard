# Firebase Authentication Setup Guide

This guide covers everything you need to configure in Firebase Console for authentication to work.

## Prerequisites

- Firebase project created
- Firebase Console access: https://console.firebase.google.com

---

## Step 1: Enable Email/Password Authentication

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project (`cma-dashboard-01`)

2. **Navigate to Authentication**
   - Click **"Authentication"** in the left sidebar
   - If you see "Get started", click it (first time setup)

3. **Enable Email/Password Provider**
   - Click on the **"Sign-in method"** tab
   - Find **"Email/Password"** in the list of providers
   - Click on it
   - **Enable** the toggle at the top
   - Leave "Email link (passwordless sign-in)" as **disabled** (optional, not needed)
   - Click **"Save"**

✅ **Done!** Email/Password authentication is now enabled.

---

## Step 2: Configure Authorized Domains (Optional but Recommended)

This allows your app to authenticate from specific domains.

1. **In Authentication section**
   - Still in **Authentication** → **Settings** tab
   - Scroll down to **"Authorized domains"**

2. **Add domains** (these are usually pre-configured):
   - `localhost` - Should already be there for local development
   - Your production domain (when deployed)
   - Example: `your-app.vercel.app` or `your-app.firebaseapp.com`

3. **For local development**: `localhost` should already be authorized by default.

---

## Step 3: Get Firebase Configuration (if not already done)

You need these values in your `.env.local` file:

1. **Go to Project Settings**
   - Click the **gear icon** (⚙️) next to "Project Overview"
   - Click **"Project settings"**

2. **Scroll to "Your apps" section**
   - If you don't have a web app, click **"Add app"** → Select **Web** icon (</>)
   - If you already have a web app, click on it

3. **Copy Configuration Values**
   You'll see something like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef...",
     measurementId: "G-XXXXXXXXXX"
   };
   ```

4. **Map to Environment Variables**
   Copy these values to your `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=<apiKey value>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain value>
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<projectId value>
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket value>
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId value>
   NEXT_PUBLIC_FIREBASE_APP_ID=<appId value>
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<measurementId value> (optional)
   ```

---

## Step 4: Firestore Database Setup

Authentication works, but you also need Firestore for user data:

1. **Go to Firestore Database**
   - Click **"Firestore Database"** in left sidebar
   - If you see "Create database", click it

2. **Choose Mode**
   - Select **"Start in production mode"** (we'll set rules next)
   - Or **"Start in test mode"** (for development only, less secure)

3. **Choose Location**
   - Select a location (e.g., `us-central1`, `asia-southeast1`)
   - Click **"Enable"**

4. **Wait for Database Creation**
   - Takes a minute or two

---

## Step 5: Set Up Firestore Security Rules

1. **Go to Firestore Database** → **Rules** tab

2. **Update Rules** (temporary for setup, we'll tighten later):

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Temporarily allow authenticated users to read/write users collection
       // This allows the setup page to check for existing admins
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       
       // Allow authenticated users to read/write their own goals
       match /strategic_planning_goals/{goalId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
       
       // Other collections
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Click "Publish"**

⚠️ **Note**: These are temporary rules for initial setup. After creating your admin user, you should tighten these rules (see `FIRESTORE_SECURITY_RULES.md` for production rules).

---

## Step 6: Verify Setup

### Check Authentication
1. Go to **Authentication** → **Users** tab
2. Should be empty initially (you'll create first user via `/setup` page)

### Check Firestore
1. Go to **Firestore Database** → **Data** tab
2. Should show empty database
3. Collections will be created automatically when you create users

---

## Summary Checklist

- [ ] Email/Password authentication enabled
- [ ] Firebase configuration values copied to `.env.local`
- [ ] Firestore Database created
- [ ] Firestore security rules updated (temporary rules for setup)
- [ ] Dev server restarted after updating `.env.local`
- [ ] Browser hard-refreshed (Cmd+Shift+R / Ctrl+Shift+R)

---

## Next Steps After Firebase Setup

1. **Verify Environment Variables**
   - Visit `http://localhost:3000/test-env` to check if variables are loaded

2. **Create Admin User**
   - Visit `http://localhost:3000/setup`
   - Create your first admin account

3. **Test Authentication**
   - Log in with your admin credentials
   - Verify access to admin features

4. **Update Security Rules** (after setup)
   - Once admin user is created, update Firestore rules to be more restrictive
   - See `FIRESTORE_SECURITY_RULES.md` for production rules

---

## Troubleshooting

### "Email/Password is not enabled" error
- Go to Authentication → Sign-in method → Email/Password → Enable

### "User already exists" error
- Check Authentication → Users tab
- Delete the user if it exists and try again

### "Permission denied" in Firestore
- Check Firestore → Rules tab
- Ensure rules allow authenticated access
- Make sure user is actually authenticated

### Environment variables not loading
- Verify `.env.local` file exists in project root
- Restart dev server after creating/editing `.env.local`
- Hard refresh browser (Cmd+Shift+R)
- Visit `/test-env` page to verify variables are loaded

