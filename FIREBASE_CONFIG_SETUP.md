# Firebase Configuration Setup Guide

## What is Firebase Config?

Firebase config is a JavaScript object that contains your Firebase project credentials. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX" // Optional, for Analytics
};
```

## Step 1: Get Your Firebase Config

### Option A: From Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Click **"Project settings"**
5. Scroll down to **"Your apps"** section
6. If you don't have a web app yet:
   - Click **"Add app"** → Select **Web** icon (</>)
   - Register your app (give it a nickname like "CMA Dashboard")
   - Click **"Register app"**
7. You'll see your Firebase config object. It will look like:

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

### Option B: From Your Existing .env.local File

If you already have Firebase config locally, check your `.env.local` file in the `cma-dashboard` folder. It should have values like:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
...
```

## Step 2: Map Firebase Config to Netlify Environment Variables

Take each value from your Firebase config and add it to Netlify with these exact variable names:

| Firebase Config Property | Netlify Environment Variable Name |
|-------------------------|-----------------------------------|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
| `measurementId` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional) |

## Step 3: Add Variables to Netlify

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Click on your site

2. **Navigate to Environment Variables**
   - Click **"Site settings"** (gear icon ⚙️)
   - Go to **"Build & deploy"** → **"Environment"** → **"Environment variables"**

3. **Add Each Variable**
   - Click **"Add a variable"**
   - Enter the **Key** (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
   - Enter the **Value** (copy from Firebase config, e.g., `AIzaSy...`)
   - Set **Scope** to **"All scopes"**
   - Click **"Save variable"**
   - Repeat for all 6 required variables (7 if including measurementId)

## Example: Adding Your First Variable

1. In Netlify: Click **"Add a variable"**
2. **Key**: `NEXT_PUBLIC_FIREBASE_API_KEY`
3. **Value**: Copy the `apiKey` value from Firebase (starts with `AIzaSy...`)
4. **Scope**: Select **"All scopes"**
5. Click **"Save variable"**

Repeat this for all variables.

## Quick Reference: What Each Variable Does

- **API Key**: Public key for Firebase API access
- **Auth Domain**: Domain for Firebase Authentication
- **Project ID**: Your Firebase project identifier
- **Storage Bucket**: Cloud Storage bucket name
- **Messaging Sender ID**: For Firebase Cloud Messaging
- **App ID**: Your Firebase app identifier
- **Measurement ID**: For Google Analytics (optional)

## After Adding Variables

1. **Trigger a new deploy** in Netlify
2. The build should now pass the environment variable check
3. Your app will be able to connect to Firebase

## Security Note

✅ **DO**: Add these in Netlify UI (secure, encrypted)
❌ **DON'T**: Commit these values to GitHub (they're already in .gitignore)

## Troubleshooting

**Can't find Firebase config?**
- Make sure you've created a web app in Firebase Console
- Check Project settings → Your apps section

**Variables not working?**
- Make sure variable names match exactly (case-sensitive)
- Ensure "All scopes" is selected
- Trigger a new deploy after adding variables

**Need to update values?**
- Edit the variable in Netlify UI
- Trigger a new deploy

---

**Need help?** Check your Firebase Console → Project settings → Your apps for the config values.

