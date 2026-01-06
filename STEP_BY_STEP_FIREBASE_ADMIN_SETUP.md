# Step-by-Step Firebase Admin SDK Setup Guide

Follow these steps in order to set up temporary password functionality.

## Step 1: Get Your Firebase Service Account Key

1. **Go to Firebase Console**
   - Open your browser and go to: https://console.firebase.google.com/
   - Select your project (likely `cma-dashboard-01-5a57b`)

2. **Navigate to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview" in the left sidebar
   - Select "Project settings"

3. **Go to Service Accounts Tab**
   - Click on the "Service accounts" tab at the top
   - You'll see a section for "Firebase Admin SDK"

4. **Generate New Private Key**
   - Click the "Generate new private key" button
   - A dialog will appear warning you about keeping the key secure
   - Click "Generate key"
   - A JSON file will be downloaded to your computer (e.g., `cma-dashboard-01-5a57b-firebase-adminsdk-xxxxx.json`)

5. **Save the File Location**
   - Remember where you saved this file (usually in your Downloads folder)
   - **DO NOT commit this file to Git** - it contains sensitive credentials

---

## Step 2: Add Service Account Key to .env.local

You have two options: copy the entire JSON as a string, or use individual variables.

### Option A: Copy Entire JSON (Easier)

1. **Open the downloaded JSON file**
   - Open it in a text editor (VS Code, TextEdit, etc.)
   - You'll see something like:
   ```json
   {
     "type": "service_account",
     "project_id": "cma-dashboard-01-5a57b",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "...",
     "token_uri": "...",
     ...
   }
   ```

2. **Open or create .env.local file**
   - In your project root (`/Users/nmatunog2/2CMA/cma-leader-dashboard/`)
   - Create `.env.local` if it doesn't exist
   - Open it in your editor

3. **Add the service account key**
   - Add this line (replace the entire JSON object with your actual content):
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",...}'
   ```
   
   **Important Notes:**
   - Keep the single quotes around the JSON
   - Escape any single quotes inside the JSON with `\'`
   - Replace `\n` in the private_key with `\\n` (double backslash n)
   - Make sure there are no line breaks in the JSON string

### Option B: Use Individual Variables (More Secure)

1. **Open the downloaded JSON file**
   - Extract these values:
     - `project_id`
     - `private_key` (the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
     - `client_email`

2. **Add to .env.local**:
   ```env
   FIREBASE_PROJECT_ID=your-project-id-here
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   
   **Note:** For `FIREBASE_PRIVATE_KEY`, keep the quotes and use `\n` for newlines

---

## Step 3: Add Password Encryption Key

1. **Generate an encryption key** (if you haven't already):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   This will output something like: `a51675fb2a18f5d27ece3a9b22008e9c170f5146403f4e043be1ee9df26220ff`

2. **Add to .env.local**:
   ```env
   PASSWORD_ENCRYPTION_KEY=a51675fb2a18f5d27ece3a9b22008e9c170f5146403f4e043be1ee9df26220ff
   ```
   
   (Replace with your generated key)

---

## Step 4: Verify Your .env.local File

Your `.env.local` file should now contain:

```env
# Existing Firebase client config (these should already be there)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# NEW: Firebase Admin SDK (choose Option A OR Option B, not both)
# Option A: Entire JSON
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'

# OR Option B: Individual variables
# FIREBASE_PROJECT_ID=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY="..."

# NEW: Password encryption key
PASSWORD_ENCRYPTION_KEY=your-generated-key-here
```

---

## Step 5: Restart Your Dev Server

1. **Stop your dev server** (if running)
   - Press `Ctrl+C` in the terminal where it's running

2. **Start it again**:
   ```bash
   npm run dev
   ```

   Environment variables are loaded when the server starts, so you need to restart.

---

## Step 6: Test the Feature

1. **Log in as admin**
   - Go to http://localhost:3000
   - Log in with your admin account

2. **Go to User Management**
   - Click "User Management" in the sidebar
   - Or go to `/admin/users`

3. **Test setting a temporary password**
   - Find a user (or create a test user)
   - Click "Set Temp" button
   - A modal will open
   - Click "Generate & Set Password"
   - The password should appear (copy it!)
   - Close the modal

4. **Test viewing a temporary password**
   - Find a user with the "Temp Password" badge
   - Click "View Temp" button
   - The password should appear (retrieved from encrypted storage)

5. **Test user login with temp password**
   - Log out
   - Log in with the user's email/code and the temporary password
   - You should be redirected to `/change-password` page
   - Set a new password
   - Log in again with the new password

---

## Troubleshooting

### Error: "Failed to initialize Firebase Admin SDK"

**Check:**
- Did you add the environment variables to `.env.local`?
- Did you restart the dev server after adding them?
- Is the JSON valid? Try validating it at jsonlint.com
- For Option A: Are the quotes correct? Should be single quotes around the JSON
- For Option B: Is `FIREBASE_PRIVATE_KEY` properly quoted with double quotes?

### Error: "Missing or insufficient permissions"

**Check:**
- The service account needs "Firebase Authentication Admin" permissions
- Go to Firebase Console → IAM & Admin → Service Accounts
- Make sure your service account has the right roles

### Error: "Failed to encrypt/decrypt password"

**Check:**
- Is `PASSWORD_ENCRYPTION_KEY` set in `.env.local`?
- Is it at least 32 characters long?
- Did you restart the dev server?

### Password not showing in modal

**Check:**
- Open browser console (F12) and check for errors
- Check the Network tab for API call to `/api/admin/set-temp-password`
- Look at the server logs in your terminal

---

## Security Reminders

⚠️ **Important:**
- Never commit `.env.local` to Git (it should be in `.gitignore`)
- Never share your service account key
- Keep the JSON file secure
- Use different service accounts for development and production
- Rotate keys regularly

---

## Next Steps

Once everything is working:
1. Test the feature thoroughly
2. Deploy to production (add same env vars to Vercel)
3. Document the process for your team
4. Consider setting up key rotation schedule


