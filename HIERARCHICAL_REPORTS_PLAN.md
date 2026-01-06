# Hierarchical Reports & Permissions Implementation Plan

## Overview
Implement role-based reporting permissions where leaders can view consolidated reports from their teams based on organizational hierarchy.

## Current State Analysis

### Existing Infrastructure
1. **Reports Page** (`app/reports/page.tsx`)
   - Currently admin-only
   - Uses `getAllGoals()` to fetch all goals
   - Has unit-level and agency-level aggregation logic
   - Uses `unitName` format: `${unitManager}_${agencyName}`

2. **Hierarchy Structure**
   - Rank hierarchy: `ADV` < `AUM` < `UM` < `SUM` < `ADD`
   - `unitManager` field indicates reporting relationship
   - Organizational hierarchy service has `getPeopleInUnit()` function
   - Goals have `unitManager`, `unitName`, `agencyName`, and `userRank` fields

3. **Service Functions Available**
   - `getAllGoals()` - Get all goals (admin only)
   - `getAgencyGoals(agencyName)` - Get goals for an agency
   - `getUnitGoals(unitManager, agencyName)` - Get goals for a unit
   - `getPeopleInUnit(unitManagerName, agencyName)` - Get people in a unit from hierarchy

## Requirements

### 1. Unit Manager (UM)
- **Access Level**: View reports for their direct team
- **Data Scope**: Goals from advisors/AUMs who report to them (`unitManager === UM's name`)
- **Display**: 
  - Summary statistics (totals, averages)
  - Individual advisor breakdown
  - Unit-level aggregation

### 2. Senior Unit Manager (SUM)
- **Access Level**: View consolidated reports for their units + direct advisors
- **Data Scope**: 
  - All goals from UMs under them (recursive - UMs and their teams)
  - All goals from direct advisors reporting to them
- **Display**:
  - Consolidated totals across all their units
  - Breakdown by unit (each UM's team)
  - Breakdown by direct advisors
  - Overall SUM-level summary

### 3. Agency/District Director (ADD)
- **Access Level**: View consolidated reports for entire agency
- **Data Scope**: All goals within their agency
- **Display**:
  - Agency-wide totals
  - Breakdown by SUM (each SUM's consolidated data)
  - Breakdown by direct advisors (if any)
  - Unit-level breakdown
  - Overall agency summary

### 4. Admin
- **Access Level**: View all reports across all agencies (existing behavior)
- **Data Scope**: All goals (no filtering)

## Implementation Plan

### Phase 1: Hierarchy Helper Functions

#### 1.1 Create Hierarchy Service Extensions
**File**: `services/organizational-hierarchy-service.ts`

**New Functions Needed:**

1. `getDirectSubordinates(leaderName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]>`
   - Get people who directly report to a leader (unitManager === leaderName)
   - Used by UMs and SUMs to find direct reports

2. `getAllSubordinatesRecursive(leaderName: string, agencyName: string): Promise<string[]>`
   - Recursively get all subordinate names (for SUMs and ADDs)
   - Returns array of names (including nested hierarchy)
   - For SUM: Returns UMs under them + advisors under those UMs + direct advisors
   - For ADD: Returns SUMs + UMs + advisors (entire agency hierarchy)

3. `getSubordinateUnits(leaderName: string, agencyName: string, rank: UserRank): Promise<string[]>`
   - Get unit names that report to a leader
   - For SUM: Returns unit names (UM names) under them
   - For ADD: Returns all unit names in agency

**Implementation Approach:**
- Use `getHierarchyByAgency()` to get all entries
- Build hierarchy tree in memory
- Traverse tree to find all subordinates
- Handle recursive relationships (UMs can have AUMs, who have advisors)

### Phase 2: Service Layer Updates

#### 2.1 Create New Goal Query Functions
**File**: `services/strategic-planning-service.ts`

**New Functions:**

1. `getGoalsForLeader(userId: string, userName: string, rank: UserRank, agencyName: string): Promise<StrategicPlanningGoal[]>`
   - Main function to get goals based on leader's rank and hierarchy
   - Routes to appropriate query based on rank:
     - `UM`: Get goals where `unitManager === userName` AND `agencyName === agencyName`
     - `SUM`: Get goals for all subordinates (recursive)
     - `ADD`: Get all goals for agency
     - `ADMIN`: Get all goals (existing behavior)

2. `getGoalsForUM(umName: string, agencyName: string): Promise<StrategicPlanningGoal[]>`
   - Get goals for UM's direct team
   - Query: `unitManager === umName` AND `agencyName === agencyName`

3. `getGoalsForSUM(sumName: string, agencyName: string): Promise<StrategicPlanningGoal[]>`
   - Get goals for SUM's consolidated view
   - Query all subordinates recursively:
     - Get all UMs under SUM
     - For each UM, get their unit goals
     - Get direct advisors under SUM (unitManager === sumName AND rank !== 'UM')
     - Combine all results

4. `getGoalsForADD(addName: string, agencyName: string): Promise<StrategicPlanningGoal[]>`
   - Get all goals for agency (same as `getAgencyGoals` but with ADD context)
   - Query: `agencyName === agencyName`

**Implementation Notes:**
- Use existing `getUnitGoals()` function for unit-level queries
- Use `getAllSubordinatesRecursive()` from hierarchy service
- Ensure no double-counting (already handled by unit-level aggregation)
- Sort results by submitted date (newest first)

### Phase 3: Reports Page Updates

#### 3.1 Authorization Logic
**File**: `app/reports/page.tsx`

**Changes:**

1. **Update Access Control**
   - Remove admin-only restriction
   - Allow access for: `ADMIN`, `ADD`, `SUM`, `UM`
   - Redirect others to login

2. **Role-Based Data Loading**
   ```typescript
   const loadGoals = async () => {
     if (!user) return;
     
     let goals: StrategicPlanningGoal[] = [];
     
     if (user.role === 'admin' || user.rank === 'ADMIN') {
       // Admin: Get all goals
       goals = await getAllGoals();
     } else if (user.rank === 'ADD') {
       // ADD: Get agency goals
       goals = await getGoalsForADD(user.name, user.agencyName);
     } else if (user.rank === 'SUM') {
       // SUM: Get consolidated goals
       goals = await getGoalsForSUM(user.name, user.agencyName);
     } else if (user.rank === 'UM') {
       // UM: Get unit goals
       goals = await getGoalsForUM(user.name, user.agencyName);
     } else {
       // Others: No access
       router.push('/login');
       return;
     }
     
     setGoals(goals);
   };
   ```

3. **UI Adaptations Based on Rank**
   - **UM View**: 
     - Hide agency-level filters (only show unit-level data)
     - Show "My Team" header instead of "All Reports"
     - Display unit summary + individual advisor breakdown
   
   - **SUM View**:
     - Show "My Units & Team" header
     - Display breakdown by unit (each UM's team)
     - Display direct advisors section
     - Show consolidated totals
   
   - **ADD View**:
     - Show "Agency Reports" header
     - Display breakdown by SUM
     - Display breakdown by unit
     - Show agency-wide totals
   
   - **Admin View**:
     - Keep existing behavior (all filters, all agencies)

4. **Filter Adjustments**
   - **UM**: Disable agency filter (locked to their agency), disable unit filter (shows only their unit)
   - **SUM**: Disable agency filter, show unit filter with only their units
   - **ADD**: Disable agency filter (locked to their agency), show unit filter with all agency units
   - **Admin**: Keep all filters active

#### 3.2 Display Enhancements

1. **Add Context Header**
   ```typescript
   const getReportHeader = () => {
     if (user?.rank === 'UM') return `Team Reports - ${user.name}'s Unit`;
     if (user?.rank === 'SUM') return `Consolidated Reports - ${user.name}`;
     if (user?.rank === 'ADD') return `Agency Reports - ${user.agencyName}`;
     return 'All Reports';
   };
   ```

2. **Hierarchical Breakdown Section**
   - For SUMs: Show breakdown by unit (each UM's team summary)
   - For ADDs: Show breakdown by SUM (each SUM's consolidated summary)
   - Use collapsible/expandable sections for better UX

3. **Permission Indicators**
   - Add badge/indicator showing user's role and scope
   - Example: "Viewing: Your Team (UM)" or "Viewing: All Units (SUM)"

### Phase 4: Data Aggregation Logic

#### 4.1 Update Aggregation Functions
**File**: `app/reports/page.tsx` - `calculateAggregates()`

**Changes:**
- Existing aggregation logic should work as-is for UM view (unit-level data)
- For SUM view: Aggregate across multiple units
- For ADD view: Aggregate across entire agency (existing logic)
- Ensure no changes needed to aggregation calculations (they already handle unit-level grouping correctly)

### Phase 5: UI/UX Enhancements

#### 5.1 Visual Hierarchy Indicators
- Add visual indicators showing hierarchy level
- Use badges/colors to differentiate between:
  - Unit-level data (UM view)
  - Consolidated data (SUM view)
  - Agency-level data (ADD view)

#### 5.2 Navigation Breadcrumbs
- Show breadcrumb: "Reports > [Agency] > [Unit/SUM]" based on user's view level
- Help users understand their scope

#### 5.3 Export Functionality
- Ensure CSV export works correctly for filtered views
- Export only data visible to the user (respect permissions)

## Implementation Steps

### Step 1: Create Hierarchy Helper Functions (Phase 1)
1. Add `getDirectSubordinates()` to `organizational-hierarchy-service.ts`
2. Add `getAllSubordinatesRecursive()` to `organizational-hierarchy-service.ts`
3. Add `getSubordinateUnits()` to `organizational-hierarchy-service.ts`
4. Test hierarchy traversal logic

### Step 2: Create Goal Query Functions (Phase 2)
1. Add `getGoalsForLeader()` to `strategic-planning-service.ts`
2. Add `getGoalsForUM()` to `strategic-planning-service.ts`
3. Add `getGoalsForSUM()` to `strategic-planning-service.ts`
4. Add `getGoalsForADD()` to `strategic-planning-service.ts` (can use existing `getAgencyGoals`)
5. Test query functions with different user roles

### Step 3: Update Reports Page Authorization (Phase 3.1)
1. Update access control logic
2. Implement role-based data loading
3. Test access restrictions

### Step 4: Update Reports Page UI (Phase 3.2)
1. Add role-based headers and context
2. Update filter logic based on role
3. Add hierarchical breakdown sections
4. Test UI adaptations

### Step 5: Testing & Refinement
1. Test with UM account (should see only their team)
2. Test with SUM account (should see consolidated view)
3. Test with ADD account (should see agency view)
4. Test with Admin account (should see all)
5. Verify no data leakage between roles
6. Verify aggregation calculations are correct

## Data Flow Diagram

```
User Login → Check Rank
    │
    ├─ ADMIN → getAllGoals() → All Goals
    │
    ├─ ADD → getGoalsForADD() → Agency Goals
    │
    ├─ SUM → getGoalsForSUM() → {
    │       ├─ getSubordinateUnits() → [UM1, UM2, ...]
    │       ├─ For each UM: getUnitGoals()
    │       └─ getDirectAdvisors() → Direct Advisor Goals
    │   } → Combined Goals
    │
    └─ UM → getGoalsForUM() → Unit Goals (unitManager === UM.name)
```

## Security Considerations

1. **Server-Side Validation**: Ensure all queries validate user's rank and agency
2. **No Data Leakage**: Users should only see data they're authorized for
3. **Agency Isolation**: Users can only access data from their own agency
4. **Hierarchy Validation**: Verify user's position in hierarchy before querying

## Edge Cases to Handle

1. **User without unitManager**: ADD/SUM might not have unitManager - handle gracefully
2. **Empty Teams**: Handle cases where UM/SUM has no subordinates
3. **Cross-Agency Access**: Prevent users from accessing other agencies' data
4. **Hierarchy Changes**: Handle cases where hierarchy data is missing or inconsistent
5. **Multiple Agencies**: If user has access to multiple agencies (future consideration)

## Future Enhancements (Out of Scope for Now)

1. **AUM Reporting**: AUMs can view their direct advisors (if needed)
2. **Advisor Self-View**: Advisors can view their own goals (if needed)
3. **Date Range Filtering**: Allow filtering reports by date range
4. **Comparative Reports**: Compare current period vs previous period
5. **Drill-Down Functionality**: Click on summary to see detailed breakdown

## Success Criteria

1. ✅ UMs can view reports for their direct team only
2. ✅ SUMs can view consolidated reports from all their units + direct advisors
3. ✅ ADDs can view consolidated reports for entire agency
4. ✅ Admins retain full access to all reports
5. ✅ No data leakage between roles/agencies
6. ✅ Aggregation calculations remain accurate
7. ✅ UI clearly indicates user's view scope
8. ✅ Performance is acceptable (efficient queries)


