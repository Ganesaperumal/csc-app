# CSC-APP — PROJECT MASTER PROMPT
> **AI Agent Rule**: Always read this file at the start of every new conversation. Treat it as the single source of truth. When you make changes to the project that affect architecture, routes, DB schema, or key logic, update the relevant section of this file.

---

## 1. PROJECT IDENTITY
- **Name**: `csc-app` — Internal Job Portal for a Logistics/Transport company (TI — Transport International)
- **Stack**: Next.js 16.2.9 (App Router) · React 19 · TypeScript · Supabase (Postgres + Auth) · AWS S3 · Google Gemini AI · TailwindCSS v4 · CSS Modules
- **Dev server**: `npm run dev` → `http://localhost:3000`
- **Deployed on**: Vercel
- **Key env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `GEMINI_API_KEY`

---

## 2. FILE STRUCTURE (Abridged)
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirects to /login
│   ├── globals.css             # Global styles + CSS variables (dark/light themes)
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── components/
│   │   └── AIChatbot.tsx       # Floating AI chatbot (injected in home layout)
│   ├── api/
│   │   ├── ai/route.ts         # Gemini AI chatbot + job summary endpoint
│   │   ├── admin/
│   │   │   ├── create-user/    # Admin: create new user
│   │   │   ├── delete-jobs/    # Admin: bulk delete jobs
│   │   │   ├── unlock-sync/    # Admin: unlock ERP sync
│   │   │   ├── users/          # Admin: list/update users
│   │   │   └── ai-settings/    # Admin: AI config
│   │   ├── documents/          # S3 upload/download signed URLs
│   │   ├── export-csv/         # CSV export
│   │   ├── export-sheets/      # Google Sheets export
│   │   └── ingest-erp/         # ERP data ingestion
│   └── home/                   # Protected dashboard (auth-gated)
│       ├── layout.tsx          # Sidebar nav + auth check
│       ├── page.tsx            # Home redirect
│       ├── active-jobs/        # Active jobs list
│       ├── closed-jobs/        # Closed jobs list
│       ├── all-jobs/           # All jobs (full-width, no sidebar)
│       ├── follow-ups/         # Follow-up management
│       ├── spocs/              # SPOC contact management
│       ├── reports/            # Reports & Analytics (Recharts)
│       ├── tracking/           # Jobs Tracking dashboard (SPOC view)
│       ├── unbilled/           # Unbilled jobs management (full-width)
│       ├── legacy-jobs/        # Legacy jobs list
│       ├── job/[id]/           # Job detail page (~2000 lines, single page.tsx)
│       ├── admin/              # Admin panel
│       ├── permissions/        # Role permissions editor
│       ├── users/              # User management
│       ├── activity-log/       # Activity audit log
│       └── components/
│           ├── BulkPodUploadModal.tsx
│           ├── CommandPalette.tsx    # Cmd+K global search
│           ├── CustomSelect.tsx
│           ├── GroupChat.tsx         # Real-time sidebar group chat
│           ├── JobMap.tsx
│           ├── PendingApprovalsReminder.tsx
│           ├── ProfilePopup.tsx
│           └── SyncERPButton.tsx     # Manual ERP sync trigger
├── components/
│   ├── GlobalDialogs.tsx       # Toast notifications system (showToast)
│   ├── JobSearchBar.tsx
│   └── PermissionsContext.tsx
└── lib/
    ├── supabase.ts             # Supabase client (singleton)
    └── colorUtils.ts           # getUserColor helper
```

---

## 3. DATABASE SCHEMA (Supabase / Postgres)

### Core Tables
| Table | Key Columns | Notes |
|-------|------------|-------|
| `profiles` | `id` (UUID, FK auth.users), `name`, `username`, `role`, `csc_role`, `tracking_role`, `unbilled_role`, `branches` (TEXT[]), `is_approved`, `is_reviewed`, `phone`, `photo`, `csc_coordinator` | Role-based access |
| `jobs` | `job_number`, `enquiry_number`, `branch`, `customer_name`, `company`, `goods_description`, `origin`, `destination`, `packing_date`, `delivery_date`, `goods_track_status`, `car_track_status`, `po_status`, `po_date`, `inv_request_date`, `bill_closure_date`, `sales_by`, `spoc_name`, `documents` (JSONB), `whatsapp_sent_stages` (JSONB), `insurance_required`, `quote_value` | Main job record |
| `legacy_jobs` | `job_number`, `enquiry_number`, `branch`, `customer_name`, `packing_date`, `delivery_date`, `goods_track_status`, `po_status`, `po_date`, `inv_request_date`, `bill_closure_date`, `sales_by`, `spoc_name` | Old/archived jobs |
| `job_logs` | `job_id`, `action`, `changed_by`, `changes` (JSONB), `created_at` | Audit log per job |
| `job_communications` | `job_id`, `call_type` (Customer/Internal), `regarding`, `summary`, `follow_up_required`, `follow_up_date`, `created_by`, `created_at` | Comm log per job |
| `job_documents` | `job_id`, `doc_type`, `file_name`, `s3_key`, `uploaded_by` | Document records |
| `job_pods` | `job_id`, `file_name`, `s3_key`, `uploaded_by`, `created_at` | Deprecated (migrated to `documents` JSONB) |
| `whatsapp_logs` | `job_id`, `stage`, `message`, `sent_by`, `sent_at` | WhatsApp notification log |
| `enquiry_values` | `enquiry_number`, `quote_value`, `source`, `display_id` | Quote tracking |
| `unbilled_followups` | `job_number`, `agent_name`, `followup_notes`, `next_followup_date`, `display_id` | Unbilled follow-up notes |
| `role_permissions` | `category` (CSC/Tracking/Unbilled/Admin), `role_name`, `page_name`, `access_level` (None/View/Edit) | RBAC permission matrix |
| `ai_settings` | Admin-configurable AI prompt context | AI chatbot config |

---

## 4. ROLES & ACCESS MODEL

### Role System
Users have **one primary role** + **three category roles**:
- `role`: `Admin` | (legacy field — SPOC removed)
- `csc_role`: `Admin` | `Manager` | `Executive` | `Viewer` | `None`
- `tracking_role`: `Admin` | `Manager` | `Executive` | `Viewer` | `None`
- `unbilled_role`: `Admin` | `Manager` | `Executive` | `Viewer` | `None`

### Key Access Rules
- **Executive / Manager** (csc_role or tracking_role) → Full edit access to job detail, communications, WhatsApp, docs
- **Admin** (csc_role) → Read-only on job pages (same as Viewer). Full access to Admin panel.
- **Viewer** (csc_role or tracking_role) → Read-only everywhere. Can filter/search lists. Cannot edit fields, add logs, send WhatsApp, trigger Sync ERP, or use Group Chat.
- **Tracking Executive** → Replaces old SPOC role. Has access to `/home/tracking` via `tracking_role`.
- `branches` (TEXT[]) → `['ALL']` = super admin, else branch-filtered queries
- `is_approved` must be `true` to access the dashboard
- Sidebar hidden on: `/home/job/[id]`, `/home/all-jobs`, `/home/unbilled`
- **Sync ERP Button**: Disabled (visible but greyed) for Viewers; active for Executive/Manager
- **Group Chat**: Hidden for Viewers; visible for Executive/Manager/Admin
- **SPOC role is REMOVED** — `isSPOC = false` constant in job detail, no redirect logic

---

## 5. KEY FEATURES & LOGIC

### Job Detail Page (`/home/job/[id]/page.tsx` — ~2000 lines)
- **Goods Tracking**: `GOODS_TRACK_OPTIONS` (26 stages: "01. Packing Not Scheduled" → "26. Billing Pending"), slider UI
- **Car Tracking**: `CAR_TRACK_OPTIONS` (16 stages), interactive pointer-drag visual track
- **Documents**: Upload to AWS S3 via `/api/documents`, stored as JSONB in `jobs.documents`
- **Communications Log**: Call notes (Customer/Internal), follow-ups with dates
- **WhatsApp Notifications**: Per-stage send buttons, logs in `whatsapp_logs`
- **AI Summary**: Calls `/api/ai` with job context → Gemini generates summary
- **Viewer Mode**: `isViewer` hides empty fields; `isSPOC` locks all edits
- **Real-time presence**: Multiple agents see `viewingAgents` list (Supabase realtime)
- **Job logs**: Every save records a diff in `job_logs`

### ERP Sync (`/api/ingest-erp/`)
- Syncs job data from external ERP system into `jobs` table
- Triggered via `SyncERPButton` in sidebar or scheduled scripts
- Admin can unlock stuck sync via `/api/admin/unlock-sync`

### AI Chatbot (`/api/ai/route.ts`)
- Uses `@google/genai` (Gemini)
- Context: `ai_settings` from DB + job data
- UI: `AIChatbot` component (floating, injected in home layout)

### Toast System
- Import: `import { showToast } from '@/components/GlobalDialogs'`
- Usage: `showToast('Message', 'success' | 'error' | 'info')`

### Command Palette
- Keyboard: `Cmd+K` / `Ctrl+K` → Global job search across all jobs

### Reports (`/home/reports/`)
- Built with **Recharts**
- Analytics: jobs by branch, status, monthly trends, etc.

---

## 6. IMPORTANT CONVENTIONS & GOTCHAS

1. **Next.js version**: This is Next.js **16.2.9** — breaking changes from standard. Read `node_modules/next/dist/docs/` before writing any code.
2. **`use(params)`**: In page.tsx files, params are a Promise in this version. Use `const resolved = use(params)` (React 19 `use` hook), NOT `await params`.
3. **CSS Modules**: Page-level styles use `*.module.css`. Global design tokens in `globals.css`.
4. **Supabase client**: Always import from `@/lib/supabase` — never create a new client inline.
5. **Auth guard**: Centralized in `src/app/home/layout.tsx`. Do NOT add auth checks in individual pages.
6. **Job number vs UUID**: `job_number` is the business identifier used in URLs and ERP sync. DB `id` is UUID.
7. **Document storage**: AWS S3 (`ap-south-1` region). Pre-signed URLs generated server-side in `/api/documents`.
8. **Theme**: Dark mode default. Toggle stored in `localStorage` as key `theme: 'light'`. CSS vars in `globals.css`.
9. **No direct DB writes from client pages**: All mutations use Supabase JS SDK with RLS. Admin ops (create-user, etc.) use `SUPABASE_SERVICE_ROLE_KEY` in API routes only.
10. **Branch filtering**: All non-admin queries must filter by `profile.branches`. `['ALL']` = skip filter.

---

## 7. NAVIGATION MAP
```
/ → /login
/login → /home (on auth success)
/signup → pending approval → /login
/home → /home/active-jobs (default redirect)
/home/active-jobs     → Jobs list (csc_role ≠ None)
/home/closed-jobs     → Closed jobs (csc_role ≠ None)
/home/all-jobs        → Full-width jobs table (csc_role ≠ None)
/home/follow-ups      → Follow-ups (csc_role ≠ Viewer/None)
/home/reports         → Charts & analytics (csc_role ≠ None)
/home/tracking        → Tracking dashboard (tracking_role ≠ None; replaces old SPOC view)
/home/unbilled        → Unbilled jobs (unbilled_role ≠ None)
/home/legacy-jobs     → Legacy jobs (unbilled_role ≠ None)
/home/job/[id]        → Job detail (edit or read-only based on role)
/home/admin           → Admin panel (Admin only)
/home/permissions     → Role permission matrix (Admin only)
/home/users           → User management (Admin only)
/home/activity-log    → Audit log (Admin only)
/track/[...id]        → Public tracking page (no auth required)
```

---

## 8. WHEN MAKING CHANGES — CHECKLIST
- **New page/route**: Add link in `src/app/home/layout.tsx` (`DashboardNav`) if sidebar-visible
- **New DB column**: Create migration `.sql` file in `supabase/` folder
- **New API route**: Create `src/app/api/[name]/route.ts`
- **New global component**: Add to `src/components/`
- **New home component**: Add to `src/app/home/components/`
- **Always update this file**: Reflect architecture/schema/route changes in sections above

---
*Last updated: 2026-07-26 | App: csc-app v0.1.0 | Next.js 16.2.9*
