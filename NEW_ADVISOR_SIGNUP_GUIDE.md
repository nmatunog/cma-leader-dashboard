# Guide: Signing Up New Advisors Not in Hierarchy

When a new advisor is not yet in the hardcoded organizational hierarchy, there are several options:

## Option 1: Admin Creates User Account (Recommended) ⭐

**This is the simplest and most secure method.**

1. **Admin logs into the system**
2. **Go to User Management** (`/admin/users`)
3. **Click "Create New User"**
4. **Fill in the form:**
   - Email: User's email (or code-based email will be generated)
   - Password: Set a temporary password (user can change later)
   - Full Name: Advisor's name
   - Role: Select "Advisor"
   - Rank: Select "ADV" (Advisor)
   - Agency Name: Select the appropriate agency
   - Unit Manager: Select the advisor's unit manager (optional)
5. **Click "Create User"**
6. **Optionally set temporary password flag:**
   - Click "Set Temp" button next to the new user
   - This will require the user to change their password on first login

**Advantages:**
- ✅ Works immediately - no code changes needed
- ✅ Admin has full control
- ✅ Can set temporary passwords
- ✅ Doesn't require the user to be in hierarchy
- ✅ User can log in immediately

**User Login:**
- User logs in with the email/password provided by admin
- If temporary password is set, user will be prompted to change password on first login

---

## Option 2: Add to Hierarchy First, Then Self-Signup

1. **Admin adds advisor to hierarchy:**
   - Go to `/admin/import`
   - Use CSV import or add manually to hierarchy data
   - Include: name, rank (ADV), agency, unit manager

2. **Advisor signs up:**
   - Go to `/signup`
   - Enter code, name, email (optional), password
   - Select agency and unit
   - System will auto-detect rank/role from hierarchy
   - Account is created

**Advantages:**
- ✅ Advisor can self-register
- ✅ Maintains hierarchy structure

**Disadvantages:**
- ⚠️ Requires two steps (add to hierarchy, then signup)
- ⚠️ More complex workflow

---

## Option 3: Manual Hierarchy Entry (Future Enhancement)

This could be implemented in the future to allow admins to:
1. Add a single person to the hierarchy via a form
2. Then the person can self-signup

**Status:** Not yet implemented, but could be added if needed.

---

## Recommended Workflow

For new advisors not in the hierarchy, **use Option 1 (Admin Creates User)**:

1. Admin creates the account via User Management
2. Admin sets temporary password (optional but recommended)
3. Admin communicates credentials to the advisor
4. Advisor logs in and changes password if temporary password was set
5. Advisor can now use the system

This is the most straightforward and secure approach for onboarding new advisors.

