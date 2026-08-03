# MASTER REBUILD PROMPT & SYSTEM ARCHITECTURE BLUEPRINT
> **System Instruction for AI Code Generator**: You are an expert Full-Stack Software Architect and Lead Developer. You are receiving this single self-contained master specification file to reconstruct and generate the exact **CSC-APP (TI Jobs Portal)** — a modern, high-performance Progressive Web Application (PWA) for Transworld International (TI Packing & Moving). 
> Execute the build process strictly in the order detailed in Section 6.

---

## 1. TARGET TECH STACK & SETUP

### Core Framework & Runtimes
- **Framework**: Next.js 16.2.9 (App Router, React 19 Server Components & Client Components)
- **Language**: TypeScript v5.x (Strict mode enabled)
- **Styling**: TailwindCSS v4 + Pure Vanilla CSS Modules (`*.module.css`) + CSS Custom Variables (`globals.css`)
- **Backend / BaaS**: Supabase (PostgreSQL 15+, Auth, Realtime Subscriptions, RLS Policies)
- **Storage**: AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) for secure document management
- **AI Integrations**: `@google/genai` (Gemini 2.5 Flash) with fallback / RAG support for Groq (`llama-3.3-70b-versatile`)
- **Automation & Background Ingestion**: GitHub Actions Workflows + Playwright (`playwright`) headless browser automation
- **Data Export & Processing**: `papaparse` (CSV), `xlsx` (Excel), `recharts` (Analytics Charts), `date-fns` (Date calculations)

### Package Dependencies (`package.json`)
```json
{
  "name": "csc-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db-cli": "tsx scripts/db-cli.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1091.0",
    "@aws-sdk/s3-request-presigner": "^3.1091.0",
    "@google/genai": "^2.10.0",
    "@supabase/supabase-js": "^2.109.0",
    "date-fns": "^4.4.0",
    "dotenv": "^17.4.2",
    "lucide-react": "^1.25.0",
    "next": "16.2.9",
    "papaparse": "^5.5.4",
    "pg": "^8.22.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-dropzone": "^19.1.1",
    "recharts": "^3.9.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Key Environment Variables & Secrets Configuration

#### A. Web App Environment Variables (`.env.local` / Vercel Environment Variables)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET_NAME=ti-jobs-documents

GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
CRON_SECRET_KEY=your-cron-secret-bearer-token
```

#### B. GitHub Repository Secrets (for GitHub Actions CI/CD & Automated ERP Sync)
- `ERP_SITE`: Target ERP login URL
- `ERP_USERNAME`: ERP system username
- `ERP_PASSWORD`: ERP system password
- `API_URL`: Direct deployment endpoint URL (e.g. `https://csc-app.vercel.app/api/ingest-erp`)
- `CRON_SECRET_KEY`: Secret Bearer token for authenticating ingestion calls
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

---

### PWA & Service Worker Caching Strategy
1. **Web App Manifest (`public/manifest.json` / `src/app/manifest.ts`)**:
   - `name`: "TI Jobs Portal - CSC App"
   - `short_name`: "TI Jobs"
   - `start_url`: "/home"
   - `display`: "standalone"
   - `background_color`: "#0f172a"
   - `theme_color`: "#059669"
   - `icons`: 192x192, 512x512 PNGs + SVG icon.
2. **Service Worker Caching Strategy (`public/sw.js`)**:
   - **Static Assets & App Shell**: Cache-First strategy for static JS, CSS, images, and fonts (`/static/*`, `/_next/static/*`).
   - **API & Dynamic Queries**: Network-First strategy with IndexedDB offline fallback caching for read endpoints (`/api/documents`, Supabase REST queries).
   - **Offline Synchronization**: Queue write requests (Job updates, communication logs) in IndexedDB when offline, auto-flushing on `online` event.

---

## 2. FILE TREE ARCHITECTURE

```
csc-app/
├── .github/                    # GitHub Actions CI/CD & Automated Workflows
│   └── workflows/
│       ├── sync-erp.yml        # Master Scheduled Cron Workflow (3:00, 6:00, 9:00, 12:00, 15:00 UTC)
│       ├── sync-erp-jobs.yml   # Playwright Headless ERP Job Register Scraper Workflow
│       ├── sync-erp-enq.yml    # Playwright Headless ERP Quote Values Scraper Workflow
│       └── debug-report.yml    # Debug Report Artifact Exporter Workflow
├── public/
│   ├── manifest.json           # PWA Web App Manifest
│   ├── sw.js                   # Service Worker script (Offline caching & sync)
│   ├── logo.jpg                # Brand Logo Asset
│   ├── icon.svg                # Application Favicon/Icon
│   └── vercel.svg, next.svg    # System Assets
├── scripts/                    # Automation Scripts & GitHub Sync Engine
│   ├── github_sync.js          # Playwright Headless ERP Scraper & Data Ingestion script
│   ├── update_erp_values.js    # Per-Enquiry Quote Value Scraper script
│   ├── package.json            # Scripts workspace dependencies (Playwright, xlsx)
│   └── package-lock.json
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root Layout (Fonts, Global Toast, Meta tags)
│   │   ├── page.tsx            # Entry Page (Redirects based on Auth session)
│   │   ├── globals.css         # CSS Variables, Design Tokens, Themes (Dark/Light)
│   │   ├── manifest.ts         # Next.js Metadata Route for PWA Manifest
│   │   ├── login/
│   │   │   ├── page.tsx        # Login Page (Email/Username auth, domain fallback)
│   │   │   └── login.module.css # Dual-panel glassmorphic styling
│   │   ├── signup/
│   │   │   └── page.tsx        # Self-registration with Admin approval workflow
│   │   ├── track/
│   │   │   └── [...id]/
│   │   │       └── page.tsx    # Public Customer Tracking Portal (No Auth)
│   │   ├── components/
│   │   │   └── AIChatbot.tsx   # Floating AI Assistant (Gemini 2.5)
│   │   ├── api/
│   │   │   ├── ai/route.ts     # AI Chatbot & Job Summarizer API
│   │   │   ├── auth/resolve/route.ts # Username-to-Email lookup fallback
│   │   │   ├── admin/
│   │   │   │   ├── create-user/route.ts   # Admin user creation
│   │   │   │   ├── delete-jobs/route.ts   # Bulk job deletion
│   │   │   │   ├── unlock-sync/route.ts   # ERP sync lock release
│   │   │   │   ├── users/route.ts         # User list & role updates
│   │   │   │   ├── export-legacy-jobs/route.ts # Legacy job CSV/Excel exporter
│   │   │   │   └── update-quote-values/route.ts # Quote value updates
│   │   │   ├── documents/
│   │   │   │   ├── upload/route.ts # Direct S3 file upload
│   │   │   │   ├── presign/route.ts# AWS S3 Pre-signed URL generator
│   │   │   │   ├── view/route.ts   # Secure document viewer
│   │   │   │   ├── verify/route.ts # Doc existence checker
│   │   │   │   ├── list/route.ts   # S3 file lister
│   │   │   │   └── save/route.ts   # Document metadata save
│   │   │   ├── export-csv/route.ts # Server-side CSV Exporter
│   │   │   ├── export-sheets/route.ts # Google Sheets/Excel Exporter
│   │   │   └── ingest-erp/
│   │   │       ├── route.ts        # ERP Ingestion endpoint
│   │   │       └── manual-trigger/route.ts # Manual Sync trigger
│   │   └── home/               # Protected App Dashboard Shell
│   │       ├── layout.tsx      # Sidebar Navigation, Auth Guard, Context Providers
│   │       ├── home.module.css # Sidebar & Layout Styles
│   │       ├── page.tsx        # Dashboard Home Landing Page
│   │       ├── active-jobs/
│   │       │   └── page.tsx    # Active Jobs Table & Stage Tracking
│   │       ├── closed-jobs/
│   │       │   └── page.tsx    # Closed Jobs Archive
│   │       ├── all-jobs/
│   │       │   └── page.tsx    # Full-Width Jobs Table (No Sidebar)
│   │       ├── follow-ups/
│   │       │   └── page.tsx    # Communication & Follow-up Scheduler
│   │       ├── unbilled/
│   │       │   ├── page.tsx    # Unbilled Jobs Management (Full-Width)
│   │       │   ├── actions.ts  # Server Actions for Unbilled
│   │       │   └── unbilled.module.css # Custom Excel-like Grid Styles
│   │       ├── reports/
│   │       │   └── page.tsx    # Analytics Dashboard (Recharts)
│   │       ├── legacy-jobs/
│   │       │   └── page.tsx    # Historical Legacy Jobs Repository
│   │       ├── job/
│   │       │   └── [id]/
│   │       │       ├── page.tsx             # Job Detail Master (~2000 lines)
│   │       │       └── jobDetails.module.css # Job Detail Styles
│   │       ├── admin/
│   │       │   └── page.tsx    # Admin Control Panel & ERP Sync Monitor
│   │       ├── permissions/
│   │       │   └── page.tsx    # Dynamic RBAC Matrix Editor
│   │       ├── users/
│   │       │   ├── page.tsx    # User Directory & Role Assignment
│   │       │   └── UserDetailsModal.tsx # Edit User Modal
│   │       ├── activity-log/
│   │       │   └── page.tsx    # Field-level Audit Trail Viewer
│   │       └── components/
│   │           ├── ProfilePopup.tsx           # User Profile Modal
│   │           ├── CommandPalette.tsx         # Cmd+K Global Search
│   │           ├── SyncERPButton.tsx          # ERP Manual Trigger Button
│   │           ├── BulkPodUploadModal.tsx     # POD Mass Upload Modal
│   │           ├── CustomSelect.tsx           # Custom Select Dropdown
│   │           ├── MultiSelect.tsx            # Multi-select Branch Picker
│   │           ├── JobMap.tsx                 # Origin/Destination Visual Map
│   │           └── PendingApprovalsReminder.tsx# Admin Approval Toast Alert
│   ├── components/
│   │   ├── GlobalDialogs.tsx   # Toast Notification Singleton (`showToast`)
│   │   ├── JobSearchBar.tsx    # Dynamic Search Bar Component
│   │   └── PermissionsContext.tsx # Central RBAC State Context
│   ├── hooks/
│   │   └── usePageAccess.ts    # Custom Hook for Route Guards & RBAC Checks
│   ├── lib/
│   │   ├── supabase.ts         # Singleton Supabase Client Connection
│   │   └── colorUtils.ts       # Avatar & Stage Color Utilities
│   └── types/
│       └── index.ts            # Global TypeScript Definitions
├── supabase/                   # Database Migrations & SQL Scripts
│   ├── create_role_permissions.sql
│   ├── add_unbilled_and_legacy_jobs.sql
│   ├── create_audit_logs.sql
│   ├── create_job_communications.sql
│   ├── create_whatsapp_logs.sql
│   └── add_ai_settings.sql
├── next.config.ts              # Next.js Build Configuration
├── tsconfig.json               # TypeScript Compiler Configuration
├── postcss.config.mjs          # PostCSS / Tailwind CSS Setup
├── package.json                # Project Dependencies & Scripts
└── PROJECT_MASTER_PROMPT.md    # Project Single Source of Truth
```

---

## 3. DATA MODELS & DATABASE SCHEMAS

### A. Supabase PostgreSQL Schema & SQL Migrations

```sql
-- 1. PROFILES TABLE (User Accounts & Role Management)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id SERIAL UNIQUE,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    photo TEXT,
    role TEXT NOT NULL DEFAULT 'Viewer', -- Legacy/Primary Role: Admin, Viewer, Executive, Manager
    csc_role TEXT DEFAULT 'None',       -- 'Admin', 'Manager', 'Executive', 'Viewer', 'None'
    unbilled_role TEXT DEFAULT 'None',  -- 'Admin', 'Manager', 'Executive', 'Viewer', 'None'
    tracking_role TEXT DEFAULT 'None',  -- Deprecated / Legacy
    branches TEXT[] DEFAULT '{}',       -- Array of assigned branches, e.g., {'BANGALORE', 'CHENNAI'}, or {'ALL'}
    branch_user_role TEXT,              -- Custom branch role title
    csc_coordinator TEXT,               -- Assigned coordinator name
    is_approved BOOLEAN DEFAULT FALSE,  -- Admin approval flag
    is_reviewed BOOLEAN DEFAULT FALSE,  -- Audit review flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JOBS TABLE (Core Logistics Jobs Data)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT UNIQUE NOT NULL,
    enquiry_number TEXT,
    branch TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    company TEXT,
    goods_description TEXT,
    origin TEXT,
    destination TEXT,
    packing_date DATE,
    delivery_date DATE,
    actual_delivery DATE,
    goods_track_status TEXT DEFAULT '01. Packing Not Scheduled',
    car_track_status TEXT DEFAULT '01. Vehicle Not Handed Over',
    po_status TEXT,
    po_date DATE,
    inv_request_date DATE,
    bill_closure_date DATE,
    sales_by TEXT,
    spoc_name TEXT,
    csc_coordinator TEXT,
    quote_value NUMERIC(12, 2),
    insurance_required BOOLEAN DEFAULT FALSE,
    documents JSONB DEFAULT '[]'::jsonb, -- Array of { id, doc_type, file_name, s3_key, uploaded_by, uploaded_at }
    whatsapp_sent_stages JSONB DEFAULT '{}'::jsonb, -- Map of { stage: true/timestamp }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEGACY JOBS TABLE (Historical / Archived Jobs Data)
CREATE TABLE IF NOT EXISTS public.legacy_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id SERIAL,
    job_number TEXT UNIQUE NOT NULL,
    enquiry_number TEXT,
    branch TEXT NOT NULL,
    customer_name TEXT,
    company TEXT,
    packing_date DATE,
    delivery_date DATE,
    goods_track_status TEXT,
    po_status TEXT,
    po_date DATE,
    inv_request_date DATE,
    bill_closure_date DATE,
    sales_by TEXT,
    spoc_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROLE PERMISSIONS MATRIX TABLE (RBAC Engine)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,       -- 'CSC', 'Tracking', 'Unbilled', 'Admin'
    role_name TEXT NOT NULL,      -- 'Viewer', 'Executive', 'Manager', 'Admin'
    page_name TEXT NOT NULL,      -- 'Active Jobs', 'Closed Jobs', 'CSC Jobs', 'All Jobs', 'Follow-ups', 'Unbilled Management', etc.
    access_level TEXT NOT NULL DEFAULT 'None',   -- 'None', 'View', 'Edit'
    UNIQUE(category, role_name, page_name)
);

-- 5. AUDIT LOGS TABLE (Field-Level Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    job_number TEXT NOT NULL DEFAULT '',
    name TEXT,
    username TEXT,
    field_change TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. UNBILLED FOLLOWUPS TABLE (Follow-up Notes per Job)
CREATE TABLE IF NOT EXISTS public.unbilled_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id SERIAL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    job_number TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    agent_name TEXT NOT NULL,
    followup_notes TEXT NOT NULL,
    next_followup_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. JOB COMMUNICATIONS LOG TABLE
CREATE TABLE IF NOT EXISTS public.job_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL,      -- 'Customer' or 'Internal'
    regarding TEXT NOT NULL,
    summary TEXT NOT NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WHATSAPP LOGS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_by TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_instruction TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON public.jobs(branch);
CREATE INDEX IF NOT EXISTS idx_jobs_goods_track_status ON public.jobs(goods_track_status);
CREATE INDEX IF NOT EXISTS idx_jobs_po_status ON public.jobs(po_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_job_number ON public.audit_logs(job_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unbilled_followups_job_number ON public.unbilled_followups(job_number);
```

### B. TypeScript Types (`src/types/index.ts`)

```typescript
export type UserRole = 'Admin' | 'Manager' | 'Executive' | 'Viewer' | 'None';

export interface UserProfile {
  id: string;
  user_id: number;
  username: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  role: UserRole;
  csc_role: UserRole;
  unbilled_role: UserRole;
  branches: string[];
  branch_user_role?: string;
  csc_coordinator?: string;
  is_approved: boolean;
  is_reviewed?: boolean;
}

export interface JobDocument {
  id: string;
  doc_type: string;
  file_name: string;
  s3_key: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Job {
  id: string;
  job_number: string;
  enquiry_number?: string;
  branch: string;
  customer_name: string;
  company?: string;
  goods_description?: string;
  origin?: string;
  destination?: string;
  packing_date?: string;
  delivery_date?: string;
  actual_delivery?: string;
  goods_track_status: string;
  car_track_status: string;
  po_status?: string;
  po_date?: string;
  inv_request_date?: string;
  bill_closure_date?: string;
  sales_by?: string;
  spoc_name?: string;
  csc_coordinator?: string;
  quote_value?: number;
  insurance_required?: boolean;
  documents?: JobDocument[];
  whatsapp_sent_stages?: Record<string, boolean | string>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  job_number: string;
  name: string;
  username: string;
  field_change: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}

export interface UnbilledFollowup {
  id: string;
  display_id: number;
  job_id: string;
  job_number: string;
  updated_by: string;
  agent_name: string;
  followup_notes: string;
  next_followup_date?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  category: 'CSC' | 'Tracking' | 'Unbilled' | 'Admin';
  role_name: UserRole;
  page_name: string;
  access_level: 'None' | 'View' | 'Edit';
}
```

### C. IndexedDB (Chrome DB) Offline Schema (`sw.js` / Client Offline Store)
- **Object Store**: `cached_jobs` (`keyPath: 'job_number'`) with indexes on `branch`, `goods_track_status`.
- **Object Store**: `offline_queue` (`keyPath: 'id'`, autoIncrement: true) storing deferred API payload mutations when network drops.

---

## 4. ROLE RBAC MATRIX & CONTROL RULES

### A. Role Hierarchies & Scope
1. **Super Admin** (`username === 'gp'` or email `gp@transworldintl.com`):
   - Unrestricted access to all modules, system configurations, user approvals, and permissions editor.
2. **Admin** (`role === 'Admin' || csc_role === 'Admin'`):
   - Access to Admin Panel (`/home/admin`), Audit Logs (`/home/activity-log`), User Directory.
   - Read-only capability on job pages (behaves as Viewer on job edits to prevent accidental data overwrites by non-operational admins).
3. **CSC Manager & CSC Executive** (`csc_role === 'Manager' | 'Executive'`):
   - Full operational access: Edit job stages, record communications, trigger WhatsApp alerts, upload S3 documents, sync ERP.
4. **Unbilled Manager & Unbilled Executive** (`unbilled_role === 'Manager' | 'Executive'`):
   - Access to Unbilled Management table (`/home/unbilled`), record follow-up notes, edit PO & billing closure dates.
5. **Viewer** (`csc_role === 'Viewer'` or `unbilled_role === 'Viewer'`):
   - Strict Read-Only across all allowed pages. Cannot edit fields, add comm logs, upload files, trigger Sync ERP, send WhatsApp, or access Group Chat. Can see empty fields without hiding.

### B. Access Control Matrix Table
| Module / Page | Admin | CSC Manager | CSC Executive | CSC Viewer | Unbilled Manager/Exec | Unbilled Viewer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Active Jobs** | View/Edit | Edit | Edit | View | None | None |
| **Closed Jobs** | View | Edit | View | View | None | None |
| **All Jobs Table** | View | Edit | View | View | None | None |
| **Follow-ups** | Edit | Edit | Edit | None (Blocked) | None | None |
| **Unbilled Table** | None / Edit | None | None | None | Edit | View |
| **Legacy Jobs** | Edit | None | None | None | Edit | View |
| **Reports** | View | View | View | None | View | None |
| **Sync ERP Button**| Visible | Visible | Visible | Hidden | Hidden | Hidden |
| **Admin Panel** | Full Access| None | None | None | None | None |
| **Roles & Permissions**| Super Admin| None | None | None | None | None |
| **User Directory** | Super Admin| None | None | None | None | None |

### C. Branch Scoping Rules
- Users with `branches = ['ALL']` can access data across all company branches.
- Users with specific branches (e.g. `['BANGALORE', 'CHENNAI']`) are restricted via Supabase `.in('branch', profile.branches)` filters in all page queries.

---

## 5. PAGE & COMPONENT SPECIFICATIONS

### 1. Root & Auth Pages (`/`, `/login`, `/signup`)
- **`app/page.tsx`**: Checks Supabase auth session; if unauthenticated redirects to `/login`, otherwise redirects to `/home`.
- **`app/login/page.tsx`**: 
  - Dual-panel layout (Left: Brand & stats with animated ambient orbs; Right: Glassmorphic form card).
  - Multi-tier resolution: Allows login via raw username (automatically appending `@transworldintl.com`), direct email, or phone resolution via `/api/auth/resolve`.
  - Blocked login check: If `is_approved === false`, signs out and shows toast "Account Pending Admin Approval".
- **`app/signup/page.tsx`**: Registers new user with Supabase Auth, inserts pending profile into `profiles` with `is_approved: false`, and alerts user to await Admin approval.

### 2. Dashboard Shell & Navigation (`/home/layout.tsx`)
- **Responsive Glassmorphic Sidebar**: Displays logo, current user profile avatar (click opens `ProfilePopup`), search shortcut indicator (`Cmd+K`), navigation list, and `SyncERPButton` at bottom.
- **Auto-Hiding Rules**: Sidebar automatically hides on `/home/job/[id]`, `/home/all-jobs`, and `/home/unbilled` to maximize screen workspace.
- **Navigation Items**:
  - `Active` (Green pill toggle) & `Closed` (Indigo pill toggle).
  - `Follow-ups`, `All Jobs`, `Unbilled`, `Reports`.
  - Admin section at bottom for `Admin`, `Roles`, `Users`.

### 3. Core Operational Job Detail (`/home/job/[id]/page.tsx` — ~2000 lines)
- **Goods Stage Slider**: Interactive visual timeline tracking 26 standardized stages:
  `01. Packing Not Scheduled` → `02. Packing Scheduled` → ... → `26. Billing Pending`.
- **Car Stage Track**: Interactive 16-stage car shipment tracker with drag-and-drop pointer support.
- **Documents Section**: S3 file drag-and-drop uploader (`react-dropzone`), rendering uploaded docs with presigned view links and delete actions.
- **Communications Log**: Form to log internal or customer calls, flag follow-ups, set follow-up dates, and list historical logs.
- **WhatsApp Action Buttons**: Stage-wise automated WhatsApp message generator with direct API logging in `whatsapp_logs`.
- **AI Job Summarizer**: Interacts with `/api/ai` to generate instant natural language summary of job timeline and current status using Gemini 2.5 Flash.
- **Audit Logging**: Every single field change triggers an auto-diff record into `audit_logs` table with `old_value`, `new_value`, `username`, and timestamp.
- **Real-Time Presence**: Uses Supabase Realtime channel to display avatars of other staff members currently viewing the exact same job ID.

### 4. Special Purpose Pages
- **`/home/unbilled/page.tsx`**: Full-screen Excel-like spreadsheet view for unbilled jobs. Supports inline status toggles, quick follow-up notes, Excel/CSV export, and pagination.
- **`/home/all-jobs/page.tsx`**: High-density full-width grid of all jobs across active and closed states with multi-column filtering.
- **`/home/reports/page.tsx`**: Analytics suite powered by Recharts (Job volume by branch, stage distribution, agent activity oversight, billing turnaround times).
- **`/home/follow-ups/page.tsx`**: Centralized task queue listing upcoming and pending follow-ups filtered by branch and assigned agent.
- **`/home/permissions/page.tsx`**: Super Admin interactive grid matrix to dynamically configure `None`, `View`, `Edit` per category, role, and page section.
- **`/home/activity-log/page.tsx`**: Complete field-level audit trail log table with date filters, user search, and change diff view.
- **`/track/[...id]/page.tsx`**: Publicly accessible customer tracking interface (no login required). Displays shipment progress bar, status notes, and embedded Gemini AI chatbot contextually locked to that shipment.

---

## 6. GITHUB ACTIONS CI/CD & BACKGROUND AUTOMATION

### A. GitHub Workflows (`.github/workflows/`)

#### 1. Master Scheduled Sync Workflow (`.github/workflows/sync-erp.yml`)
```yaml
name: Sync ERP Jobs to Supabase

on:
  workflow_dispatch: # Manual trigger from GitHub UI / API
  schedule:
    - cron: '0 3,6,9,12,15 * * *' # Every 3 hours during business window

jobs:
  run-sync-jobs:
    uses: ./.github/workflows/sync-erp-jobs.yml
    secrets: inherit

  run-sync-enq:
    needs: run-sync-jobs
    uses: ./.github/workflows/sync-erp-enq.yml
    secrets: inherit
```

#### 2. Playwright Headless ERP Scraper Workflow (`.github/workflows/sync-erp-jobs.yml`)
```yaml
name: Sync ERP Jobs Only

on:
  workflow_dispatch:
  workflow_call:

jobs:
  sync-jobs:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Node Dependencies
        run: |
          cd scripts
          npm install

      - name: Cache Playwright Chromium Browser
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('scripts/package-lock.json') }}

      - name: Install Playwright Chromium
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: |
          cd scripts
          npx playwright install chromium --with-deps

      - name: "Run Playwright ERP Scraper Script"
        env:
          ERP_USERNAME: ${{ secrets.ERP_USERNAME }}
          ERP_PASSWORD: ${{ secrets.ERP_PASSWORD }}
          ERP_SITE: ${{ secrets.ERP_SITE }}
          API_URL: ${{ secrets.API_URL }}
          CRON_SECRET_KEY: ${{ secrets.CRON_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd scripts
          node github_sync.js
```

### B. Headless Automation Script (`scripts/github_sync.js`)
- Launches Playwright headless Chromium (`headless: true`).
- Fills `#tcusr` and `#tcpwd` credentials, submits ERP login form.
- Navigates through query menu: `#r3c1` (Queries) $\rightarrow$ `#r6c2` (Job) $\rightarrow$ `#r6c3` (Job Register).
- Selects option `S`, sets date range (`01-Apr-2026` to today), triggers export `#btnexport`.
- Parses downloaded Excel sheet via `xlsx.read()`, filters jobs starting with `JB/`.
- Sends payload in 500-item batches to `/api/ingest-erp?is_last_batch=true` using `Authorization: Bearer ${CRON_SECRET_KEY}`.

---

## 7. STEP-BY-STEP GENERATION PROTOCOL

Instruct any AI code generator receiving this prompt to build the app by executing these exact numbered steps sequentially:

### Step 1: Project Setup & Package Installation
1. Initialize Next.js 16 project in current root directory with TypeScript and TailwindCSS v4:
   ```bash
   npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
2. Install exact production dependencies:
   ```bash
   npm install @supabase/supabase-js @google/genai @aws-sdk/client-s3 @aws-sdk/s3-request-presigner lucide-react recharts papaparse xlsx date-fns dotenv react-dropzone pg
   ```
3. Setup `globals.css` with dark mode defaults, CSS custom variables (`--bg-primary`, `--surface-color`, `--accent-green`, `--border-color`), glassmorphism utilities, and font imports.

### Step 2: Database Setup & Migrations
1. Create `supabase/` folder.
2. Execute the full SQL schema script from **Section 3.A** in Supabase SQL Editor to establish `profiles`, `jobs`, `legacy_jobs`, `role_permissions`, `audit_logs`, `unbilled_followups`, `job_communications`, `whatsapp_logs`, and `ai_settings`.
3. Verify RLS policies and seed default super admin profile (`username: 'gp'`, `role: 'Admin'`, `branches: ['ALL']`).

### Step 3: Core Libraries & Context Providers
1. Create `src/lib/supabase.ts` singleton client connection.
2. Create `src/lib/colorUtils.ts` for user color generation and badge styling.
3. Create `src/types/index.ts` containing all interfaces from **Section 3.B**.
4. Create `src/components/PermissionsContext.tsx` provider for dynamic RBAC permissions loading and evaluation.
5. Create `src/hooks/usePageAccess.ts` custom hook for route protection and access validation.
6. Create `src/components/GlobalDialogs.tsx` toast notification component (`showToast`).

### Step 4: API Serverless Routes
1. Build Auth Resolver: `src/app/api/auth/resolve/route.ts`.
2. Build AI Engine: `src/app/api/ai/route.ts` with Gemini 2.5 and Groq fallback.
3. Build Document Storage endpoints: `src/app/api/documents/upload`, `presign`, `view`, `verify`, `list`, `save`.
4. Build Admin APIs: `create-user`, `delete-jobs`, `unlock-sync`, `users`, `export-legacy-jobs`, `update-quote-values`.
5. Build ERP Ingestion pipeline: `src/app/api/ingest-erp/route.ts` and `manual-trigger/route.ts`.

### Step 5: Shared & Global Components
1. Create `src/app/components/AIChatbot.tsx` floating assistant.
2. Create `src/app/home/components/CommandPalette.tsx` global `Cmd+K` job search modal.
3. Create `src/app/home/components/SyncERPButton.tsx`, `ProfilePopup.tsx`, `MultiSelect.tsx`, `CustomSelect.tsx`, `PendingApprovalsReminder.tsx`, `JobMap.tsx`.

### Step 6: Authentication & Public Pages
1. Build `src/app/login/page.tsx` and `login.module.css`.
2. Build `src/app/signup/page.tsx`.
3. Build `src/app/track/[...id]/page.tsx` public customer tracking interface.

### Step 7: Dashboard Protected Shell & Pages
1. Build `src/app/home/layout.tsx` (Sidebar nav + Auth guard + Providers).
2. Build `src/app/home/page.tsx` (Dashboard home).
3. Build `src/app/home/active-jobs/page.tsx` & `closed-jobs/page.tsx`.
4. Build `src/app/home/all-jobs/page.tsx` (Full-width grid).
5. Build `src/app/home/unbilled/page.tsx` & `actions.ts`.
6. Build `src/app/home/follow-ups/page.tsx` & `reports/page.tsx`.
7. Build `src/app/home/job/[id]/page.tsx` (Master job details page with stage sliders, comm logs, S3 docs).
8. Build Admin pages: `admin/page.tsx`, `permissions/page.tsx`, `users/page.tsx`, `activity-log/page.tsx`.

### Step 8: PWA Service Worker & Manifest Configuration
1. Create `public/manifest.json` and `src/app/manifest.ts`.
2. Create `public/sw.js` with Cache-First static asset caching, Network-First API fallback, and IndexedDB offline queue.
3. Register service worker in `src/app/layout.tsx`.

### Step 9: GitHub Workflows & Automation Scripts Setup
1. Create `.github/workflows/sync-erp.yml`, `sync-erp-jobs.yml`, `sync-erp-enq.yml`, `debug-report.yml`.
2. Create `scripts/github_sync.js` Playwright browser automation script.
3. Configure GitHub repository secrets (`ERP_SITE`, `ERP_USERNAME`, `ERP_PASSWORD`, `API_URL`, `CRON_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---
*Blueprint Complete. All receiving AI models can proceed to generate code step-by-step.*
