# How to Manually Delete Duplicate "Maria Rosario C. Matunog" Unit in Firestore

## Steps to Access Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with your Google account
   - Select your project (should be the same project ID as in your `.env.local`)

2. **Navigate to Firestore Database**
   - In the left sidebar, click on **"Firestore Database"** (or **"Build"** → **"Firestore Database"**)
   - You'll see all your collections listed

3. **Open the `strategic_planning_goals` Collection**
   - Click on the **`strategic_planning_goals`** collection
   - This will show all goal documents

## Finding the Duplicate Unit Goals

### Option 1: Filter by userName (Recommended)
1. In Firestore, look for a search/filter option (if available)
2. Or manually scroll through the documents
3. Look for documents where:
   - `userName` field contains "Maria Rosario C. Matunog" (case variations: "MARIA ROSARIO C. MATUNOG", "Maria Rosario C. Matunog")
   - `userRank` = "UM" or "SUM"
   - The `unitName` field shows it's the duplicate unit (check the `unitName` value - the duplicate will likely have a different unitName format or agency name)

### Option 2: Filter by unitName
Look for documents where `unitName` field contains "MARIA ROSARIO" or "Maria Rosario" - you should see two different unitName values:
- One with the correct format (e.g., "MARIA ROSARIO C. MATUNOG_CEBU-MATUNOG AGENCY" or similar)
- One duplicate with a different format or agency name

## Identifying the Duplicate Unit (No Advisors)

To identify which unit has NO advisors:

1. **Look at the `unitName` field** - note both variations
2. **Count advisor goals** for each unitName:
   - For each unique `unitName` containing "Maria Rosario", look for goals where:
     - `unitManager` = "Maria Rosario C. Matunog" (any case variation)
     - `userRank` = "ADV" or "AUM"
   - Count how many advisor goals exist for each unitName
   - The unit with **zero advisor goals** is the duplicate to delete

3. **The unit to DELETE should have:**
   - Only UM/SUM goal(s) (no ADV/AUM goals)
   - Different unitName than the main unit
   - Usually has "MARIA ROSARIO" in all caps vs mixed case, or different agency name

## Manual Deletion Steps

1. **Identify the duplicate unitName** (the one with no advisors)

2. **Find all goals with that unitName:**
   - Look for documents where `unitName` = the duplicate unitName value
   - Or where `userName` = "Maria Rosario C. Matunog" (any case) AND there are no advisors with matching `unitManager`

3. **Delete the UM/SUM goal(s) from the duplicate unit:**
   - Click on the document(s) that match the duplicate unit
   - Verify it's the correct one (check `userName`, `userRank` = "UM" or "SUM", and `unitName`)
   - Click the **trash/delete icon** (usually at the top right or in a menu)
   - Confirm the deletion

4. **Important: DO NOT delete advisor goals** - only delete the UM/SUM goal(s) from the duplicate unit

## Example: What to Look For

You might see documents like:

**Correct Unit (KEEP - has advisors):**
- `unitName`: "MARIA ROSARIO C. MATUNOG_CEBU-MATUNOG AGENCY"
- Multiple goals: 1 UM goal + 2+ ADV/AUM goals

**Duplicate Unit (DELETE - no advisors):**
- `unitName`: "MARIA ROSARIO C. MATUNOG_CEBU MATUNOG AGENCY" (different format)
- OR `unitName`: "Maria Rosario C. Matunog_CEBU-MATUNOG AGENCY" (different case)
- Only 1 goal: 1 UM goal, NO ADV/AUM goals

## Verification

After deletion:
1. Go back to your application
2. Navigate to the Comparison page
3. Check the "Filter by Unit" dropdown
4. You should only see ONE "Maria Rosario C. Matunog" entry now

## Alternative: Using Firestore Console Search

If you have many documents, you can:
1. Use the browser's find function (Ctrl+F / Cmd+F)
2. Search for "MARIA ROSARIO" or "Maria Rosario"
3. This will highlight matching documents as you scroll
4. Check each document's `unitName` and advisor count

## Safety Tips

- **Before deleting**: Note down the document ID(s) you're about to delete
- **Double-check**: Verify the document has no advisors (no ADV/AUM goals with matching unitManager)
- **Backup**: Consider exporting the collection first (Firestore → Export/Backup) if you're unsure
- **Test**: After deletion, verify the duplicate no longer appears in your application filters





