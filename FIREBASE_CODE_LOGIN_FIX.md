# Fix: Code-Based Login Permission Error

## Problem

When trying to log in with a code, you get:
- `Error getting user by code: FirebaseError: Missing or insufficient permissions.`
- `Error logging in: FirebaseError: (auth/invalid-credential)`

## Root Cause

The Firestore security rules don't allow queries on the `users` collection. The `getUserByCode` function needs to query the collection with `where('code', '==', code)`, but unauthenticated users can't perform collection queries.

## Solution

Updated `firestore.rules` to allow collection queries on the `users` collection. This is necessary for code-based login to work.

**Security Note:** This allows queries that can find users by code, but:
- Codes should be unique and not easily guessable
- Only code and email are needed for login (which are already somewhat public identifiers)
- Other sensitive user data is still protected by document-level read rules

## How to Apply the Fix

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-dashboard-01-5a57b`)
3. Go to **Firestore Database** → **Rules** tab
4. Copy the updated rules from `firestore.rules` in this repository
5. Click **Publish**

## Testing

After updating the rules:

1. Try logging in with your ADD account code
2. The code lookup should work without permission errors
3. Login should proceed normally

## Alternative (More Secure) Solution (Optional)

If you want stricter security, you could:
1. Create a separate `user_codes` collection with only `code` and `email` fields
2. Allow public read access to that collection
3. Use it only for code lookups
4. Keep the main `users` collection fully protected

But for most use cases, allowing queries on the users collection is acceptable since codes should be unique identifiers.

