# How to Share Google Sheets for Dashboard

This guide shows you how to publish your Google Sheets as CSV so the dashboard can read the data.

## Quick Steps

1. **Open your Google Sheet**
2. **Publish as CSV** (File → Share → Publish to web)
3. **Copy the CSV URL**
4. **Add to Dashboard Settings**

---

## Detailed Instructions

### Step 1: Open Your Google Sheet

Open the Google Sheet you want to use as a data source in Google Sheets.

### Step 2: Publish as CSV

1. Click **File** in the top menu
2. Select **Share** → **Publish to web**
   - Or go directly: **File** → **Share** → **Publish to web**

### Step 3: Configure Publishing Settings

In the "Publish to web" dialog:

1. **Select what to publish**: Choose the specific sheet tab (e.g., "Sheet1", "Agency Summary")
2. **Select format**: Choose **CSV** (Comma-separated values)
3. Click **Publish**

### Step 4: Copy the CSV URL

After publishing, you'll see a URL like this:

```
https://docs.google.com/spreadsheets/d/1ABC123xyz.../export?format=csv&gid=0
```

**Copy this entire URL** - you'll need it for the dashboard.

### Step 5: Add to Dashboard

1. Open your dashboard: `http://localhost:3000/settings`
2. Find the section for your sheet type:
   - **Agency Summary** - for overall totals
   - **Leaders Data** - for Unit Managers
   - **Agents Data** - for all agents
3. Click **Add Sheet** button
4. Enter:
   - **Name**: e.g., "October 2025 Agency Summary"
   - **CSV URL**: Paste the URL you copied
5. Click **Save**

### Step 6: Sync Data

1. After adding all your sheets, click **Sync All Sheets** button
2. Wait for the sync to complete
3. Check the dashboard - your data should now appear!

---

## Example: Three Separate Sheets

You can use **three different Google Sheets** for different data:

### Sheet 1: Agency Summary
- **Purpose**: Overall agency totals (MTD/YTD metrics)
- **Columns**: ANP MTD, FYP MTD, FYC MTD, Cases MTD, Persistency, etc.
- **URL Example**: `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`

### Sheet 2: Leaders Data
- **Purpose**: Unit Managers performance
- **Columns**: UM Name, ANP_MTD, CASECNT_MTD, Unit, etc.
- **URL Example**: `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`

### Sheet 3: Agents Data
- **Purpose**: All agents performance
- **Columns**: AGENT NAME, UM Name, ANP_MTD, FYP MTD SP at 10%, CASECNT_MTD, etc.
- **URL Example**: `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`

---

## Important Notes

### ✅ Do This

- **Publish each sheet separately** - Each sheet needs its own CSV URL
- **Use CSV format** - The dashboard reads CSV, not Excel or PDF
- **Keep URLs updated** - If you rename sheets, update URLs in Settings
- **Publish the correct tab** - Make sure you select the right sheet tab when publishing

### ❌ Don't Do This

- **Don't use "Share" button** - That's for sharing with people, not for CSV export
- **Don't use Excel format** - Dashboard only reads CSV
- **Don't share private sheets** - Make sure sheets are accessible (or use service account)

---

## Troubleshooting

### Problem: "Failed to fetch" error

**Solution**: 
- Check that the sheet is published (not just shared)
- Verify the URL ends with `format=csv`
- Make sure the sheet is accessible (not private)

### Problem: Data not showing

**Solution**:
- Check column names match expected format (see below)
- Verify CSV URL is correct
- Check browser console for errors
- Try syncing again

### Problem: Wrong data appearing

**Solution**:
- Verify you selected the correct sheet tab when publishing
- Check that the CSV URL points to the right sheet
- Make sure column headers match expected names

---

## Expected Column Names

The dashboard looks for these column names (case-insensitive):

### Agency Summary Sheet
- `ANP MTD` or `ANP_MTD`
- `FYP MTD` or `FYP_MTD`
- `FYC MTD` or `FYC_MTD`
- `Cases MTD` or `CASECNT_MTD`
- `PERS` or `Persistency MTD`
- `ANP YTD` or `ANP_YTD`
- `FYP YTD` or `FYP_YTD`
- `FYC YTD` or `FYC_YTD`
- `Cases YTD` or `CASECNT_YTD`
- `Persistency YTD` or `PERS_YTD`

### Leaders Sheet
- `UM Name` or `Leader Name` or `AGENT NAME`
- `ANP_MTD`
- `CASECNT_MTD` or `CASECNT_YTD`
- `Unit`

### Agents Sheet
- `AGENT NAME` or `Agent Name`
- `UM Name`
- `ANP_MTD`
- `FYP MTD SP at 10%`
- `CASECNT_MTD`
- `Unit`

---

## Monthly Updates

To update data monthly:

1. **Update your Google Sheets** with new data
2. **Keep the same sheet names** (or update URLs in Settings)
3. **Click "Sync All Sheets"** in dashboard Settings
4. **Data will refresh automatically**

**Note**: Targets and forecasts are entered directly in the dashboard, not from sheets. Sheets only provide actual performance data.

---

## Security Considerations

### Public Sheets (Recommended for Testing)
- ✅ Easy to set up
- ✅ No authentication needed
- ⚠️ Anyone with URL can access

### Private Sheets (For Production)
- ✅ More secure
- ⚠️ Requires service account setup
- ⚠️ More complex configuration

For now, public CSV export is fine for testing. You can secure it later if needed.

---

## Quick Reference

| Step | Action | Location |
|------|--------|----------|
| 1 | Open Google Sheet | Google Sheets |
| 2 | File → Share → Publish to web | Google Sheets menu |
| 3 | Select CSV format | Publish dialog |
| 4 | Copy CSV URL | Publish dialog |
| 5 | Add to Dashboard Settings | `http://localhost:3000/settings` |
| 6 | Sync All Sheets | Settings page |

---

## Need Help?

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify CSV URL is accessible in a new tab
3. Ensure column names match expected format
4. Try republishing the sheet





