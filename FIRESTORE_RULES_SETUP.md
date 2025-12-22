# Firestore Rules for Initial Setup

**⚠️ IMPORTANT: Use these rules ONLY during initial setup. After creating your admin user, switch to the production rules in `FIRESTORE_SECURITY_RULES.md`.**

## Temporary Setup Rules

These rules allow the setup page to create the first admin user:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - temporarily allow authenticated users to create their own user document
    // This is needed for the setup page to create the first admin
    match /users/{userId} {
      // Allow users to create their own user document (for setup page)
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow authenticated users to read all users (for checking admin existence)
      allow read: if request.auth != null;
      
      // Allow users to update their own profile
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // No delete during setup
      allow delete: if false;
    }
    
    // Strategic planning goals
    match /strategic_planning_goals/{goalId} {
      allow read, write: if request.auth != null;
    }
    
    // Data collection
    match /data/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Config collection
    match /config/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Paste the rules above
5. Click **Publish**

## After Creating Your Admin User

**⚠️ CRITICAL: Immediately after creating your admin user, switch to the production rules!**

1. Go back to **Firestore Database** → **Rules**
2. Copy the rules from `FIRESTORE_SECURITY_RULES.md`
3. Paste and **Publish**

This will secure your database and prevent unauthorized access.

