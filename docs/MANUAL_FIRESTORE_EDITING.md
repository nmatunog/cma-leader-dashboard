# Manual Firestore Editing Guide

## How to Manually Edit Hierarchy Entries in Firestore Console

If you need to manually fix hierarchy entries in Firestore, follow these steps:

### 1. Access Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on "Firestore Database" in the left sidebar

### 2. Navigate to Hierarchy Collection

1. Find the `organizational_hierarchy` collection
2. Click on it to view all documents

### 3. Find and Edit Entries

**To find entries for specific users:**
- Search by name in the Firestore console (use the search/filter)
- Or look for document IDs that contain the user's name

**Document ID Format:**
- Format: `NAME_AGENCY_NAME`
- Example: `JESSICA_G_BACULAN_CEBU-MATUNOG_AGENCY` (old, wrong)
- Should be: `JESSICA_G_BACULAN_CEBU-EZ_MATUNOG_AGENCY` (new, correct)

### 4. Update Agency Names

For users that should be in **CEBU-EZ MATUNOG AGENCY**:

1. **Find the entry** (search by name or browse)
2. **Click on the document** to open it
3. **Edit the `agencyName` field:**
   - Change from: `CEBU-MATUNOG AGENCY`
   - Change to: `CEBU-EZ MATUNOG AGENCY`
4. **Click "Update"** to save

### 5. Users to Fix

Based on the hierarchy data, these users should have `CEBU-EZ MATUNOG AGENCY`:

- **Jessica G. Baculan** (UM)
- **Ranet L. Canu OG** (UM)
- **Maria Estrella C. Matunog** (ADD) - already correct
- All advisors under Jessica G. Baculan
- All advisors under Ranet L. Canu OG

### 6. Delete Old Entries

If there are duplicate entries (one with old agency, one with new agency):
1. Find the entry with the old agency name in the document ID
2. Delete that document
3. Keep only the entry with the correct agency name

### 7. Bulk Update (Alternative)

If you have many entries to update:
1. Use the "Sync Hierarchy from Data" button in `/admin/hierarchy-review`
2. This will automatically update all entries from the corrected `hierarchy-data.ts` file

## Quick Reference

**Collection:** `organizational_hierarchy`

**Fields to update:**
- `agencyName`: Change to `CEBU-EZ MATUNOG AGENCY` for affected users

**Document ID pattern:**
- Old: `{NAME}_CEBU-MATUNOG_AGENCY`
- New: `{NAME}_CEBU-EZ_MATUNOG_AGENCY`





