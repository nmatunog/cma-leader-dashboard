# Pre-Deployment Testing Checklist

Use this checklist to verify all functionality works before deploying to production.

## 🔧 Prerequisites

- [ ] Dev server is running (`npm run dev`)
- [ ] Firebase environment variables are configured in `.env.local`
- [ ] Firebase project is set up in Firebase Console
- [ ] Email/Password authentication is enabled in Firebase Console
- [ ] Firestore Database is created

---

## 1️⃣ Setup & Initial Admin Creation

### Test: Initial Setup Page

1. **Navigate to**: `http://localhost:3000/setup`
   - [ ] Page loads without errors
   - [ ] No Firebase configuration warning (yellow box) appears
   - [ ] Form is displayed correctly

2. **Create Admin User**:
   - [ ] Fill in all required fields:
     - Email: `admin@test.com`
     - Password: `test123456` (min 6 characters)
     - Name: `Test Admin`
     - Agency Name: `Cebu Matunog Agency`
   - [ ] Click "Create Admin Account"
   - [ ] Success message appears
   - [ ] Redirects to `/login` page automatically

3. **Verify in Firebase Console**:
   - [ ] User appears in Authentication → Users
   - [ ] User document exists in Firestore → `users` collection
   - [ ] User document has:
     - `role: "admin"`
     - `rank: "ADMIN"`
     - `isActive: true`
     - `email`, `name`, `agencyName` are correct

---

## 2️⃣ Login & Authentication

### Test: Login Flow

1. **Navigate to**: `http://localhost:3000/login`
   - [ ] Login page loads correctly
   - [ ] Email and password fields are present

2. **Login with Admin Account**:
   - [ ] Enter admin email: `admin@test.com`
   - [ ] Enter password: `test123456`
   - [ ] Click "Log In"
   - [ ] Successfully logs in
   - [ ] Redirects to `/reports` (admin default page)

3. **Verify Authentication State**:
   - [ ] User is authenticated in Firebase
   - [ ] Auth context contains user data
   - [ ] Sidebar shows user name and role

---

## 3️⃣ Admin User Management

### Test: Admin User Management Interface

1. **Navigate to**: `http://localhost:3000/admin/users`
   - [ ] Page loads (admin-only access)
   - [ ] User list table is displayed
   - [ ] Admin user appears in the list

2. **Create New User**:
   - [ ] Click "Create New User" button
   - [ ] Modal form appears
   - [ ] Fill in:
     - Email: `advisor@test.com`
     - Password: `test123456`
     - Name: `Test Advisor`
     - Role: `Advisor`
     - Rank: `LA` (automatically set)
     - Agency: `Cebu Matunog Agency`
   - [ ] Click "Create User"
   - [ ] Success - user appears in table
   - [ ] Verify in Firebase Console:
     - [ ] User in Authentication
     - [ ] User document in Firestore with correct role

3. **Create Leader User**:
   - [ ] Create another user:
     - Email: `leader@test.com`
     - Password: `test123456`
     - Name: `Test Leader`
     - Role: `Leader`
     - Rank: `UM` (automatically set)
     - Agency: `Cebu Matunog Agency`
   - [ ] Verify user is created correctly

4. **Edit User**:
   - [ ] Click "Edit" button on a user
   - [ ] Modal opens with user data pre-filled
   - [ ] Change name or agency
   - [ ] Click "Update User"
   - [ ] Changes are saved
   - [ ] Table updates with new data

5. **Deactivate/Reactivate User**:
   - [ ] Click "Deactivate" on a user (not yourself)
   - [ ] Confirm dialog appears
   - [ ] User status changes to "Inactive"
   - [ ] Click "Activate" to reactivate
   - [ ] User status changes back to "Active"

6. **Search and Filter**:
   - [ ] Search by name works
   - [ ] Search by email works
   - [ ] Filter by role works (Admin/Leader/Advisor)
   - [ ] Filter by agency works

---

## 4️⃣ Role-Based Access Control

### Test: Advisor Access

1. **Logout** from admin account
2. **Login as Advisor**: `advisor@test.com` / `test123456`
   - [ ] Logs in successfully
   - [ ] Redirects to `/strategic-planning` (not `/reports`)
   - [ ] Sidebar does NOT show "User Management" link
   - [ ] Cannot access `/admin/users` (should redirect or show error)
   - [ ] Can access `/strategic-planning` features

### Test: Leader Access

1. **Logout** from advisor account
2. **Login as Leader**: `leader@test.com` / `test123456`
   - [ ] Logs in successfully
   - [ ] Redirects to `/strategic-planning`
   - [ ] Sidebar does NOT show "User Management" link
   - [ ] Can toggle between Advisor and Leader views (toggle button visible)
   - [ ] Can access leader-specific tabs

### Test: Admin Access

1. **Logout** from leader account
2. **Login as Admin**: `admin@test.com` / `test123456`
   - [ ] Logs in successfully
   - [ ] Redirects to `/reports`
   - [ ] Sidebar shows "User Management" link in Admin section
   - [ ] Can access all pages
   - [ ] Can manage users

---

## 5️⃣ Strategic Planning Features

### Test: Strategic Planning as Advisor/Leader

1. **Login as Advisor or Leader**
2. **Navigate to**: `/strategic-planning`
   - [ ] Page loads correctly
   - [ ] Welcome message shows user name
   - [ ] Tabs are displayed correctly

3. **Test Goal Setting**:
   - [ ] Navigate to "Goals" tab
   - [ ] Fill in goal data:
     - December 2025 targets
     - Quarterly goals for 2026
   - [ ] Click "Submit Goals & Generate PDF"
   - [ ] Success message appears
   - [ ] PDF is generated (downloads)
   - [ ] Goal is saved to Firestore (`strategic_planning_goals` collection)
   - [ ] Goal has correct `userId` (UID, not name)

4. **Test Advisor Simulation Tab**:
   - [ ] Can input FYC/FYP values
   - [ ] Calculations work correctly
   - [ ] Charts display correctly

5. **Test Leader HQ Tab** (Leader only):
   - [ ] Can access leader-specific features
   - [ ] Team recruitment features work

---

## 6️⃣ Reports Page (Admin Only)

1. **Login as Admin**
2. **Navigate to**: `/reports`
   - [ ] Page loads correctly
   - [ ] All submitted goals are displayed
   - [ ] Filters work (by agency, by rank)
   - [ ] Summary cards show correct totals
   - [ ] Export CSV works
   - [ ] Individual goal details modal works

---

## 7️⃣ Sidebar & Navigation

1. **Verify Sidebar**:
   - [ ] Shows correct user name
   - [ ] Shows correct agency name
   - [ ] Shows user role (admin/leader/advisor)
   - [ ] Navigation links work
   - [ ] "User Management" only visible to admins
   - [ ] Active page is highlighted

---

## 8️⃣ Logout Functionality

1. **Test Logout**:
   - [ ] Click logout/exit button
   - [ ] User is signed out from Firebase
   - [ ] Redirected to `/login`
   - [ ] Cannot access protected pages without login
   - [ ] Auth state is cleared

---

## 9️⃣ Error Handling

1. **Test Invalid Login**:
   - [ ] Wrong email shows error
   - [ ] Wrong password shows error
   - [ ] Deactivated user cannot login (if you deactivated one)

2. **Test Protected Routes**:
   - [ ] Unauthenticated users redirected to `/login`
   - [ ] Non-admin users cannot access `/admin/users`
   - [ ] Non-admin users cannot access `/reports`

3. **Test Form Validation**:
   - [ ] Required fields show validation errors
   - [ ] Password minimum length enforced
   - [ ] Email format validation

---

## 🔟 Browser Console Checks

1. **Open Browser DevTools** (F12)
2. **Check Console**:
   - [ ] No Firebase initialization errors
   - [ ] No React errors
   - [ ] No network errors
   - [ ] Warnings are acceptable (not critical)

3. **Check Network Tab**:
   - [ ] Firebase Auth requests succeed
   - [ ] Firestore requests succeed
   - [ ] No 404 errors for assets

---

## ✅ Final Verification

- [ ] All tests above pass
- [ ] No console errors
- [ ] All features work as expected
- [ ] User data persists correctly in Firestore
- [ ] Authentication works reliably
- [ ] Role-based access control works
- [ ] Ready for deployment

---

## 🐛 Known Issues to Document

Document any issues found during testing:
- Issue 1: [Description]
- Issue 2: [Description]

---

## 📝 Notes

- Test in different browsers if possible (Chrome, Firefox, Safari)
- Test on mobile devices if needed
- Verify Firestore security rules are working (users can only access their own data, admins can access all)

---

## 🚀 Ready for Deployment?

Once all tests pass, you're ready to deploy!

1. Review `DEPLOYMENT_GUIDE.md`
2. Choose platform (Vercel recommended)
3. Add environment variables to deployment platform
4. Deploy and test in production environment

