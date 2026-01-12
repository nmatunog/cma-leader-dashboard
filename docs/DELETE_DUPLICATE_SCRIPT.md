# Delete Duplicate Maria Rosario Unit - Script Guide

## Option 1: Use the Script (Recommended)

I've created a script that will automatically find and delete the duplicate unit. Here's how to use it:

### Step 1: Get Firebase Admin SDK Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon** ⚙️ next to "Project Overview"
4. Click **"Project settings"**
5. Go to the **"Service accounts"** tab
6. Click **"Generate new private key"**
7. Click **"Generate key"** in the dialog
8. Save the downloaded JSON file as `serviceAccountKey.json` in your project root (same folder as `package.json`)
9. **Important**: Add `serviceAccountKey.json` to `.gitignore` to avoid committing it to git

### Step 2: Install Firebase Admin SDK (if not already installed)

```bash
npm install firebase-admin
```

### Step 3: Run the Script

```bash
node scripts/delete-duplicate-maria-rosario.js
```

### Step 4: Review and Confirm

The script will:
1. Show you all units found for "Maria Rosario C. Matunog"
2. Identify which unit has no advisors
3. List the goals it will delete
4. Ask for confirmation (type "yes" to proceed)

### Example Output

```
🔍 Searching for duplicate "Maria Rosario C. Matunog" units...

📊 Total goals found: 150

📋 Found 3 goals for "Maria Rosario C. Matunog"

📦 Found 2 unique unitName(s):

  1. MARIA ROSARIO C. MATUNOG_CEBU-MATUNOG AGENCY
     - Total goals: 3
     - Advisors: 2
     - UM/SUM goals: 1

  2. Maria Rosario C. Matunog_CEBU-MATUNOG AGENCY
     - Total goals: 1
     - Advisors: 0
     - UM/SUM goals: 1

🎯 Found duplicate unit to delete: "Maria Rosario C. Matunog_CEBU-MATUNOG AGENCY"
   - Total goals: 1
   - Advisors: 0 (this is why it will be deleted)

🗑️  Preparing to delete 1 UM/SUM goal(s):

  1. Document ID: abc123...
     - User: Maria Rosario C. Matunog (UM)
     - Unit Name: Maria Rosario C. Matunog_CEBU-MATUNOG AGENCY
     - Agency: CEBU-MATUNOG AGENCY

⚠️  Are you sure you want to delete these goals? (yes/no):
```

## Option 2: Manual Deletion in Firestore Console

If you prefer to delete manually or don't want to set up the script, see `docs/DELETE_DUPLICATE_UNIT.md` for detailed manual instructions.

## Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Error: "Cannot find module '../serviceAccountKey.json'"
- Make sure you downloaded the service account key JSON file
- Rename it to exactly `serviceAccountKey.json`
- Place it in the project root (same folder as `package.json`)

### Error: "Permission denied" or Firebase Admin errors
- Make sure the service account key is valid
- Check that you have proper permissions in Firebase
- Try generating a new service account key

### Script doesn't find the duplicate
- The duplicate might have already been deleted
- Check the console output to see what units were found
- You can verify in Firestore Console manually





