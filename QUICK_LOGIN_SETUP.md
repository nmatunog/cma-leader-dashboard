# Quick Login Setup Guide

Follow these steps to set up your first admin account and enable login.

## Step 1: Enable Email/Password Authentication in Firebase

**This is required before you can create users!**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-dashboard-01-5a57b` or your project name)
3. Click **"Authentication"** in the left sidebar
4. Click **"Get started"** if this is your first time
5. Click the **"Sign-in method"** tab
6. Find **"Email/Password"** in the provider list
7. Click on **"Email/Password"**
8. **Enable** the toggle at the top
9. Click **"Save"**

✅ **Done!** Email/Password authentication is now enabled.

---

## Step 1.5: Configure Firestore Rules for Setup

**⚠️ IMPORTANT: Do this BEFORE creating your admin account!**

1. In Firebase Console, go to **Firestore Database** → **Rules** tab
2. Copy the rules from `FIRESTORE_RULES_SETUP.md` file (in your project)
3. Paste them into the rules editor
4. Click **"Publish"**

**Note**: These are temporary rules for setup. After creating your admin user, you'll switch to production rules from `FIRESTORE_SECURITY_RULES.md`.

---

## Step 2: Create Your First Admin Account

1. **Make sure your dev server is running**:
   ```bash
   npm run dev
   ```

2. **Navigate to the setup page**:
   ```
   http://localhost:3000/setup
   ```

3. **Fill in the form**:
   - **Email**: Your email address (e.g., `admin@cma.com`)
   - **Password**: At least 6 characters (e.g., `admin123`)
   - **Full Name**: Your name (e.g., `Admin User`)
   - **Agency Name**: Your agency (e.g., `Cebu Matunog Agency`)

4. **Click "Create Admin Account"**

5. **You'll be automatically redirected to the login page** after successful creation

---

## Step 2.5: Update Firestore Rules (After Creating Admin)

**⚠️ CRITICAL: Do this IMMEDIATELY after creating your admin user!**

1. In Firebase Console, go to **Firestore Database** → **Rules** tab
2. Copy the production rules from `FIRESTORE_SECURITY_RULES.md` file
3. Paste them into the rules editor
4. Click **"Publish"**

This secures your database and prevents unauthorized access.

---

## Step 3: Log In

1. **On the login page** (`http://localhost:3000/login`):
   - Enter the **email** you just created
   - Enter the **password** you just set
   - Click **"Login"**

2. **You should be redirected to**:
   - `/reports` if you're an admin
   - `/strategic-planning` if you're a leader/advisor

---

## Troubleshooting

### Error: "Email/Password is not enabled"
- Go back to Firebase Console → Authentication → Sign-in method
- Make sure Email/Password is **enabled** (toggle ON)
- Click **Save**

### Error: "Failed to create admin user"
- Check browser console for detailed error
- Verify Firebase environment variables are set in `.env.local`
- Make sure Firestore Database is created in Firebase Console

### Error: "auth/invalid-credential" when logging in
- Double-check your email and password
- Make sure you created the account via the setup page first
- Try using "Forgot Password?" if you forgot your password

### Setup page shows "An admin user already exists"
- An admin account has already been created
- Go directly to `/login` and use your existing credentials
- If you forgot your password, use "Forgot Password?" on the login page

---

## Next Steps

After logging in as admin:
1. Navigate to **User Management** (`/admin/users`) from the sidebar
2. Create additional users (leaders, advisors) as needed
3. Each user can then log in with their own credentials

---

## Quick Test Credentials

For testing purposes, you can use:
- **Email**: `admin@test.com`
- **Password**: `test123456`
- **Name**: `Test Admin`
- **Agency**: `Cebu Matunog Agency`

**Note**: These are just examples. Use your own secure credentials in production!

