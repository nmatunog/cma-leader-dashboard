# Fix Incomplete User Registration

If a user was created in Firebase Auth but the Firestore document is missing, follow these steps:

## Option 1: Create Firestore Document Manually (Quick Fix)

1. **Get the User UID**:
   - Go to Firebase Console → Authentication → Users
   - Find the user with your email
   - Copy the **UID** (it's a long string like `abc123xyz...`)

2. **Create Firestore Document**:
   - Go to Firebase Console → Firestore Database → Data
   - Click **"Start collection"** (if `users` collection doesn't exist)
   - Collection ID: `users`
   - Document ID: **Paste the UID you copied**
   - Add these fields:
     ```
     email: "your-email@example.com" (string)
     name: "Your Name" (string)
     role: "admin" (string)
     rank: "ADMIN" (string)
     agencyName: "Cebu Matunog Agency" (string)
     isActive: true (boolean)
     emailVerified: false (boolean)
     createdBy: "system" (string)
     createdAt: [Click "Timestamp" button, then "Set"] (timestamp)
     updatedAt: [Click "Timestamp" button, then "Set"] (timestamp)
     ```
   - Click **"Save"**

3. **Try Logging In**:
   - Go to `http://localhost:3000/login`
   - Use your email and password
   - Should work now!

## Option 2: Delete and Recreate (If Option 1 Doesn't Work)

1. **Delete the Firebase Auth User**:
   - Go to Firebase Console → Authentication → Users
   - Find your user
   - Click the three dots (⋮) → **Delete user**
   - Confirm deletion

2. **Update Firestore Rules** (if not done already):
   - Go to Firestore Database → Rules
   - Use the rules from `FIRESTORE_RULES_SETUP.md`
   - Publish

3. **Try Creating Account Again**:
   - Go to `http://localhost:3000/setup`
   - Fill in the form again
   - Should work this time!

## Option 3: Use the Setup Page Again (If Rules Are Fixed)

If you've already updated the Firestore rules, you can:
1. Delete the Firebase Auth user (as in Option 2, step 1)
2. Go back to `/setup` and create the account again
3. This time both Auth and Firestore should be created successfully

