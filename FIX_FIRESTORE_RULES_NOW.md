# Fix Firestore Rules - Missing organizational_hierarchy Collection

## Problem
The console shows "Missing or insufficient permissions" errors for:
- Loading agencies
- Getting hierarchy by agency

This is because the `firestore.rules` file is missing rules for the `organizational_hierarchy` collection.

## Solution
I've updated the `firestore.rules` file to include:
1. Rules for the `organizational_hierarchy` collection
2. Fixed helper functions to avoid circular dependencies
3. Updated user collection rules to match the recommended pattern

## Next Steps

**You need to apply these rules in Firebase Console:**

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`

2. **Go to Firestore Database → Rules tab**

3. **Copy the updated rules from `firestore.rules` file**
   - Or use the rules from `FIRESTORE_SECURITY_RULES.md`

4. **Paste and Publish**

## Quick Copy (from firestore.rules)

The file `firestore.rules` in your project now has the correct rules. Just copy the entire contents and paste into Firebase Console.

## What Changed

- ✅ Added `organizational_hierarchy` collection rules
- ✅ Fixed helper functions to use `exists()` check first (prevents circular dependency errors)
- ✅ Updated user collection rules to allow initial admin creation
- ✅ All authenticated users can now read hierarchy (needed for signup dropdowns)
- ✅ Only admins can write to hierarchy

After updating the rules, refresh your browser and the permission errors should be resolved!

