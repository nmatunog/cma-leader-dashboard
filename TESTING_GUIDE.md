# Testing Guide - CMA Dashboard

## Quick Start

1. **Start Development Server**:
   ```bash
   cd cma-dashboard
   npm run dev
   ```

2. **Open Browser**: Navigate to [http://localhost:3000](http://localhost:3000)

---

## Test Checklist

### ✅ Basic Functionality

#### 1. Dashboard Page (`/`)
- [ ] Page loads without errors
- [ ] MTD Performance section displays 7 metric cards
- [ ] YTD Performance section displays 7 metric cards
- [ ] All values show as 0 initially (expected)
- [ ] Edit Mode Toggle button visible
- [ ] PDF Export button visible

#### 2. Edit Mode
- [ ] Click "Enable Editing" button
- [ ] Password dialog appears
- [ ] Enter password (default: `cma2025`)
- [ ] Edit mode activates (green "Edit Mode Active" badge)
- [ ] "Edit" buttons appear on metric cards
- [ ] Click "Lock Editing" to disable

#### 3. Dashboard Metrics Editing
- [ ] Enable edit mode
- [ ] Click "Edit" on any metric card
- [ ] Input field appears
- [ ] Enter a value (e.g., 1000000)
- [ ] Click "Save"
- [ ] Value updates and shows "Overridden" badge
- [ ] Refresh page - value persists

#### 4. Settings Page (`/settings`)
- [ ] Navigate to Settings from sidebar
- [ ] Three sheet configuration cards visible:
  - Agency Summary
  - Leaders Data
  - Agents Data
- [ ] "Add Sheet" buttons visible for each type
- [ ] "Sync All Sheets" button visible

#### 5. Sheet Configuration
- [ ] Click "Add Sheet" for Agency Summary
- [ ] Dialog opens
- [ ] Enter sheet name (e.g., "October 2025 Agency Summary")
- [ ] Enter Google Sheets CSV URL
- [ ] Click "Add Sheet"
- [ ] Sheet configuration saved
- [ ] Card shows sheet name and URL
- [ ] "Edit" and "Remove" buttons appear

#### 6. Google Sheets Sync
- [ ] Configure at least one sheet
- [ ] Click "Sync All Sheets"
- [ ] Loading indicator appears
- [ ] Success message shows data counts
- [ ] Dashboard metrics update (if agency sheet configured)
- [ ] Check browser console for any errors

#### 7. Leaders Targets Page (`/leaders-targets`)
- [ ] Navigate from sidebar
- [ ] Page loads
- [ ] Two tables visible:
  - Targets (Sept-Dec 2025)
  - Forecast (Nov-Dec 2025)
- [ ] Tables show leaders from synced data
- [ ] Edit mode toggle visible
- [ ] PDF export button visible

#### 8. Leaders Targets Editing
- [ ] Enable edit mode
- [ ] Input fields appear in tables
- [ ] Enter ANP Target value
- [ ] Value saves automatically
- [ ] Enter Recruits Target value
- [ ] Value saves automatically
- [ ] Enter forecast values (Nov/Dec)
- [ ] Values save automatically

#### 9. Agents Targets Page (`/agents-targets`)
- [ ] Navigate from sidebar
- [ ] Page loads
- [ ] Table shows agents (sorted by UM Name)
- [ ] Columns visible:
  - UM Name, Agent Name
  - FYC Target (editable)
  - FYP Target (auto-calculated, grayed out)
  - ANP Target (auto-calculated, grayed out)
  - Recruits Target (editable)
  - Forecast columns (editable)

#### 10. Agents Auto-Calculation
- [ ] Enable edit mode
- [ ] Enter FYC Target (e.g., 100000)
- [ ] FYP Target auto-calculates (should be 400000 = 100000 / 0.25)
- [ ] ANP Target auto-calculates (should be 440000 = 400000 * 1.1)
- [ ] Values update in real-time

#### 11. Comparison Page (`/comparison`)
- [ ] Navigate from sidebar
- [ ] Page loads
- [ ] Three summary cards visible:
  - Total Agents ANP Target
  - Total UM Forecast ANP
  - Variance
- [ ] Comparison table visible
- [ ] Alignment table visible
- [ ] Status badges show (Aligned/Under/Over)

#### 12. Comparison Editing
- [ ] Enable edit mode
- [ ] Adjusted ANP Target inputs appear
- [ ] Adjusted Recruits Target inputs appear
- [ ] Enter adjusted target for a unit
- [ ] Value saves automatically
- [ ] Agency total row editable

#### 13. PDF Export
- [ ] Click "Export PDF" button
- [ ] Dropdown menu appears with 4 options:
  - Dashboard Summary
  - Leaders Data
  - Comparison & Alignment
  - Full Dashboard
- [ ] Click "Dashboard Summary"
- [ ] PDF downloads with MTD/YTD metrics
- [ ] Test other export options

#### 14. Navigation
- [ ] Sidebar navigation works
- [ ] Click each menu item:
  - Dashboard
  - Leaders Targets
  - Agents Targets
  - Comparison
  - Reports (if implemented)
  - Settings
- [ ] Active page highlighted in sidebar
- [ ] Page transitions smooth

#### 15. Responsive Design
- [ ] Resize browser window
- [ ] Layout adapts on mobile (< 768px)
- [ ] Layout adapts on tablet (768px - 1024px)
- [ ] Layout adapts on desktop (> 1024px)
- [ ] Tables scroll horizontally on small screens
- [ ] Cards stack vertically on mobile

---

## Test Scenarios

### Scenario 1: First-Time Setup
1. Open dashboard
2. Go to Settings
3. Configure all three sheets
4. Sync data
5. Verify data appears in dashboard

### Scenario 2: Monthly Update
1. Update Google Sheets with new data
2. Go to Settings
3. Update CSV URLs (if needed)
4. Sync all sheets
5. Verify data updates

### Scenario 3: Target Setting Workflow
1. Enable edit mode
2. Set agency-level targets in dashboard
3. Set leader targets in Leaders page
4. Set agent FYC targets in Agents page
5. Verify auto-calculations work
6. Check comparison page for alignment

### Scenario 4: Data Override
1. Sync data from sheets
2. Enable edit mode
3. Override a dashboard metric
4. Verify "Overridden" badge appears
5. Sync sheets again
6. Verify override persists

---

## Common Issues & Solutions

### Issue: "No data found" messages
**Solution**: Sync data from Google Sheets first

### Issue: Edit mode password not working
**Solution**: 
- Check `.env.local` has `NEXT_PUBLIC_EDIT_PASSWORD`
- Default password is `cma2025`
- Restart dev server after changing

### Issue: Google Sheets sync fails
**Solution**:
- Verify sheet is published as CSV
- Check CSV URL format
- Check browser console for CORS errors
- Note: May not work locally, will work when deployed

### Issue: PDF export blank
**Solution**:
- Check browser console for errors
- Ensure element IDs exist
- Try different export option

### Issue: Auto-calculation not working
**Solution**:
- Ensure edit mode is enabled
- Check FYC value is entered
- Verify calculation formulas (FYP = FYC / 0.25, ANP = FYP * 1.1)

---

## Browser Console Checks

Open browser DevTools (F12) and check:

- ✅ No red errors
- ✅ Firebase connection successful
- ✅ Data loading messages
- ✅ Save confirmations
- ⚠️ Warnings are OK (Tailwind CDN, etc.)

---

## Performance Checks

- [ ] Page loads in < 2 seconds
- [ ] Navigation is instant
- [ ] Data saves quickly (< 500ms)
- [ ] PDF generation completes (< 5 seconds)
- [ ] No lag when typing in inputs

---

## Data Validation Tests

### Valid Inputs
- [ ] Currency values: 1000, 1000000, 1234567.89
- [ ] Whole numbers: 1, 10, 100
- [ ] Decimal numbers: 1.5, 10.25

### Invalid Inputs (Should Handle Gracefully)
- [ ] Empty strings → Should default to 0
- [ ] Negative numbers → Should allow (for variance)
- [ ] Very large numbers → Should handle
- [ ] Text in number fields → Should parse or show error

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Configure production environment variables**
3. **Deploy to Netlify/Vercel**
4. **Test in production environment**
5. **Train end users**

---

## Test Data

If you need test data, you can:

1. **Create test Google Sheets** with sample data
2. **Manually enter data** via edit mode
3. **Use Firebase console** to add test data directly

---

**Happy Testing!** 🚀

