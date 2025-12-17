# Firebase New Project Setup - Step by Step

Complete guide to create a brand new Firebase project from scratch.

## Step 1: Create New Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Click **"Add project"** (or "Create a project")

2. **Project Details**
   - **Project name**: `cma-leader-dashboard` (or your preferred name)
   - Click **"Continue"**

3. **Google Analytics (Optional)**
   - You can enable or disable Google Analytics
   - For this project, it's optional
   - Click **"Create project"**

4. **Wait for Project Creation**
   - Takes about 30 seconds
   - Click **"Continue"** when done

---

## Step 2: Register Web App

1. **In your new project dashboard**
   - Look for the web icon (</>) or click **"Add app"** → **Web**

2. **Register App**
   - **App nickname**: `CMA Dashboard Web`
   - **App ID**: Leave default (or customize if you want)
   - ✅ **Also set up Firebase Hosting** - Leave unchecked for now (we'll deploy to Vercel)
   - Click **"Register app"**

3. **Copy Firebase Configuration**
   You'll see a code block like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "your-new-project.firebaseapp.com",
     projectId: "your-new-project-id",
     storageBucket: "your-new-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
     measurementId: "G-XXXXXXXXXX"
   };
   ```
   
   **Copy these values** - you'll need them for `.env.local`

4. Click **"Continue to console"**

---

## Step 3: Enable Authentication

1. **Navigate to Authentication**
   - Click **"Authentication"** in the left sidebar
   - Click **"Get started"** (if shown)

2. **Enable Email/Password**
   - Click on the **"Sign-in method"** tab
   - Find **"Email/Password"** in the provider list
   - Click on it
   - **Toggle ON** the "Enable" switch at the top
   - Leave "Email link (passwordless sign-in)" **disabled** (unless you want it)
   - Click **"Save"**

✅ Authentication is now enabled!

---

## Step 4: Create Firestore Database

1. **Navigate to Firestore Database**
   - Click **"Firestore Database"** in the left sidebar
   - Click **"Create database"**

2. **Select Mode**
   - Choose **"Start in test mode"** (for now, we'll update rules after setup)
   - Click **"Next"**

3. **Choose Location**
   - Select a location close to your users (e.g., `us-central1`, `asia-southeast1`)
   - Click **"Enable"**

4. **Wait for Database Creation**
   - Takes 1-2 minutes
   - You'll see "Cloud Firestore is ready"

---

## Step 5: Set Up Firestore Security Rules (Temporary for Setup)

1. **In Firestore Database**
   - Click on the **"Rules"** tab

2. **Update Rules** (temporary, for initial setup):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow authenticated users to manage users collection (for setup)
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       
       // Allow users to create/read their own goals
       match /strategic_planning_goals/{goalId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
       
       // Other collections - authenticated access
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. Click **"Publish"**

---

## Step 6: Update .env.local with New Configuration

1. **Get Your Configuration Values**
   From Step 2, you copied your Firebase config. Now map them to environment variables:

2. **Update .env.local File**
   
   Open your `.env.local` file in the project root and replace with your new values:

   ```env
   # Firebase Configuration - NEW PROJECT
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-from-step-2
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   
   # Edit Mode Password (existing)
   NEXT_PUBLIC_EDIT_PASSWORD=cma2025
   ```

   **Example** (replace with your actual values):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=new-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=new-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=new-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=987654321098
   NEXT_PUBLIC_FIREBASE_APP_ID=1:987654321098:web:abcdef1234567890
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

3. **Save the file**

---

## Step 7: Restart Dev Server

1. **Stop the current dev server** (if running)
   - Press `Ctrl+C` in the terminal

2. **Clear Next.js cache** (recommended):
   ```bash
   rm -rf .next
   ```

3. **Start fresh dev server**:
   ```bash
   npm run dev
   ```

4. **Verify Environment Variables Loaded**
   - Look in terminal for: `- Environments: .env.local`
   - This confirms Next.js found and loaded your `.env.local`

---

## Step 8: Test Configuration

1. **Visit Test Page**:
   ```
   http://localhost:3000/test-env
   ```
   
   - Should show all variables as ✅ Loaded
   - If any show ❌ Missing, check `.env.local` formatting

2. **Hard Refresh Browser**:
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **Check Browser Console**:
   - Open DevTools (F12)
   - Check Console tab
   - Should NOT see Firebase initialization errors

---

## Step 9: Create Your First Admin User

1. **Visit Setup Page**:
   ```
   http://localhost:3000/setup
   ```

2. **Fill in the form**:
   - Email: `admin@test.com` (or your email)
   - Password: `test123456` (minimum 6 characters)
   - Name: `Admin User`
   - Agency: `Cebu Matunog Agency`

3. **Click "Create Admin Account"**

4. **Verify in Firebase Console**:
   - Go to Authentication → Users
   - Your new admin user should appear
   - Go to Firestore Database → Data
   - Check `users` collection - should have your user document with `role: "admin"`

---

## Step 10: Test Login

1. **You'll be redirected to `/login`**

2. **Log in** with your credentials:
   - Email: `admin@test.com`
   - Password: `test123456`

3. **Should redirect to `/reports`** (admin default page)

4. **Verify**:
   - ✅ Sidebar shows your name
   - ✅ "User Management" link appears in Admin section
   - ✅ Can access `/admin/users` page

---

## Verification Checklist

- [ ] New Firebase project created
- [ ] Web app registered
- [ ] Firebase config values copied
- [ ] Email/Password authentication enabled
- [ ] Firestore Database created
- [ ] Firestore security rules set (temporary)
- [ ] `.env.local` updated with new values
- [ ] Dev server restarted
- [ ] Test page shows all variables loaded
- [ ] No console errors
- [ ] Admin user created successfully
- [ ] Can log in and access admin features

---

## Troubleshooting

### Variables Still Not Loading

1. **Check file location**: `.env.local` must be in project root (same folder as `package.json`)

2. **Check format**: No spaces around `=`, no quotes unless needed:
   ```env
   ✅ CORRECT: NEXT_PUBLIC_FIREBASE_API_KEY=value
   ❌ WRONG: NEXT_PUBLIC_FIREBASE_API_KEY = value
   ❌ WRONG: NEXT_PUBLIC_FIREBASE_API_KEY="value"
   ```

3. **Verify server restart**: Must restart after changing `.env.local`

4. **Clear cache**: `rm -rf .next && npm run dev`

### "Email/Password not enabled" error

- Go to Authentication → Sign-in method → Email/Password → Enable

### "Permission denied" in Firestore

- Check Firestore → Rules tab
- Make sure rules allow authenticated access
- Ensure user is authenticated

---

## After Successful Setup

1. **Update Firestore Rules** (make them more secure):
   - See `FIRESTORE_SECURITY_RULES.md` for production rules

2. **Delete Test Mode Rules**:
   - Replace test mode rules with proper authenticated rules

3. **Test All Features**:
   - Create test users (advisor, leader)
   - Test role-based access
   - Test strategic planning features

---

## Quick Reference: Firebase Console URLs

- **Project Dashboard**: https://console.firebase.google.com/project/YOUR-PROJECT-ID
- **Authentication**: https://console.firebase.google.com/project/YOUR-PROJECT-ID/authentication
- **Firestore**: https://console.firebase.google.com/project/YOUR-PROJECT-ID/firestore
- **Project Settings**: https://console.firebase.google.com/project/YOUR-PROJECT-ID/settings/general

Replace `YOUR-PROJECT-ID` with your actual project ID.

