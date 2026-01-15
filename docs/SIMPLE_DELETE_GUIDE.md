# Simple Guide: Delete Duplicate Maria Rosario Unit

Since the automated deletion isn't working, here's the **simplest way** to delete the duplicate unit manually.

## Quick Steps

### 1. Go to Firebase Console
- Visit: **https://console.firebase.google.com/**
- Sign in
- Select your project

### 2. Open Firestore
- Click **"Firestore Database"** in left sidebar
- Click on **`strategic_planning_goals`** collection

### 3. Use Browser Search
- Press **Ctrl+F** (Windows) or **Cmd+F** (Mac)
- Search for: **"Maria Rosario"** (or **"MARIA ROSARIO"**)
- This will highlight all matching documents as you scroll

### 4. Find the Duplicate Unit
Look for documents where:
- **`userName`** field = "Maria Rosario C. Matunog" (or "MARIA ROSARIO C. MATUNOG")
- **`userRank`** field = "UM" or "SUM"

You should see **2 different documents** (one duplicate). To identify which one to delete:

**Check the `unitName` field:**
- The **correct unit** (KEEP): Has `unitName` like "MARIA ROSARIO C. MATUNOG_CEBU-MATUNOG AGENCY" (all caps)
- The **duplicate unit** (DELETE): Has `unitName` like "Maria Rosario C. Matunog_CEBU-MATUNOG AGENCY" (mixed case) OR different format

**OR check for advisors:**
- Scroll through all documents
- Look for documents where **`unitManager`** = "Maria Rosario C. Matunog" and **`userRank`** = "ADV" or "AUM"
- The unit that has **NO advisor documents** is the duplicate (DELETE it)

### 5. Delete the Duplicate
1. Click on the document you want to delete (the duplicate one)
2. Look for a **trash/delete icon** (usually at top right)
3. Click the delete icon
4. Confirm deletion

### 6. Verify
- Go back to your app
- Refresh the Comparison page
- Check the "Filter by Unit" dropdown
- You should now see only **ONE** "Maria Rosario C. Matunog" entry

## Need Help Finding It?

If you can't find the duplicate, try this:

1. **Count the documents:**
   - Search for "Maria Rosario" using Ctrl+F / Cmd+F
   - Count how many documents appear
   - If you see 2 UM/SUM documents for Maria Rosario, one is the duplicate

2. **Check the document IDs:**
   - Document IDs usually contain the userName and agency
   - Look for documents with ID like: `USERID_MARIA ROSARIO C. MATUNOG_CEBU...`
   - Or `USERID_Maria Rosario C. Matunog_CEBU...`
   - The one with different casing in the ID might be the duplicate

3. **Check the `unitName` field values:**
   - Open each document
   - Look at the `unitName` field
   - If two documents have different `unitName` values, one is the duplicate
   - Delete the one that has NO advisors (or the one with mixed case)

## Alternative: Ask for Help

If this is still too difficult:
1. Take a screenshot of the Firestore documents showing "Maria Rosario"
2. I can help identify which one to delete
3. Or we can try fixing the automated deletion button







