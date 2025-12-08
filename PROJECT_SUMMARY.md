# CMA Leader Performance Dashboard - Project Summary

## Overview

A modern, type-safe performance dashboard for Cebu Matunog Agency built with Next.js, React, TypeScript, and Firebase. The dashboard enables tracking, monitoring, and management of agency performance metrics with multi-source data integration and comprehensive reporting capabilities.

**Project Status**: ✅ Complete and Production-Ready

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Font Awesome 6.5.2

### Backend & Data
- **Database**: Firebase Firestore
- **Data Sources**: Google Sheets (CSV export)
- **PDF Export**: jsPDF + html2canvas

### Development Tools
- **Linting**: ESLint (eslint-config-next)
- **Formatting**: Prettier
- **Package Manager**: npm

---

## Project Structure

```
cma-dashboard/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Dashboard home
│   ├── leaders-targets/     # Leaders targets page
│   ├── agents-targets/      # Agents targets page
│   ├── comparison/          # Comparison & alignment page
│   ├── settings/            # Settings page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
│
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── sidebar.tsx          # Navigation sidebar
│   ├── dashboard-metrics.tsx # MTD/YTD metrics
│   ├── editable-metric-card.tsx # Editable metric cards
│   ├── leaders-targets-table.tsx # Leaders table
│   ├── agents-targets-table.tsx  # Agents table
│   ├── comparison-tables.tsx     # Comparison tables
│   ├── sheets-manager.tsx        # Sheet management UI
│   ├── edit-mode-toggle.tsx     # Edit mode toggle
│   └── pdf-export-button.tsx    # PDF export button
│
├── actions/                 # Server actions
│   ├── dashboard-actions.ts      # Dashboard operations
│   ├── leaders-actions.ts        # Leaders CRUD
│   ├── agents-actions.ts         # Agents CRUD
│   ├── comparison-actions.ts     # Comparison calculations
│   └── sheets-actions.ts         # Sheet sync operations
│
├── services/                # Business logic layer
│   ├── data-service.ts          # Firebase operations
│   ├── sheets-service.ts        # Google Sheets parsing
│   └── sheets-config-service.ts  # Sheet configuration
│
├── types/                   # TypeScript definitions
│   └── index.ts             # All type definitions
│
├── lib/                     # Utilities
│   ├── firebase.ts          # Firebase initialization
│   ├── pdf-export.ts        # PDF generation
│   ├── edit-mode.ts         # Edit mode management
│   └── utils.ts             # Helper functions
│
└── hooks/                   # React hooks
    └── use-edit-mode.ts     # Edit mode hook
```

---

## Core Features

### 1. Dashboard Metrics (MTD & YTD)
- **14 Editable Metrics**:
  - MTD: ANP, FYP, FYC, Case Count, Producing Advisors, Total Manpower, Total Producing Advisors
  - YTD: Same metrics for year-to-date
- **Inline Editing**: Click "Edit" on any card to modify values
- **Override Tracking**: Visual indicators for manually edited values
- **Auto-save**: Changes saved to Firebase automatically

### 2. Multi-Sheet Data Sources
- **Three Separate Sheets**:
  - Agency Summary Sheet (overall totals)
  - Leaders Sheet (Unit Managers data)
  - Agents Sheet (all agents data)
- **Sheet Management UI**: Easy configuration in Settings page
- **Monthly Updates**: Update CSV URLs to refresh data
- **Auto-sync**: One-click sync from all configured sheets

### 3. Leaders Targets & Forecasts
- **Targets Table**: Set ANP and Recruits targets per leader
- **Forecasts Table**: Set Nov/Dec forecasts for ANP and Recruits
- **Real-time Updates**: Changes saved immediately
- **Edit Mode Protected**: Requires password to edit

### 4. Agents Targets & Forecasts
- **FYC Input**: Enter FYC target, auto-calculates FYP and ANP
  - FYP = FYC ÷ 25%
  - ANP = FYP × 110%
- **Forecasts**: Monthly FYC and Recruits forecasts
- **Sorted**: By UM Name, then Agent Name
- **Auto-calculation**: FYP and ANP update automatically

### 5. Comparison & Alignment
- **Summary Cards**: Total Agents ANP, Total UM Forecast, Variance
- **Comparison Table**: Per-unit comparison with variance
- **Alignment Table**: Detailed alignment status with color coding
- **Adjusted Targets**: Editable per unit and agency level
- **Status Indicators**: Aligned/Under/Over badges

### 6. PDF Export
- **Four Export Options**:
  1. Dashboard Summary (MTD/YTD metrics)
  2. Leaders Data (targets and forecasts table)
  3. Comparison & Alignment (comparison tables)
  4. Full Dashboard (screenshot of entire page)
- **Formatted Output**: Professional PDFs with proper formatting
- **Multi-page Support**: Handles long tables automatically

### 7. Edit Mode Protection
- **Password-Protected**: Simple password-based edit mode
- **24-Hour Sessions**: Edit mode persists for 24 hours
- **Read-Only Default**: Safe for viewing/sharing
- **Visual Indicators**: Shows when edit mode is active

---

## Data Flow

### Loading Data
1. **From Google Sheets**:
   - User configures CSV URLs in Settings
   - Click "Sync All Sheets"
   - Data parsed and saved to Firebase
   - Dashboard updates automatically

2. **From Firebase**:
   - App loads data on page load
   - Real-time updates via Firebase listeners
   - Manual edits saved immediately

### Saving Data
- **Targets & Forecasts**: Saved to Firebase on input change
- **Dashboard Metrics**: Saved with override flags
- **Sheet Configurations**: Saved to Firebase config collection
- **All Changes**: Persisted across sessions

---

## Key Design Decisions

### 1. Simple Edit Mode (No Complex Auth)
- **Why**: Keeps it simple, no user management overhead
- **How**: Password-protected edit mode with localStorage
- **Benefit**: Easy to use, secure enough for internal use

### 2. Multi-Sheet Architecture
- **Why**: Separate sheets for different data types
- **How**: Three sheet configurations (agency, leaders, agents)
- **Benefit**: Flexible, easy monthly updates

### 3. Auto-Calculation for Agents
- **Why**: Reduces manual errors, ensures consistency
- **How**: FYC → FYP → ANP calculation chain
- **Benefit**: Faster data entry, accurate calculations

### 4. TypeScript Throughout
- **Why**: Type safety, better IDE support, fewer bugs
- **How**: All functions, props, and state typed
- **Benefit**: Catches errors at compile time

### 5. Server Actions Pattern
- **Why**: Next.js best practice, type-safe API calls
- **How**: Server actions for all data operations
- **Benefit**: Better performance, type safety

---

## Environment Variables

Create `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Edit Mode Password (change in production!)
NEXT_PUBLIC_EDIT_PASSWORD=your_secure_password
```

---

## Getting Started

### 1. Installation
```bash
cd cma-dashboard
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials
```

### 3. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Usage Guide

### Initial Setup

1. **Configure Firebase**:
   - Create Firebase project
   - Enable Firestore
   - Copy config to `.env.local`

2. **Configure Google Sheets**:
   - Go to Settings page
   - Add Agency Summary sheet CSV URL
   - Add Leaders sheet CSV URL
   - Add Agents sheet CSV URL
   - Click "Sync All Sheets"

3. **Set Edit Password**:
   - Update `NEXT_PUBLIC_EDIT_PASSWORD` in `.env.local`
   - Restart dev server

### Daily Usage

1. **View Dashboard**: Open dashboard to see MTD/YTD metrics
2. **Enable Edit Mode**: Click "Enable Editing", enter password
3. **Edit Metrics**: Click "Edit" on any metric card
4. **Set Targets**: Go to Leaders/Agents pages, enter targets
5. **Check Alignment**: View Comparison page for alignment status
6. **Export Reports**: Click "Export PDF" for reports

### Monthly Updates

1. Upload fresh worksheets to Google Sheets
2. Publish each sheet as CSV (File → Share → Publish to web)
3. Update CSV URLs in Settings (if sheet names changed)
4. Click "Sync All Sheets" to refresh data
5. Review and adjust targets/forecasts as needed

---

## Code Principles Applied

### ✅ Keep It Simple
- Minimal dependencies
- Straightforward implementations
- No over-engineering

### ✅ Readability First
- Clear variable names
- Self-documenting code
- Comments for "why" not "what"

### ✅ DRY (Don't Repeat Yourself)
- Reusable components
- Utility functions for common operations
- Shared types and interfaces

### ✅ Type Safety
- TypeScript throughout
- Typed props, state, and functions
- Compile-time error checking

### ✅ Feature Organization
- Grouped by feature, not file type
- Clear separation of concerns
- Easy to navigate and maintain

---

## File Organization

### Pages (`app/`)
- Each route has its own page component
- Server components by default
- Client components marked with `'use client'`

### Components (`components/`)
- Reusable UI components
- Feature-specific components
- shadcn/ui components in `ui/` folder

### Actions (`actions/`)
- Server actions for data operations
- Type-safe API calls
- Error handling included

### Services (`services/`)
- Business logic layer
- Firebase operations
- Google Sheets parsing

### Types (`types/`)
- Centralized type definitions
- Shared across the application
- Single source of truth

---

## Data Models

### Leader
```typescript
{
  id: string;
  name: string;
  unit: string;
  anpActual: number;
  anpTarget: number;
  recruitsActual: number;
  recruitsTarget: number;
  anpNovForecast: number;
  anpDecForecast: number;
  recNovForecast: number;
  recDecForecast: number;
}
```

### Agent
```typescript
{
  id: string;
  name: string;
  umName: string;
  unit: string;
  anpActual: number;
  fypActual: number;
  casesActual: number;
  fycTarget: number;
  fypTarget: number;      // Auto-calculated
  anpTarget: number;      // Auto-calculated
  recruitsTarget: number;
  fycNovForecast: number;
  fycDecForecast: number;
  recNovForecast: number;
  recDecForecast: number;
}
```

### AgencySummary
```typescript
{
  // MTD Metrics
  totalAnpMtd: number;
  totalFypMtd: number;
  totalFycMtd: number;
  totalCasesMtd: number;
  producingAdvisorsMtd: number;
  totalManpowerMtd: number;
  totalProducingAdvisorsMtd: number;
  
  // YTD Metrics
  totalAnpYtd: number;
  totalFypYtd: number;
  totalFycYtd: number;
  totalCasesYtd: number;
  producingAdvisorsYtd: number;
  totalManpowerYtd: number;
  totalProducingAdvisorsYtd: number;
  
  // Override tracking
  overrides?: { [key: string]: boolean };
}
```

---

## Security Considerations

### Edit Mode Protection
- Password-protected editing
- Prevents accidental changes
- 24-hour session timeout
- Can be locked manually

### Data Integrity
- All changes saved to Firebase
- Override tracking for manual edits
- Validation on inputs
- Error handling throughout

### Firebase Security
- Firestore security rules should be configured
- Read/write access control
- Data validation rules

---

## Performance Optimizations

- **Server Components**: Default to server components for better performance
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component (if used)
- **Lazy Loading**: Components loaded on demand
- **Firebase Caching**: Client-side caching of Firebase data

---

## Deployment

### Netlify (Recommended)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy

### Vercel
1. Import project
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

---

## Future Enhancements (Optional)

- [ ] User authentication (if needed)
- [ ] Email notifications
- [ ] Data visualization charts
- [ ] Historical data tracking
- [ ] Mobile app
- [ ] Real-time collaboration
- [ ] Advanced analytics

---

## Troubleshooting

### Google Sheets Not Loading
- **Issue**: CORS errors or connection refused
- **Solution**: Ensure sheets are published as CSV, check URLs in Settings

### Edit Mode Not Working
- **Issue**: Password not accepted
- **Solution**: Check `NEXT_PUBLIC_EDIT_PASSWORD` in `.env.local`, restart server

### Firebase Errors
- **Issue**: Permission denied or connection errors
- **Solution**: Check Firebase config, verify Firestore rules, check network

### PDF Export Issues
- **Issue**: Blank PDF or errors
- **Solution**: Check browser console, ensure element IDs exist

---

## Support & Maintenance

### Regular Tasks
- **Monthly**: Update Google Sheets CSV URLs
- **Weekly**: Review and adjust targets/forecasts
- **As Needed**: Export PDF reports

### Backup Strategy
- Firebase automatically backs up Firestore data
- Export PDFs regularly for offline access
- Keep Google Sheets as source of truth

---

## Project Statistics

- **Total Files**: ~30+ files
- **Lines of Code**: ~3,500+ lines
- **Components**: 10+ React components
- **Pages**: 5 main pages
- **Server Actions**: 5 action files
- **Services**: 3 service files
- **Types**: 8+ TypeScript interfaces

---

## Credits

Built following modern web development best practices:
- Next.js App Router
- React Server Components
- TypeScript strict mode
- Tailwind CSS utility-first
- shadcn/ui component library
- Firebase Firestore
- jsPDF for PDF generation

---

## License

Private - Cebu Matunog Agency

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready ✅

