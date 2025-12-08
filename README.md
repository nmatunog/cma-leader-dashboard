# CMA Leader Performance Dashboard

A modern, type-safe dashboard for tracking and managing Cebu Matunog Agency performance metrics.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Firebase Firestore
- **Data Source**: Google Sheets CSV

## Project Structure

```
cma-dashboard/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── sidebar.tsx       # Navigation sidebar
├── services/             # Business logic & API calls
│   ├── data-service.ts   # Firebase operations
│   └── sheets-service.ts # Google Sheets integration
├── types/                 # TypeScript type definitions
│   └── index.ts          # Core types
├── lib/                   # Utilities
│   ├── firebase.ts       # Firebase initialization
│   └── utils.ts          # Helper functions
└── actions/              # Server actions (future)
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration
- `NEXT_PUBLIC_GOOGLE_SHEETS_CSV_URL` - Google Sheets CSV export URL (optional, can configure in Settings)
- `NEXT_PUBLIC_EDIT_PASSWORD` - Password for enabling edit mode (default: `cma2025`)

**Note**: Change `NEXT_PUBLIC_EDIT_PASSWORD` in production!

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Code Principles

- **Keep It Simple**: Fewest lines, straightforward approaches
- **Readability First**: Clear variable names, self-documenting code
- **DRY**: Extract repeated logic to reusable functions/components
- **Type Safety**: TypeScript types for all props, state, and functions
- **Feature Organization**: Group by feature, not by file type

## Features

- ✅ **Multi-Sheet Data Sources**: Configure separate Google Sheets for:
  - Agency Summary (overall totals)
  - Leaders Data (Unit Managers)
  - Agents Data (all agents)
- ✅ **Sheet Management UI**: Easy upload and configuration of monthly worksheets
- ✅ **Firebase Integration**: Data persistence and real-time updates
- ✅ **Google Sheets CSV Sync**: Automatic data loading from configured sheets
- ✅ **Targets & Forecasts**: User input for targets (not from sheets)
- 🔄 Leaders targets & forecasts (in progress)
- 🔄 Agents targets & forecasts (in progress)
- 🔄 Comparison tables (in progress)
- 🔄 PDF export (planned)

## Multi-Sheet Configuration

The dashboard supports **three separate Google Sheets** as data sources:

1. **Agency Summary Sheet**: Contains overall agency totals (MTD/YTD)
2. **Leaders Sheet**: Contains Unit Managers performance data
3. **Agents Sheet**: Contains all agents performance data

### Setting Up Sheets

1. Go to **Settings** page in the dashboard
2. For each sheet type, click **Add Sheet**
3. Enter a name (e.g., "October 2025 Agency Summary")
4. Paste the Google Sheets CSV URL
5. Click **Save**

### Getting Google Sheets CSV URL

1. Open your Google Sheet
2. Click **File** → **Share** → **Publish to web**
3. Select **CSV** format
4. Click **Publish**
5. Copy the generated CSV URL

### Monthly Updates

To update data monthly:
1. Upload fresh worksheets to Google Sheets
2. Publish each sheet as CSV
3. Update the CSV URLs in Settings (or keep same URLs if sheet names don't change)
4. Click **Sync All Sheets** to refresh data

**Note**: Targets and forecasts are entered directly in the dashboard, not from sheets. Sheets only provide actual performance data.

## Edit Mode Protection

To protect data integrity, editing is password-protected:

1. **View Mode** (default): All data is read-only
2. **Edit Mode**: Click "Enable Editing" button, enter password
3. **Edit Mode Duration**: Active for 24 hours or until manually locked
4. **Password**: Set via `NEXT_PUBLIC_EDIT_PASSWORD` environment variable (default: `cma2025`)

**Benefits**:
- ✅ Simple: No user accounts or complex auth
- ✅ Secure: Password-protected editing
- ✅ Flexible: Edit mode persists for 24 hours
- ✅ Safe: Prevents accidental edits
- ✅ Data Integrity: All changes saved to Firebase

**How it works**:
- Dashboard metrics, targets, and forecasts require edit mode to modify
- Read-only by default - perfect for viewing/sharing
- Enable edit mode when you need to make changes
- Edit mode automatically expires after 24 hours

## License

Private - Cebu Matunog Agency
