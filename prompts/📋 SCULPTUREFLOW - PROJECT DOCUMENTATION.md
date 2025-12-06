📋 SCULPTUREFLOW - PROJECT DOCUMENTATION
PROJECT OVERVIEW
Name: SculptureFlow
Type: Production-grade Sculpture Studio Management System
Tech Stack: Next.js 14 (App Router), TypeScript, Supabase, TailwindCSS
Goal: Complete business management platform for sculpture studios

PROJECT OBJECTIVES
Build a comprehensive management system to handle:

Client relationship management

Project tracking and workflow

Task management with assignments

Time tracking (project-level and task-level)

Materials inventory

Invoicing and quotations

Photo documentation (in progress)

CURRENT TECH STACK
Frontend
Framework: Next.js 14 (App Router)

Language: TypeScript

Styling: TailwindCSS with custom design system

UI Library: Custom glassmorphic components

Icons: Lucide React

Notifications: React Hot Toast

Backend
Database: Supabase (PostgreSQL)

Storage: Supabase Storage (for photos - in development)

Authentication: Not yet implemented (using anon key currently)

API: Supabase REST API (auto-generated)

Development
Environment: Local development with Docker

Package Manager: npm

Dev Server: Next.js dev server (npm run dev)

DATABASE SCHEMA
Core Tables
1. clients

sql
- id (UUID, PK)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- notes (TEXT)
- created_at (TIMESTAMP)
2. projects

sql
- id (UUID, PK)
- name (TEXT)
- client_id (UUID, FK → clients)
- status (TEXT: 'planning', 'in_progress', 'completed', 'on_hold')
- start_date (DATE)
- end_date (DATE)
- budget (NUMERIC)
- description (TEXT)
- created_at (TIMESTAMP)
3. tasks

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- title (TEXT)
- description (TEXT)
- status (TEXT: 'todo', 'in_progress', 'completed')
- priority (TEXT: 'low', 'medium', 'high')
- due_date (DATE)
- assigned_to (TEXT)
- created_at (TIMESTAMP)
4. time_entries

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- task_id (UUID, FK → tasks, NULLABLE) ← NEW
- start_time (TIMESTAMP)
- end_time (TIMESTAMP, NULLABLE)
- hours (NUMERIC) ← NEW
- description (TEXT) ← NEW
- created_at (TIMESTAMP)
5. materials

sql
- id (UUID, PK)
- name (TEXT)
- category (TEXT)
- unit (TEXT)
- quantity (NUMERIC)
- unit_price (NUMERIC)
- supplier (TEXT)
- notes (TEXT)
- created_at (TIMESTAMP)
6. project_materials

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- material_id (UUID, FK → materials)
- quantity_used (NUMERIC)
- created_at (TIMESTAMP)
7. invoices

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- invoice_number (TEXT)
- amount (NUMERIC)
- status (TEXT: 'draft', 'sent', 'paid', 'overdue')
- due_date (DATE)
- issued_date (DATE)
- notes (TEXT)
- created_at (TIMESTAMP)
8. quotations

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- quote_number (TEXT)
- amount (NUMERIC)
- status (TEXT: 'draft', 'sent', 'accepted', 'rejected')
- valid_until (DATE)
- notes (TEXT)
- created_at (TIMESTAMP)
9. photos (Schema exists, functionality incomplete)

sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- file_path (TEXT)
- category (TEXT: 'before', 'during', 'after')
- caption (TEXT, NULLABLE)
- created_at (TIMESTAMP)
- drive_url (TEXT, NULLABLE)
- drive_file_id (TEXT, NULLABLE)
ROW LEVEL SECURITY (RLS)
Current Status: Enabled with permissive public policies

All tables have RLS enabled with policies that allow full access using the anon key:

sql
CREATE POLICY "Public access to [table]" ON [table]
FOR ALL USING (true) WITH CHECK (true);
Note: Currently suitable for single-user/development. Will need user-based policies when authentication is added.

KEY FEATURES IMPLEMENTED
✅ Client Management
Full CRUD operations

Client listing with search

Client details view

Associated projects display

✅ Project Management
Project CRUD operations

Status tracking (planning, in progress, completed, on_hold)

Budget tracking

Client association

Project timeline (start/end dates)

✅ Task Management
Task CRUD within projects

Status workflow (todo, in progress, completed)

Priority levels (low, medium, high)

Due date tracking

Task assignment field

Visual status indicators

✅ Time Tracking
Compact widget design (not center of attention)

Flexible tracking: Project-level OR task-level

Task dropdown selector (optional)

Real-time timer with start/stop

Today's hours tracking

Total hours tracking

Recent entries display with task badges

Delete functionality (hover to reveal)

Format: HH:MM:SS display

✅ Materials Inventory
Material CRUD operations

Category organization

Quantity tracking

Unit pricing

Supplier information

Project material association

✅ Invoicing
Invoice creation and management

Status tracking (draft, sent, paid, overdue)

Due date tracking

Project association

Auto-generated invoice numbers

✅ Quotations
Quote creation and management

Status tracking (draft, sent, accepted, rejected)

Validity period

Project association

Auto-generated quote numbers

✅ UI/UX Design System
Custom glassmorphic design

Dark/light mode support

Perplexity-inspired color palette

Responsive layout

Beautiful gradient accents

Smooth animations and transitions

FEATURES IN PROGRESS
🟡 Photo Management
Status: Database schema complete, component built, blocked by RLS issues

Issues:

Supabase Storage RLS configuration problems

File upload works but database insert fails

Error: "new row violates row-level security policy"

Attempted Solutions:

Multiple RLS policy configurations

Service role key integration

Schema cache refresh

Tried both Google Drive and Supabase Storage

What Works:

File sanitization (spaces removed from filenames)

PhotoUpload component UI complete

Category selection (Before/During/After)

Caption functionality

Next Steps:

Need to resolve RLS configuration

Consider alternative: disable RLS for photos table

Or implement proper authentication first

KNOWN ISSUES
Photo Upload RLS Block

Photos table has persistent RLS policy issues

File uploads to storage work, but DB inserts fail

Temporarily disabled photos feature

Missing Columns Fixed

time_entries.description - ADDED ✅

time_entries.hours - ADDED ✅

time_entries.task_id - NEEDS TO BE ADDED

Authentication

Currently using Supabase anon key (public access)

No user authentication system

Suitable for single-user but not multi-user deployment

FILE STRUCTURE
text
sculptureflow/
├── src/
│   ├── app/
│   │   ├── page.tsx (Dashboard)
│   │   ├── clients/
│   │   │   ├── page.tsx (Client list)
│   │   │   └── [id]/page.tsx (Client details)
│   │   ├── projects/
│   │   │   ├── page.tsx (Project list)
│   │   │   └── [id]/page.tsx (Project details)
│   │   ├── materials/
│   │   ├── invoices/
│   │   └── quotations/
│   ├── components/
│   │   ├── TimeTracker.tsx (Compact timer widget)
│   │   ├── PhotoUpload.tsx (Non-functional)
│   │   └── [other components]
│   ├── lib/
│   │   └── supabaseClient.ts (Supabase config)
│   └── types/
│       └── index.ts (TypeScript types)
├── .env.local
│   ├── NEXT_PUBLIC_SUPABASE_URL
│   └── NEXT_PUBLIC_SUPABASE_ANON_KEY
└── package.json
ENVIRONMENT SETUP
Required Environment Variables
bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[long-anon-key-string]
Development Commands
bash
npm run dev          # Start dev server
rm -rf .next        # Clear Next.js cache
IMMEDIATE NEXT STEPS
Priority 1: Complete Time Tracking Enhancement
Run SQL to add task_id column to time_entries

Update TimeTracker component (code provided)

Test flexible time tracking (project vs task level)

Add time display on task cards

Priority 2: Photo Management
Resolve RLS issues OR

Disable RLS for photos table temporarily OR

Implement proper authentication system

Priority 3: Additional Features
Calendar view for projects/tasks

Reporting dashboard

Export functionality (PDF invoices/quotes)

Email notifications

DESIGN PHILOSOPHY
Production-grade: Everything should be deployment-ready

Clean UI: Glassmorphic design, not cluttered

Flexible: Support multiple workflows

Intuitive: Features should be self-explanatory

Performance: Fast, responsive, smooth

CONTEXT FOR NEW SPACE
User is: Building a production-ready sculpture studio management app
Current blockers: Photo upload RLS issues (can be dealt with later)
Active work: Time tracking enhancements (flexible task-level tracking)
Skill level: Technical, expects production-grade implementations
Style: Direct, no fluff, copy-paste ready code

The user wants:

Complete implementations (no TODOs)

Production-ready patterns

Flexible features that support multiple use cases

Clean, compact UI components