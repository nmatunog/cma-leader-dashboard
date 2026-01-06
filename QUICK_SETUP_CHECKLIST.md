# Quick Setup Checklist for Temporary Password Feature

## ✅ Step 1: Install firebase-admin (Verify)

Run this to check if it's installed:
```bash
npm list firebase-admin
```

If you see an error, install it:
```bash
npm install firebase-admin
```

---

## 🔑 Step 2: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/
2. Select your project: **cma-dashboard-01-5a57b**
3. Click ⚙️ (gear icon) → **Project settings**
4. Click **Service accounts** tab
5. Click **Generate new private key** button
6. Click **Generate key** in the dialog
7. A JSON file downloads (save it somewhere safe!)

---

## 📝 Step 3: Add to .env.local

Open your `.env.local` file and add these lines:

### Option A: Copy Entire JSON (Recommended - Easier)

1. Open the downloaded JSON file in a text editor
2. Copy ALL the content (the entire JSON object)
3. In `.env.local`, add this line (replace `{...}` with your actual JSON):
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{...}'
   ```
   
   **Important:** 
   - Use single quotes `'...'` around the JSON
   - Keep it all on one line (no line breaks)
   - Make sure the JSON is valid

### Option B: Use Individual Variables

Extract these 3 values from the JSON file:
- `project_id`
- `client_email` 
- `private_key` (the entire key with BEGIN/END lines)

Add to `.env.local`:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔐 Step 4: Add Encryption Key

Generate and add the encryption key:

1. Run this command:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Copy the output (a long string of letters/numbers)

3. Add to `.env.local`:
   ```env
   PASSWORD_ENCRYPTION_KEY=your-generated-key-here
   ```

---

## 🔄 Step 5: Restart Dev Server

**Important:** You MUST restart your dev server after adding environment variables!

1. Stop the server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

---

## ✅ Step 6: Test It!

1. Go to http://localhost:3000
2. Log in as admin
3. Go to **User Management** (`/admin/users`)
4. Find a user and click **"Set Temp"** button
5. Click **"Generate & Set Password"**
6. The password should appear - copy it!
7. Test logging in with that password

---

## 🆘 Troubleshooting

**"Failed to initialize Firebase Admin SDK"**
- Did you restart the dev server?
- Check the JSON is valid (try jsonlint.com)
- Make sure quotes are correct

**"Missing environment variables"**
- Check `.env.local` exists
- Check variable names are exact (case-sensitive)
- Make sure no extra spaces

**Password not showing**
- Check browser console (F12) for errors
- Check server logs in terminal
- Verify API route is working


