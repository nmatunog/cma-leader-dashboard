# Firebase Quick Setup Checklist

## ✅ What You Need to Do in Firebase Console

### 1. Enable Email/Password Authentication ⚠️ **REQUIRED**

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-dashboard-01-5a57b` based on your .env.local)
3. Click **"Authentication"** in the left sidebar
4. If you see "Get started", click it
5. Click on the **"Sign-in method"** tab
6. Find **"Email/Password"** in the provider list
7. Click on it
8. **Toggle ON** the "Enable" switch at the top
9. Leave "Email link (passwordless sign-in)" **disabled**
10. Click **"Save"**

**Why:** Without this, login attempts will fail because Firebase won't accept email/password authentication.

---

### 2. Create Firestore Database ⚠️ **REQUIRED**

**Steps:**
1. Still in Firebase Console
2. Click **"Firestore Database"** in the left sidebar
3. Click **"Create database"**
4. Choose **"Start in test mode"** (we'll update rules next)
5. Click **"Next"**
6. Select a location (e.g., `us-central1` or `asia-southeast1`)
7. Click **"Enable"**
8. Wait 1-2 minutes for creation

**Why:** This is where user data and authentication info is stored.

---

### 3. Set Up Firestore Security Rules ⚠️ **REQUIRED**

**Steps:**
1. In **Firestore Database** → **Rules** tab
2. Copy the rules from `FIRESTORE_SECURITY_RULES.md` in this project
3. Paste into the Rules editor
4. Click **"Publish"**

**Quick Test Mode (temporary):**
If you just need to test quickly, you can use:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
**⚠️ Remember:** Update to proper security rules from `FIRESTORE_SECURITY_RULES.md` after testing!

**Why:** Controls who can read/write data. Prevents unauthorized access.

---

### 4. Create First Admin User (Choose One Option)

#### Option A: Manual Creation (Recommended)

1. **In Firebase Console** → **Authentication** → **Users** tab
2. Click **"Add user"**
3. Enter:
   - Email: `admin@cma.com` (or your email)
   - Password: (temporary password)
   - Click **"Add user"**
4. **Copy the User UID** (click on the newly created user)
5. **In Firestore Database** → **Data** tab
6. Click **"Start collection"**
7. Collection ID: `users`
8. Document ID: (paste the User UID from step 4)
9. Add these fields:
   - `email` (string): `admin@cma.com`
   - `name` (string): `Admin User`
   - `role` (string): `admin`
   - `rank` (string): `ADMIN`
   - `agencyName` (string): `All Agencies`
   - `isActive` (boolean): `true`
   - `createdAt` (timestamp): (click timestamp icon, use current time)
   - `updatedAt` (timestamp): (same as createdAt)
10. Click **"Save"**

#### Option B: Use Setup Page

1. Navigate to `http://localhost:3000/setup` in your browser
2. Fill in the form to create admin user
3. Login with the credentials you created

---

## ✅ Verification Checklist

After completing the above:

- [ ] Email/Password authentication is enabled
- [ ] Firestore Database is created
- [ ] Firestore Rules are published
- [ ] First admin user is created (either manually or via setup page)
- [ ] Can login at `http://localhost:3000/login`

---

## 🔍 How to Verify Each Step

### Check Authentication is Enabled:
- Firebase Console → Authentication → Sign-in method
- "Email/Password" should show as **Enabled** (green checkmark)

### Check Firestore Database:
- Firebase Console → Firestore Database → Data tab
- Should show your database (might be empty initially)

### Check Security Rules:
- Firebase Console → Firestore Database → Rules tab
- Should show your rules (not the default "allow read/write" rules)

### Check Admin User:
- Firebase Console → Authentication → Users tab
- Should see at least one user
- Firebase Console → Firestore Database → Data tab → `users` collection
- Should see a document with `role: "admin"`

---

## 🚨 Common Issues

### "Firebase Auth is not initialized"
- ✅ Your code is correct (we fixed this)
- ✅ Environment variables are set
- ⚠️ **BUT** you still need to enable Email/Password in Firebase Console

### "Permission denied" when logging in
- Check Firestore Security Rules are published
- Check user document exists in `users` collection

### "User account not found"
- User exists in Authentication but not in Firestore
- Create the user document in Firestore (see Option A above)


