# AD/DD Consolidated Reports with Filters - Detailed Plan

## Overview
Agency Directors (ADD) and District Directors (DD) need consolidated reports for their entire agency with the ability to filter by:
- **Unit** - View consolidated data for a specific unit (UM's team)
- **SUM** - View consolidated data for a specific SUM (all their units + direct advisors)
- **Overall** - View consolidated data for the entire agency (default view)

## Current State

### Existing Functionality
- Reports page has unit-level and agency-level aggregation
- Unit names format: `${unitManager}_${agencyName}`
- Agency aggregation consolidates from unit-level data (prevents double-counting)
- Filters exist for Agency, Rank, and Unit

### Hierarchy Structure
```
Agency (ADD/DD)
├── SUM 1
│   ├── UM 1.1
│   │   ├── Advisor 1.1.1
│   │   ├── Advisor 1.1.2
│   │   └── AUM 1.1.3
│   │       └── Advisor 1.1.3.1
│   ├── UM 1.2
│   │   └── Advisor 1.2.1
│   └── Direct Advisor 1.D (reports to SUM 1)
├── SUM 2
│   ├── UM 2.1
│   └── Direct Advisor 2.D
└── Direct Advisor D (reports to ADD/DD)
```

## Requirements for AD/DD View

### 1. Default View: Overall Agency
- **Scope**: All goals within the agency
- **Display**:
  - Agency-wide totals (FYP, FYC, Manpower, New Recruits, Income)
  - Breakdown by SUM (each SUM's consolidated totals)
  - Breakdown by Unit (all units in agency)
  - Quarterly summary
  - Individual reports table (all advisors/leaders in agency)

### 2. Filter: By SUM
- **Scope**: Consolidated data for a specific SUM
- **What's Included**:
  - All goals from UMs under the selected SUM (recursively - includes all advisors under those UMs)
  - All goals from direct advisors reporting to the selected SUM
- **Display**:
  - SUM-level consolidated totals
  - Breakdown by Unit (each UM under the SUM)
  - Breakdown by Direct Advisors (if any)
  - Individual reports table (filtered to SUM's scope)
  - Quarterly summary (for SUM's scope only)

### 3. Filter: By Unit
- **Scope**: Data for a specific unit (UM's team)
- **What's Included**:
  - All goals from advisors/AUMs in that unit (unitManager === UM name)
- **Display**:
  - Unit-level totals
  - Individual advisor breakdown
  - Quarterly summary (for unit only)
  - Individual reports table (filtered to unit only)

### 4. Filter Combinations
- **SUM Filter + Unit Filter**: Not applicable (Unit is nested under SUM)
  - If SUM is selected, only show units under that SUM in Unit filter dropdown
  - If Unit is selected, automatically determine which SUM it belongs to
- **Default**: Both filters set to "All" shows Overall agency view

## Implementation Plan

### Phase 1: Data Query Functions

#### 1.1 Create SUM Query Functions
**File**: `services/strategic-planning-service.ts`

**Function**: `getGoalsForSUM(sumName: string, agencyName: string): Promise<StrategicPlanningGoal[]>`

**Logic**:
1. Get all UMs under the SUM (from hierarchy service)
2. For each UM, get their unit goals using `getUnitGoals()`
3. Get direct advisors under SUM (unitManager === sumName AND rank !== 'UM')
4. Combine all results

**Function**: `getUnitsUnderSUM(sumName: string, agencyName: string): Promise<string[]>`

**Logic**:
1. Use hierarchy service to get all subordinates of SUM
2. Filter to only UMs (rank === 'UM')
3. Return array of UM names (unit names)

#### 1.2 Update Agency Query Functions
**File**: `services/strategic-planning-service.ts`

**Function**: `getGoalsForADD(addName: string, agencyName: string): Promise<StrategicPlanningGoal[]>`
- Already exists as `getAgencyGoals()` - can reuse
- Returns all goals for the agency

**Function**: `getSUMListForAgency(agencyName: string): Promise<string[]>`
- Get all SUMs in the agency from hierarchy
- Return array of SUM names

### Phase 2: Filter State Management

#### 2.1 Filter State Structure
**File**: `app/reports/page.tsx`

```typescript
// For ADD/DD users
const [filterSUM, setFilterSUM] = useState<string>('all'); // 'all' or SUM name
const [filterUnit, setFilterUnit] = useState<string>('all'); // 'all' or unit name

// Derived state: Available units based on SUM filter
const [availableUnits, setAvailableUnits] = useState<string[]>([]);
```

#### 2.2 Filter Logic

**When SUM filter changes:**
1. If SUM selected:
   - Update `availableUnits` to show only units under that SUM
   - If current unit filter is not under selected SUM, reset to 'all'
   - Load goals for selected SUM
2. If SUM = 'all':
   - Show all units in agency
   - Load all agency goals

**When Unit filter changes:**
1. If Unit selected:
   - If SUM filter is 'all', auto-determine which SUM the unit belongs to (optional)
   - Load goals for selected unit
2. If Unit = 'all':
   - If SUM is selected, show SUM's consolidated data
   - If SUM is 'all', show agency-wide data

### Phase 3: Data Loading Logic

#### 3.1 Goal Loading Function
**File**: `app/reports/page.tsx`

```typescript
const loadGoalsForADD = async () => {
  if (!user) return;
  
  let goals: StrategicPlanningGoal[] = [];
  
  if (filterSUM !== 'all' && filterUnit === 'all') {
    // Filter by SUM only
    goals = await getGoalsForSUM(filterSUM, user.agencyName);
  } else if (filterUnit !== 'all') {
    // Filter by Unit (regardless of SUM filter)
    const unitParts = filterUnit.split('_'); // Format: "UM_NAME_AGENCY_NAME"
    const umName = unitParts[0]; // Extract UM name
    goals = await getUnitGoals(umName, user.agencyName);
  } else {
    // Overall agency view (both filters = 'all')
    goals = await getAgencyGoals(user.agencyName);
  }
  
  setGoals(goals);
};
```

#### 3.2 Filter Options Loading

```typescript
const loadFilterOptions = async () => {
  if (!user || user.rank !== 'ADD') return;
  
  // Load SUM list
  const sums = await getSUMListForAgency(user.agencyName);
  setAvailableSUMs(sums);
  
  // Load units based on SUM filter
  if (filterSUM !== 'all') {
    const units = await getUnitsUnderSUM(filterSUM, user.agencyName);
    setAvailableUnits(units.map(umName => `${umName}_${user.agencyName}`));
  } else {
    // Load all units in agency
    const allUnits = await getUnitsByAgency(user.agencyName);
    setAvailableUnits(allUnits.map(umName => `${umName}_${user.agencyName}`));
  }
};
```

### Phase 4: UI Components

#### 4.1 Filter Section Layout

```
┌─────────────────────────────────────────────────────────┐
│ AD/DD Agency Reports - [Agency Name]                    │
├─────────────────────────────────────────────────────────┤
│ Filters:                                                │
│                                                         │
│  SUM: [Dropdown: All | SUM 1 | SUM 2 | ...]           │
│                                                         │
│  Unit: [Dropdown: All | Unit 1 | Unit 2 | ...]        │
│        (Disabled/enabled based on SUM selection)       │
│                                                         │
│  View: [Overall Agency] [By SUM] [By Unit]            │
│        (Visual indicator of current filter state)      │
└─────────────────────────────────────────────────────────┘
```

#### 4.2 Filter Dropdown Implementation

**SUM Filter Dropdown:**
```typescript
<select
  value={filterSUM}
  onChange={(e) => setFilterSUM(e.target.value)}
  className="border rounded px-3 py-2"
>
  <option value="all">All SUMs (Overall Agency)</option>
  {availableSUMs.map(sum => (
    <option key={sum} value={sum}>{sum}</option>
  ))}
</select>
```

**Unit Filter Dropdown:**
```typescript
<select
  value={filterUnit}
  onChange={(e) => setFilterUnit(e.target.value)}
  disabled={filterSUM !== 'all' && availableUnits.length === 0}
  className="border rounded px-3 py-2"
>
  <option value="all">
    {filterSUM !== 'all' 
      ? `All Units (Under ${filterSUM})`
      : 'All Units (Agency-wide)'}
  </option>
  {availableUnits.map(unitName => {
    const umName = unitName.split('_')[0];
    return (
      <option key={unitName} value={unitName}>{umName}</option>
    );
  })}
</select>
```

#### 4.3 View Context Header

```typescript
const getViewContext = () => {
  if (filterUnit !== 'all') {
    const umName = filterUnit.split('_')[0];
    return `Viewing: ${umName}'s Unit`;
  } else if (filterSUM !== 'all') {
    return `Viewing: ${filterSUM}'s Consolidated Team`;
  } else {
    return `Viewing: Overall Agency - ${user?.agencyName}`;
  }
};
```

### Phase 5: Aggregation Logic

#### 5.1 Aggregation Behavior

**Overall Agency View (Both filters = 'all'):**
- Existing aggregation logic applies
- Consolidates from unit-level → agency-level
- Shows breakdown by SUM and by Unit

**By SUM View (SUM selected, Unit = 'all'):**
- Aggregate all goals in the SUM's scope
- Show breakdown by Unit (each UM under SUM)
- Show breakdown by Direct Advisors (if any)
- Show SUM-level totals

**By Unit View (Unit selected):**
- Aggregate all goals in the unit
- Show unit-level totals
- Show individual advisor breakdown
- No further breakdown needed (unit is the smallest unit)

#### 5.2 Update calculateAggregates Function

The existing `calculateAggregates()` function should work as-is because:
- It already handles unit-level consolidation
- It aggregates from filtered `goals` array
- The filtering happens before aggregation

**No changes needed** - filtering the goals array before passing to `calculateAggregates()` is sufficient.

### Phase 6: Display Sections

#### 6.1 Summary Cards (Always Shown)

Display totals based on filtered scope:
- Total Manpower
- Total New Recruits
- Total FYP
- Total FYC
- Total Income
- Average Monthly Income

#### 6.2 Breakdown Sections (Conditional)

**Overall Agency View:**
- **Breakdown by SUM**: Show each SUM's consolidated totals
- **Breakdown by Unit**: Show all units in agency
- **Individual Reports**: All advisors/leaders

**By SUM View:**
- **Breakdown by Unit**: Show each UM's unit totals (under selected SUM)
- **Direct Advisors**: Show advisors directly reporting to SUM (if any)
- **SUM Summary**: Consolidated totals for the SUM
- **Individual Reports**: All advisors/leaders in SUM's scope

**By Unit View:**
- **Unit Summary**: Unit-level totals
- **Individual Advisors**: Breakdown by advisor in the unit
- **Individual Reports**: All advisors in the unit

#### 6.3 Quarterly Summary

Always show quarterly breakdown, but filtered to current scope:
- If Overall: Agency-wide quarterly data
- If By SUM: SUM's quarterly data
- If By Unit: Unit's quarterly data

### Phase 7: Hierarchy Service Extensions

#### 7.1 Required Functions

**File**: `services/organizational-hierarchy-service.ts`

**Function**: `getAllSUMsInAgency(agencyName: string): Promise<OrganizationalHierarchyEntry[]>`
```typescript
export async function getAllSUMsInAgency(agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  const entries = await getHierarchyByAgency(agencyName);
  return entries.filter(entry => entry.rank === 'SUM');
}
```

**Function**: `getUnitsUnderSUM(sumName: string, agencyName: string): Promise<string[]>`
```typescript
export async function getUnitsUnderSUM(sumName: string, agencyName: string): Promise<string[]> {
  const entries = await getHierarchyByAgency(agencyName);
  const units: string[] = [];
  
  // Get all UMs who report to this SUM (directly or indirectly)
  // Direct: unitManager === sumName AND rank === 'UM'
  const directUMs = entries.filter(
    entry => entry.unitManager === sumName && entry.rank === 'UM'
  );
  
  directUMs.forEach(um => units.push(um.name));
  
  return units.sort();
}
```

**Function**: `getDirectAdvisorsUnderSUM(sumName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]>`
```typescript
export async function getDirectAdvisorsUnderSUM(sumName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  const entries = await getHierarchyByAgency(agencyName);
  return entries.filter(
    entry => entry.unitManager === sumName && 
             entry.rank !== 'UM' && // Exclude UMs
             (entry.rank === 'ADV' || entry.rank === 'AUM')
  );
}
```

**Function**: `getAllSubordinatesRecursive(leaderName: string, agencyName: string): Promise<string[]>`
```typescript
export async function getAllSubordinatesRecursive(leaderName: string, agencyName: string): Promise<string[]> {
  const entries = await getHierarchyByAgency(agencyName);
  const subordinates: string[] = [];
  const visited = new Set<string>();
  
  function collectSubordinates(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    
    entries.forEach(entry => {
      if (entry.unitManager === name) {
        subordinates.push(entry.name);
        // Recursively collect their subordinates
        collectSubordinates(entry.name);
      }
    });
  }
  
  collectSubordinates(leaderName);
  return subordinates;
}
```

### Phase 8: Service Layer Updates

#### 8.1 SUM Goals Function

**File**: `services/strategic-planning-service.ts`

```typescript
export async function getGoalsForSUM(sumName: string, agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    const allGoals: StrategicPlanningGoal[] = [];
    
    // 1. Get all UMs under this SUM
    const umNames = await getUnitsUnderSUM(sumName, agencyName);
    
    // 2. Get goals for each UM's unit
    for (const umName of umNames) {
      const unitGoals = await getUnitGoals(umName, agencyName);
      allGoals.push(...unitGoals);
    }
    
    // 3. Get goals from direct advisors under SUM
    const directAdvisors = await getDirectAdvisorsUnderSUM(sumName, agencyName);
    for (const advisor of directAdvisors) {
      // Query goals where unitManager === sumName AND userName matches advisor
      const advisorGoals = await getGoalsByUserAndUnit(sumName, agencyName, advisor.name);
      allGoals.push(...advisorGoals);
    }
    
    // Remove duplicates (if any) and sort by submitted date
    const uniqueGoals = Array.from(
      new Map(allGoals.map(g => [g.id || `${g.userId}_${g.agencyName}`, g])).values()
    );
    
    return uniqueGoals.sort((a, b) => 
      b.submittedAt.getTime() - a.submittedAt.getTime()
    );
  } catch (error) {
    console.error('Error getting goals for SUM:', error);
    return [];
  }
}
```

**Helper Function**: `getGoalsByUserAndUnit(unitManager: string, agencyName: string, userName: string): Promise<StrategicPlanningGoal[]>`
```typescript
async function getGoalsByUserAndUnit(
  unitManager: string, 
  agencyName: string, 
  userName: string
): Promise<StrategicPlanningGoal[]> {
  const unitName = `${unitManager}_${agencyName}`;
  const q = query(
    collection(db, GOALS_COLLECTION),
    where('unitName', '==', unitName),
    where('userName', '==', userName)
  );
  
  const querySnapshot = await getDocs(q);
  const goals: StrategicPlanningGoal[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    goals.push({
      ...data,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as StrategicPlanningGoal);
  });
  
  return goals;
}
```

## Implementation Checklist

### Phase 1: Hierarchy Service Functions
- [ ] Add `getAllSUMsInAgency()` function
- [ ] Add `getUnitsUnderSUM()` function
- [ ] Add `getDirectAdvisorsUnderSUM()` function
- [ ] Add `getAllSubordinatesRecursive()` function (if needed)
- [ ] Test hierarchy traversal logic

### Phase 2: Service Layer Functions
- [ ] Add `getSUMListForAgency()` wrapper function
- [ ] Add `getGoalsForSUM()` function
- [ ] Add `getGoalsByUserAndUnit()` helper function
- [ ] Test query functions

### Phase 3: Reports Page Updates
- [ ] Add `filterSUM` state
- [ ] Update `filterUnit` state behavior for ADD users
- [ ] Add `availableUnits` and `availableSUMs` state
- [ ] Implement `loadFilterOptions()` function
- [ ] Update `loadGoals()` to handle ADD user with filters
- [ ] Update `calculateAggregates()` if needed (probably not)

### Phase 4: UI Components
- [ ] Add SUM filter dropdown
- [ ] Update Unit filter dropdown (conditional enable/disable)
- [ ] Add view context header/indicator
- [ ] Update breakdown sections based on filter state
- [ ] Add visual indicators for filter state

### Phase 5: Testing
- [ ] Test Overall Agency view (both filters = 'all')
- [ ] Test By SUM view (SUM selected, Unit = 'all')
- [ ] Test By Unit view (Unit selected)
- [ ] Test filter interactions (SUM change affects Unit dropdown)
- [ ] Test aggregation accuracy for each view
- [ ] Test performance with large datasets
- [ ] Verify no data leakage

## UI/UX Considerations

### Filter Interaction Flow

1. **Initial Load (ADD user):**
   - Both filters default to "All"
   - Shows overall agency view
   - SUM dropdown shows all SUMs in agency
   - Unit dropdown shows all units in agency

2. **User selects SUM:**
   - Unit dropdown updates to show only units under selected SUM
   - Unit filter resets to "All" if current selection is not under selected SUM
   - Data reloads to show SUM's consolidated view
   - Header updates to show "Viewing: [SUM Name]'s Consolidated Team"

3. **User selects Unit (while SUM is selected):**
   - Data filters to show only that unit's data
   - Header updates to show "Viewing: [UM Name]'s Unit"
   - Breakdown sections show unit-level data only

4. **User selects Unit (while SUM is 'all'):**
   - Data filters to show only that unit's data
   - SUM filter remains at "All"
   - Header updates to show "Viewing: [UM Name]'s Unit"

5. **User resets filters:**
   - Reset SUM to "All" → Unit dropdown shows all units, data shows overall agency
   - Reset Unit to "All" → Data shows SUM view (if SUM selected) or Agency view (if SUM = 'all')

### Visual Design

**Filter Section:**
```
┌──────────────────────────────────────────────────────┐
│ 🏢 Agency Reports - CEBU-EZ MATUNOG AGENCY          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Filters:                                             │
│   SUM: [All SUMs ▼]  Unit: [All Units ▼]          │
│                                                      │
│   📊 Viewing: Overall Agency                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**When SUM is selected:**
```
┌──────────────────────────────────────────────────────┐
│ 🏢 Agency Reports - CEBU-EZ MATUNOG AGENCY          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Filters:                                             │
│   SUM: [Hermelyn Simene ▼]  Unit: [All Units ▼]   │
│                                                      │
│   📊 Viewing: Hermelyn Simene's Consolidated Team   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**When Unit is selected:**
```
┌──────────────────────────────────────────────────────┐
│ 🏢 Agency Reports - CEBU-EZ MATUNOG AGENCY          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Filters:                                             │
│   SUM: [Hermelyn Simene ▼]  Unit: [Judeza Balisco ▼]│
│                                                      │
│   📊 Viewing: Judeza Balisco's Unit                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
ADD User Loads Reports Page
    │
    ├─ Load Filter Options
    │   ├─ getSUMListForAgency() → [SUM1, SUM2, ...]
    │   └─ getUnitsByAgency() → [Unit1, Unit2, ...]
    │
    └─ Load Goals (based on filters)
        │
        ├─ filterSUM = 'all' AND filterUnit = 'all'
        │   └─ getAgencyGoals() → All Agency Goals
        │
        ├─ filterSUM = 'X' AND filterUnit = 'all'
        │   └─ getGoalsForSUM('X') → {
        │       ├─ getUnitsUnderSUM('X') → [UM1, UM2]
        │       ├─ getUnitGoals(UM1) → UM1's goals
        │       ├─ getUnitGoals(UM2) → UM2's goals
        │       └─ getDirectAdvisorsUnderSUM('X') → Direct advisor goals
        │   }
        │
        └─ filterUnit = 'Y'
            └─ getUnitGoals('Y') → Unit Y's goals
                │
                └─ calculateAggregates(filteredGoals)
                    └─ Display aggregated data
```

## Success Criteria

1. ✅ ADD/DD users can view overall agency reports (default)
2. ✅ ADD/DD users can filter by SUM to see consolidated SUM view
3. ✅ ADD/DD users can filter by Unit to see unit-level view
4. ✅ Filter interactions work correctly (SUM selection updates Unit dropdown)
5. ✅ Aggregation calculations are accurate for each view level
6. ✅ UI clearly indicates current filter state and view scope
7. ✅ Performance is acceptable (efficient queries, no unnecessary re-renders)
8. ✅ Data integrity maintained (no double-counting, correct filtering)


