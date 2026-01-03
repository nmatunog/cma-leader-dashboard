# Fix Signup Page - Allow Public Read for Agencies and Hierarchy

## Problem
The signup page shows "Missing or insufficient permissions" errors when trying to load:
- Agencies (for the agency dropdown)
- Organizational hierarchy (for the unit dropdown)

This happens because the signup page needs to load these collections **before** the user is authenticated (they're trying to sign up!).

## Solution
I've updated the `firestore.rules` file to allow **public read access** (unauthenticated) for:
- `agencies` collection
- `organizational_hierarchy` collection

These collections only contain organizational structure data (agency names, unit names, relationships) - no sensitive user data. Allowing public read access enables the signup page to populate dropdowns.

**Write access remains restricted to admins only.**

## Changes Made

### Agencies Collection
```javascript
match /agencies/{document=**} {
  // Allow public read access (needed for signup page dropdowns before authentication)
  allow read: if true;
  
  // Only admins can write (add/update/delete agencies)
  allow write: if isAdmin() && isActive();
}
```

### Organizational Hierarchy Collection
```javascript
match /organizational_hierarchy/{document=**} {
  // Allow public read access (needed for signup page dropdowns before authentication)
  allow read: if true;
  
  // Only admins can write (initialize/import hierarchy data)
  allow write: if isAdmin() && isActive();
}
```

## Next Steps

**Apply the updated rules in Firebase Console:**

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`

2. **Go to Firestore Database → Rules tab**

3. **Copy the entire contents of `firestore.rules` file**

4. **Paste into the rules editor**

5. **Click Publish**

## Security Note

This change is safe because:
- ✅ Only **read** access is public (anyone can view agency/hierarchy lists)
- ✅ **Write** access remains restricted to admins only
- ✅ These collections contain only organizational structure data (names, relationships)
- ✅ No sensitive user data (passwords, personal info) is exposed
- ✅ Users still need authentication to access all other collections (users, goals, etc.)

After publishing the rules, refresh the signup page and the dropdowns should populate correctly!

