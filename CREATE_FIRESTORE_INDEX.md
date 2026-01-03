# Create Firestore Index for Organizational Hierarchy

## Problem
Firebase requires a composite index for queries that use multiple `orderBy` clauses on the `organizational_hierarchy` collection.

## Quick Fix (Easiest)
**Just click the link in the error message!**

The error message contains a direct link to create the index. Click it and Firebase will automatically create the required index.

## Manual Method

If you prefer to create it manually:

1. **Go to Firebase Console**
   - https://console.firebase.google.com/
   - Select project: `cma-dashboard-01-5a57b`

2. **Go to Firestore Database → Indexes tab**

3. **Click "Create Index"**

4. **Configure the index:**
   - **Collection ID:** `organizational_hierarchy`
   - **Fields to index:**
     - `agencyName` - Ascending
     - `rank` - Ascending  
     - `name` - Ascending

5. **Click "Create"**

## What This Index Does

This index enables efficient queries that:
- Filter by `agencyName` (equality)
- Order by `rank` (ascending)
- Order by `name` (ascending)

This is used by the `getHierarchyByAgency()` function to retrieve all hierarchy entries for an agency, sorted by rank and then by name.

## After Creating the Index

- The index creation may take a few minutes (usually 1-2 minutes)
- You'll see a status indicator in the Indexes tab
- Once the index is built, refresh your browser and the error will be resolved
- The signup page dropdowns will work correctly

## Alternative: Simplify the Query (Not Recommended)

We could remove one of the `orderBy` clauses to avoid needing an index, but this would affect the sorting of the hierarchy data. It's better to create the index.

