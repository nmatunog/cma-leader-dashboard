# Complete User Authentication & Role Authorization System

## Overview

Transform the current anonymous authentication system into a full-featured user management system with:
- User accounts (email/password)
- User profiles stored in Firestore
- Role-based access control (Admin, Leader, Advisor)
- User management interface
- Secure authorization

## Database Schema Design

### Firestore Collections

#### 1. `users` Collection

**Document ID**: Firebase Auth UID

```typescript
interface User {
  uid: string;                    // Firebase Auth UID (document ID)
  email: string;
  name: string;
  role: 'admin' | 'leader' | 'advisor';
  rank: 'LA' | 'UM' | 'SUM' | 'AD' | 'ADMIN';
  unitManager?: string;           // For advisors/leaders
  agencyName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  isActive: boolean;
  createdBy?: string;             // UID of admin who created this user
}

// Example document structure:
users/{uid} {
  email: "john.doe@cma.com",
  name: "John Doe",
  role: "advisor",
  rank: "LA",
  unitManager: "Jane Smith",
  agencyName: "Cebu Matunog Agency",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  isActive: true
}
```

#### 2. `agencies` Collection (Optional - for agency management)

```typescript
interface Agency {
  id: string;                     // Document ID
  name: string;
  code: string;                   // Unique code (e.g., "CMA", "CEPA")
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;              // Admin UID
}
```

#### 3. Update `strategic_planning_goals` Collection

Link goals to user UID instead of just name:

```typescript
interface StrategicPlanningGoal {
  id?: string;
  userId: string;                 // Firebase Auth UID (not just name)
  userName: string;               // Keep for display
  userRank: string;
  unitManager: string;
  agencyName: string;
  // ... rest of existing fields
}
```

## Authentication Flow

### 1. User Registration (Admin-Only)

**Flow:**
1. Admin creates user account via admin panel
2. Admin sets email, password, role, agency
3. System creates Firebase Auth account
4. System creates user document in Firestore
5. System sends welcome email with login credentials

### 2. User Login

**Flow:**
1. User enters email and password
2. Firebase Auth authenticates
3. Fetch user document from Firestore
4. Store user data in context/state
5. Redirect based on role

### 3. Role-Based Routing

```typescript
// After login, redirect based on role:
- Admin → /reports (or /admin)
- Leader → /strategic-planning (Leader view)
- Advisor → /strategic-planning (Advisor view)
```

## Role Definitions & Permissions

### Admin (`role: 'admin'`, `rank: 'ADMIN'`)

**Permissions:**
- ✅ Full access to all features
- ✅ User management (create, edit, delete users)
- ✅ View all reports and data
- ✅ Access to Reports page
- ✅ Can view/manage all agencies
- ✅ Can edit strategic planning goals (all users)

**Access:**
- All pages
- Admin dashboard

### Leader (`role: 'leader'`, `rank: 'UM' | 'SUM' | 'AD'`)

**Permissions:**
- ✅ View and edit own strategic planning goals
- ✅ Access Leader HQ tab
- ✅ Access Path to Premier tab
- ✅ Toggle between Leader and Advisor views
- ✅ View team data (if implemented)
- ❌ Cannot access Reports page
- ❌ Cannot manage users
- ❌ Cannot view other users' goals (unless team members)

**Access:**
- Strategic Planning (all tabs)
- Can toggle Leader/Advisor view

### Advisor (`role: 'advisor'`, `rank: 'LA'`)

**Permissions:**
- ✅ View and edit own strategic planning goals
- ✅ Access Advisor Sim tab
- ✅ Access Goal Setting tab
- ✅ Access Overview tab
- ❌ Cannot access Leader HQ tab
- ❌ Cannot access Path to Premier tab
- ❌ Cannot toggle to Leader view
- ❌ Cannot access Reports page
- ❌ Cannot manage users

**Access:**
- Strategic Planning (limited tabs)
- Advisor view only

## Implementation Plan

### Phase 1: Database & Authentication Setup

1. **Update Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users collection
       match /users/{userId} {
         // Users can read their own data
         allow read: if request.auth != null && request.auth.uid == userId;
         // Only admins can create/update users
         allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // Strategic planning goals
       match /strategic_planning_goals/{goalId} {
         // Users can read/write their own goals
         allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
         // Admins can read/write all goals
         allow read, write: if request.auth != null && 
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```

2. **Enable Email/Password Authentication in Firebase**
   - Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"

### Phase 2: Create Authentication Service

Create `lib/auth-service.ts` with:
- `registerUser(email, password, userData)` - Admin-only
- `loginUser(email, password)`
- `logoutUser()`
- `getCurrentUser()`
- `updateUserProfile(uid, updates)` - Admin-only
- `deleteUser(uid)` - Admin-only

### Phase 3: Create User Management Service

Create `lib/user-service.ts` with:
- `getAllUsers()`
- `getUsersByAgency(agencyName)`
- `getUsersByRole(role)`
- `createUser(userData)`
- `updateUser(uid, updates)`
- `deactivateUser(uid)`

### Phase 4: Create Authentication UI

1. **New Login Page** (`app/login/page.tsx`)
   - Email/password form
   - "Forgot Password" link
   - Error handling

2. **Update Strategic Planning Login Modal**
   - Replace with redirect to `/login` page
   - Or keep modal but use email/password

3. **User Profile Component**
   - Show current user info
   - Logout button
   - Edit profile (for own profile)

### Phase 5: Create Admin User Management Interface

1. **Admin Users Page** (`app/admin/users/page.tsx`)
   - List all users
   - Create new user button
   - Edit user modal
   - Delete/deactivate user
   - Filter by role, agency

2. **Create User Modal**
   - Email, password, name
   - Role selection (Admin, Leader, Advisor)
   - Rank selection (based on role)
   - Agency selection
   - Unit Manager (if advisor/leader)

### Phase 6: Update Existing Components

1. **Remove Anonymous Auth**
   - Remove `signInAnonymously` calls
   - Replace with email/password auth

2. **Update Strategic Planning App**
   - Remove localStorage user state
   - Use authenticated user from Firebase Auth + Firestore
   - Check user role for tab access

3. **Add Auth Guard Middleware**
   - Protect routes based on authentication
   - Redirect to login if not authenticated

### Phase 7: Migration

1. **Migrate Existing Data**
   - If any goals exist with user names, link them to new user accounts
   - Create user accounts for existing users (if needed)

2. **Update Existing Goals**
   - Add `userId` field to existing goal documents
   - Link goals to user UIDs

## Security Considerations

1. **Firestore Rules**: Role-based access control
2. **Password Requirements**: Enforce strong passwords
3. **Email Verification**: Optional - require verified emails
4. **Rate Limiting**: Prevent brute force attacks
5. **Session Management**: Proper logout handling
6. **Password Reset**: Implement forgot password flow

## UI/UX Considerations

1. **Login Page**: Clean, professional design matching app theme
2. **User Profile**: Accessible from sidebar or header
3. **Admin Panel**: Clear user management interface
4. **Error Messages**: User-friendly error handling
5. **Loading States**: Show loading during auth operations
6. **Success Messages**: Confirm actions (user created, profile updated, etc.)

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Database & Auth Setup)
3. Implement Phase 2 (Auth Service)
4. Build UI components (Phase 4 & 5)
5. Test thoroughly
6. Deploy

Would you like me to start implementing any specific phase?


