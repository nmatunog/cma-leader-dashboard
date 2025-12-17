# Firestore Security Rules for User Authentication

## Updated Security Rules

Replace your current Firestore rules with these role-based rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && getUserData().role == 'admin';
    }
    
    // Helper function to check if user is active
    function isActive() {
      return request.auth != null && getUserData().isActive == true;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only admins can read all users
      allow read: if isAdmin() && isActive();
      
      // Only admins can create/update users
      allow create: if isAdmin() && isActive();
      allow update: if isAdmin() && isActive();
      
      // Users can update their own profile (limited fields)
      allow update: if request.auth != null && 
                    request.auth.uid == userId && 
                    isActive() &&
                    // Only allow updating specific fields
                    request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['name', 'unitManager']);
      
      // Only admins can delete users
      allow delete: if isAdmin() && isActive();
    }
    
    // Strategic planning goals collection
    match /strategic_planning_goals/{goalId} {
      // Users can read/write their own goals
      allow read, write: if request.auth != null && 
                        isActive() &&
                        resource.data.userId == request.auth.uid;
      
      // Admins can read/write all goals
      allow read, write: if isAdmin() && isActive();
      
      // On create, ensure userId matches authenticated user (unless admin)
      allow create: if request.auth != null && 
                    isActive() &&
                    (request.resource.data.userId == request.auth.uid || isAdmin());
    }
    
    // Data collection (dashboard data)
    match /data/{document=**} {
      // Only authenticated users can read
      allow read: if request.auth != null && isActive();
      
      // Only admins can write
      allow write: if isAdmin() && isActive();
    }
    
    // Config collection
    match /config/{document=**} {
      // Only admins can read/write config
      allow read, write: if isAdmin() && isActive();
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-leader-dashboard`)
3. Go to **Firestore Database** → **Rules** tab
4. Paste the rules above
5. Click **Publish**

## Rule Explanations

### Users Collection
- Users can read their own data
- Admins can read all users
- Only admins can create/update/delete users
- Users can update their own name and unitManager fields

### Strategic Planning Goals
- Users can read/write their own goals
- Admins can read/write all goals
- On create, userId must match authenticated user (unless admin)

### Data Collection
- All authenticated users can read
- Only admins can write

### Config Collection
- Only admins can access

## Testing

After publishing rules, test:
1. Login as admin - should access all features
2. Login as leader - should access own goals, leader tabs
3. Login as advisor - should access own goals, advisor tabs only
4. Try accessing other users' goals - should be denied (unless admin)


