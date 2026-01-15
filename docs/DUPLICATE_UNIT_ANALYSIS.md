# Analysis: Why Duplicate Units Appear in Comparisons but Not Reports

## The Problem

The duplicate "Maria Rosario C. Matunog" unit appears in the **Comparisons filter dropdown** but NOT in the **Reports filter dropdown**.

## Root Cause

### Comparisons Page (Shows Duplicates)

**Location**: `components/goal-comparison/goal-comparison-view.tsx`

1. **For ADD users**, units are loaded from `agencyComparison.unitVariances`:
   ```typescript
   const units = agencyComp.unitVariances.map(uv => ({
     name: uv.unitManager,
     displayName: uv.unitManager,
   }));
   ```

2. **`unitVariances` comes from `getAgencyComparison()`** in `services/goal-comparison-service.ts`:
   - Line 286: `unitKey = \`${goal.userName}_${normalizedAgency}\`;` (for UM/SUM goals)
   - Line 317: `const unitManagerName = unitLeaderGoal?.userName || ...`
   - **Problem**: Uses `goal.userName` DIRECTLY without normalization

3. **Result**: If there are two goals with different `userName` casing:
   - Goal 1: `userName = "MARIA ROSARIO C. MATUNOG"` → `unitKey = "MARIA ROSARIO C. MATUNOG_..."` → `unitManagerName = "MARIA ROSARIO C. MATUNOG"`
   - Goal 2: `userName = "Maria Rosario C. Matunog"` → `unitKey = "Maria Rosario C. Matunog_..."` → `unitManagerName = "Maria Rosario C. Matunog"`
   - **TWO separate entries** in `unitVariances` → TWO entries in filter dropdown

### Reports Page (Does NOT Show Duplicates)

**Location**: `app/reports/page.tsx`

1. **For ADD users**, units are loaded from `getUnitsByAgency()`:
   ```typescript
   const allUnits = await getUnitsByAgency(user.agencyName);
   ```

2. **`getUnitsByAgency()`** in `services/organizational-hierarchy-service.ts`:
   - Gets units from the **hierarchy collection** (not from goals)
   - Line 237-239: Adds UMs from hierarchy entries: `units.add(entry.name);`
   - Uses JavaScript `Set` which is case-sensitive, BUT hierarchy collection only has ONE entry per person
   - Hierarchy entries are normalized when saved (uppercase), so only ONE entry exists

3. **Result**: Only ONE entry in hierarchy → Only ONE entry in filter dropdown

## The Fix

Normalize unit manager names in `getAgencyComparison()` when creating `unitKey` and `unitManagerName`, similar to how it's done in `getUnitComparison()`.

**Current code** (line 286):
```typescript
unitKey = `${goal.userName}_${normalizedAgency}`;
```

**Should be**:
```typescript
const normalizeName = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');
unitKey = `${normalizeName(goal.userName)}_${normalizedAgency}`;
```

**Current code** (line 317):
```typescript
const unitManagerName = unitLeaderGoal?.userName || unitGoals[0]?.unitManager || unitKey.split('_')[0];
```

**Should be**:
```typescript
const normalizeName = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');
const unitManagerName = unitLeaderGoal?.userName 
  ? normalizeName(unitLeaderGoal.userName)
  : (unitGoals[0]?.unitManager 
    ? normalizeName(unitGoals[0].unitManager) 
    : normalizeName(unitKey.split('_')[0]));
```

However, we still need to display the original casing in the UI, so we should:
1. Normalize `unitKey` for grouping (to merge duplicates)
2. Keep original `userName` for display in `unitManagerName`

Actually, better approach:
- Normalize `unitKey` to merge duplicates
- Use the FIRST goal's `userName` (original casing) for display
- This way duplicates are merged but original casing is preserved







