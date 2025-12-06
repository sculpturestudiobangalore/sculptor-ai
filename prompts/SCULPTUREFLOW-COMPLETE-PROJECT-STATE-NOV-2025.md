# 🎨 SculptureFlow - Complete Project Documentation
**Last Updated:** November 3, 2025  
**Status:** Production-Ready (Core Features Complete)  
**Tech Stack:** Next.js 14, TypeScript, Supabase, TailwindCSS

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [Database Schema](#database-schema)
4. [Recent Major Updates](#recent-major-updates)
5. [Current State](#current-state)
6. [Pending Features](#pending-features)
7. [Known Issues & Fixes](#known-issues--fixes)
8. [File Structure](#file-structure)

---

## 🎯 Project Overview

**SculptureFlow** is a comprehensive business management application specifically designed for sculpture studios. It handles the complete business workflow from client onboarding to project completion, financial management, and materials tracking.

### Target Users
- Sculpture studios
- Artisan businesses
- Custom fabrication workshops
- Project-based creative businesses

### Key Value Propositions
1. ✅ Complete client & project lifecycle management
2. ✅ Professional invoicing & quotations with PDF generation
3. ✅ Material inventory tracking linked to projects
4. ✅ Time tracking & cost analysis
5. ✅ Financial bookkeeping (income/expense transactions)
6. 🔮 AI-powered task suggestions (coming soon)

---

## 🚀 Core Features

### 1. **Client Management**
- Full contact information (name, email, phone, WhatsApp)
- Complete address details (address_line1, address_line2, city, state, pincode)
- Tax information (GSTIN, PAN)
- Client notes and history

**Key Pages:**
- `/clients` - List all clients
- `/clients/new` - Create new client
- `/clients/[id]` - View/edit client details

---

### 2. **Project Management**
- Client linkage
- Budget tracking (quoted_amount vs actual_cost)
- Deadline management
- Status tracking (not_started, planning, in_progress, on_hold, completed, cancelled)
- Hours spent tracking
- Project description and notes

**Key Features:**
- Material usage tracking per project
- Time entry logging
- Payment milestone tracking
- Photo gallery per project
- Task management integration

**Key Pages:**
- `/projects` - List all projects
- `/projects/new` - Create new project
- `/projects/[id]` - Project details with tabs (Overview, Materials, Time Tracker, Gallery)

---

### 3. **Financial Management**

#### A. **Invoices** (Production-Ready ✅)
- Unique invoice numbering (INV-20250001 format)
- Client and project linkage
- Link to source quotation
- Item-based billing with specifications
- Automatic tax calculation (GST)
- Payment terms and notes
- Status tracking (draft, pending, sent, paid, overdue, cancelled, partial)
- **PDF Generation** with company branding

**Structure:**
- `invoices_enhanced` table (main invoice data)
- `invoice_items` table (line items)
- Linked to `clients`, `projects`, `quotations`

**Key Pages:**
- `/finances` - Unified finance view (BillBook | Invoices | Quotations tabs)
- `/invoices/new` - Create invoice
- `/invoices/[id]` - View/edit invoice with PDF download

#### B. **Quotations** (Production-Ready ✅)
- Unique quotation numbering (QUO-20250001 format)
- Client and project linkage
- Subject/title field
- Date and valid_until tracking
- Item-based quotation with specifications
- Automatic tax calculation (GST)
- Terms & conditions
- Status tracking (draft, sent, accepted, rejected, converted, expired)
- Can be converted to invoice

**Structure:**
- `quotations` table (main quotation data)
- `quotation_items` table (line items)

**Key Pages:**
- `/finances` - Quotations tab
- `/quotations/new` - Create quotation
- `/quotations/[id]` - View/edit quotation

#### C. **BillBook (Transactions)**
- Income/Expense tracking
- Client and project linkage
- Invoice and quotation references
- Payment method tracking
- Transaction numbering
- Category tracking

**Structure:**
- `transactions` table

---

### 4. **Materials Management**
- Material inventory tracking
- Purchase recording (date, quantity, cost per unit, supplier)
- Usage tracking per project
- Stock level monitoring
- Material cost allocation to projects

**Structure:**
- `materials` - Master inventory
- `material_purchases` - Purchase records
- `material_usage` - Usage per project
- `project_materials` - Linking table

**Key Pages:**
- `/materials` - Material inventory & purchase history
- `/materials/purchase` - Record new purchase
- Project detail page has Materials tab for usage tracking

---

### 5. **Time Tracking**
- Per-project time entries
- Task description and notes
- Date-based tracking
- Automatic hours calculation

**Structure:**
- `time_entries` table

**Location:**
- Integrated into `/projects/[id]` page (Time Tracker tab)

---

### 6. **Company Settings**
- Company name and contact details
- Full address for documents
- Tax information (GSTIN, PAN)
- Bank details for invoices
- Invoice/Quotation number prefixes

**Structure:**
- `company_settings` table (single-row config)

**Key Page:**
- `/settings` - Company configuration

---

## 🗄️ Database Schema

### Production Tables (20 tables)

#### Core Business Tables
| Table | Columns | Purpose |
|-------|---------|---------|
| **clients** | id, name, phone, whatsapp, email, address_line1, address_line2, city, state, pincode, gstin, pan, notes, created_at, updated_at | Client records with full address & tax info |
| **projects** | id, client_id, name, description, status, deadline, quoted_amount, actual_cost, hours_spent, budget, created_at, updated_at | Project management |
| **invoices_enhanced** | id, invoice_number, client_id, project_id, quotation_id, subject, issue_date, due_date, status, subtotal, gst_percentage, gst_amount, total_amount, paid_amount, balance_amount, payment_terms, notes, created_at, updated_at | Modern invoice system |
| **invoice_items** | id, invoice_id, item_number, description, specifications (JSONB), quantity, unit, rate, amount, created_at | Invoice line items |
| **quotations** | id, quotation_number, client_id, project_id, subject, date, valid_until, status, subtotal, gst_percentage, gst_amount, total_amount, terms_conditions, notes, created_at, updated_at | Quotation system |
| **quotation_items** | id, quotation_id, item_number, description, specifications (JSONB), quantity, unit, rate, amount, created_at | Quotation line items |
| **transactions** | id, transaction_number, transaction_date, type (income/expense), category, client_id, project_id, invoice_id, quotation_id, amount, payment_method, reference_number, description, created_by, created_at | Financial transactions |
| **company_settings** | id, company_name, address_line1, address_line2, city, state, pincode, phone, email, website, gstin, pan, bank_name, account_number, ifsc_code, account_holder_name, invoice_prefix, quotation_prefix, updated_at | Company info for documents |

#### Materials & Time Tracking
| Table | Purpose |
|-------|---------|
| **materials** | Material inventory master list |
| **material_purchases** | Purchase records |
| **material_usage** | Project material usage |
| **project_materials** | Project-material linking |
| **time_entries** | Time tracking per project |
| **tasks** | Project tasks |
| **payment_milestones** | Project payment tracking |
| **photos** | Project photo gallery |

#### AI System (Future)
| Table | Purpose |
|-------|---------|
| **ai_config** | AI model configuration |
| **ai_generation_logs** | AI task generation history |
| **ai_task_suggestions** | AI-generated task suggestions |
| **business_config** | Business questionnaire data |

---

### Database Indexes (30+ created)

**Performance optimization on:**
- All foreign keys (client_id, project_id, etc.)
- Date columns (DESC for recent-first sorting)
- Status columns (for filtering)
- Unique identifiers (invoice_number, quotation_number)
- Frequently queried fields

---

## 🔄 Recent Major Updates (Nov 2-3, 2025)

### 1. **Database Schema Fixes**
✅ **Quotations Table Upgrade**
- Added `quotation_number` (unique, auto-generated)
- Added `date` and `valid_until` fields
- Added `project_id` (FK to projects) - replaced legacy `project_name` text field
- Added modern financial fields: `subtotal`, `gst_percentage`, `gst_amount`
- Added professional fields: `subject`, `terms_conditions`, `notes`
- Legacy cost fields preserved for historical data

✅ **Clients Table Enhancement**
- Added full address structure: `address_line1`, `address_line2`, `city`, `state`, `pincode`
- Added tax fields: `gstin`, `pan`
- Added `whatsapp` field
- Migrated old single `address` field to new structure

✅ **Index Optimization**
- Created 30+ indexes on all critical columns
- Foreign key indexes for fast joins
- Date indexes for sorting
- Status indexes for filtering

✅ **Constraint Addition**
- Status field validation (quotations, invoices, projects, transactions)
- Data integrity checks
- Proper NOT NULL constraints

---

### 2. **Invoice System Overhaul**
✅ **Professional PDF Generation**
- Company details from `company_settings`
- Client address pulled from `clients` table
- Itemized billing with specifications
- Tax calculation breakdown
- Payment terms display
- Bank details for wire transfers

✅ **Invoice Creation Form**
- Client selection with address auto-population
- Project linkage (optional)
- Dynamic item addition/removal
- Real-time total calculation
- GST percentage adjustment
- Payment terms and notes

✅ **Fixed Issues:**
- Column mismatch errors (clients.address → address_line1)
- TypeScript type errors (null vs undefined)
- PDF generation "coming soon" error → Now working
- Invoice number auto-generation
- Proper status workflow

**Files Updated:**
- `src/app/invoices/[id]/page.tsx` - Invoice detail & PDF
- `src/app/invoices/new/page.tsx` - Creation form
- `src/lib/pdf-generator.ts` - PDF generation logic
- `src/components/finances/InvoicesTab.tsx` - List view

---

### 3. **Quotation System Overhaul**
✅ **New Quotation Structure**
- Auto-generated quotation numbers (QUO-20250001)
- Client and project linking
- Subject/title field
- Date and expiry (valid_until)
- Item-based quotations
- Tax calculation
- Terms & conditions

✅ **Quotation Creation Form**
- Matches invoice form structure
- Project dropdown filtered by selected client
- Dynamic item management
- Real-time calculations
- Terms and notes fields

✅ **Fixed Issues:**
- Creating stuck on loading - Fixed by updating form to match new schema
- Missing fields error - All fields now properly mapped
- Legacy field removal (labor_hours, hourly_rate, etc.)

**Files Updated:**
- `src/app/quotations/new/page.tsx` - Creation form (COMPLETE REWRITE)
- `src/components/finances/QuotationsTab.tsx` - List view
- Database schema upgraded

---

### 4. **Finance Tab Unification**
✅ **Single Finance Page**
- `/finances` now has 3 tabs: BillBook | Invoices | Quotations
- Replaced individual list pages
- Consistent UI/UX across all financial documents

**Files to Delete:**
- `src/app/billbook/page.tsx` - Replaced by BillBook tab
- `src/app/invoices/page.tsx` - Replaced by Invoices tab
- `src/app/quotations/page.tsx` - Replaced by Quotations tab

**Files to Keep:**
- `src/app/invoices/[id]/page.tsx` - Detail pages still needed
- `src/app/invoices/new/page.tsx` - Creation pages still needed
- Same for quotations

---

### 5. **Company Settings Page**
✅ **Complete Configuration**
- Company details (name, address, contact)
- Tax information (GSTIN, PAN)
- Bank details (for invoices)
- Document prefixes (invoice/quotation numbering)

**File:**
- `src/app/settings/page.tsx`

---

## ✅ Current State

### What's Working (Production-Ready)
- ✅ Client management (CRUD + address & tax info)
- ✅ Project management (with materials & time tracking)
- ✅ Invoice creation, viewing, and PDF generation
- ✅ Quotation creation and viewing
- ✅ BillBook transaction tracking
- ✅ Material inventory & purchase tracking
- ✅ Material usage on projects
- ✅ Time entry tracking
- ✅ Company settings configuration
- ✅ Database fully optimized (indexes, constraints)
- ✅ Navigation & routing
- ✅ Mobile-responsive design

### What's Pending
- ⏳ Quotation PDF generation (similar to invoices)
- ⏳ Quotation → Invoice conversion flow
- ⏳ Quotation detail page (`/quotations/[id]`)
- ⏳ Client detail/edit page
- ⏳ Dashboard daily tasks card (AI integration)
- ⏳ AI task suggestion system
- ⏳ Business questionnaire for AI setup
- ⏳ Payment milestone tracking UI
- ⏳ Photo gallery UI improvements
- ⏳ Advanced reporting & analytics

---

## 🐛 Known Issues & Fixes Applied

### Issue 1: Invoice Creation Stuck
**Problem:** Form submitted but stayed on "Creating..." forever  
**Root Cause:** Form data didn't match database schema (wrong column names)  
**Fix:** Updated form to use correct schema (`address_line1` instead of `address`, proper foreign keys)  
**Status:** ✅ Fixed

---

### Issue 2: Quotation Creation Stuck
**Problem:** Same as invoices - form stuck on loading  
**Root Cause:** Legacy quotation structure with old fields (labor_hours, project_name text)  
**Fix:** Complete rewrite of quotation creation form matching new schema  
**Status:** ✅ Fixed

---

### Issue 3: PDF Generation Error
**Problem:** "PDF download coming soon!" error when clicking download  
**Root Cause:** Missing company settings, client address column mismatch  
**Fix:** Fixed company_settings query, updated client address field references  
**Status:** ✅ Fixed

---

### Issue 4: TypeScript Type Errors
**Problem:** `null` vs `undefined` type conflicts in PDF generation  
**Root Cause:** Supabase returns `null`, TypeScript expected `undefined`  
**Fix:** Updated interfaces to accept `| null`  
**Status:** ✅ Fixed

---

### Issue 5: Database Column Mismatch
**Problem:** "column clients_1.address does not exist"  
**Root Cause:** Migration from single `address` to `address_line1`/`address_line2`  
**Fix:** Updated all queries to use new address fields  
**Status:** ✅ Fixed

---

### Issue 6: Missing Database Indexes
**Problem:** Query performance issues as data grows  
**Root Cause:** No indexes on foreign keys and frequently queried columns  
**Fix:** Created 30+ production indexes  
**Status:** ✅ Fixed

---

### Issue 7: Quotations Missing Critical Fields
**Problem:** Quotation table had old structure (labor_hours-based)  
**Root Cause:** Initial schema was simplified calculator-style  
**Fix:** Upgraded to full professional quotation structure with items table  
**Status:** ✅ Fixed

---

## 📁 File Structure

### Key Directories

```
src/
├── app/
│   ├── page.tsx                          # Dashboard/Home
│   ├── clients/
│   │   ├── page.tsx                      # Client list
│   │   ├── new/page.tsx                  # Create client
│   │   └── [id]/page.tsx                 # Client detail (TODO)
│   ├── projects/
│   │   ├── page.tsx                      # Project list
│   │   ├── new/page.tsx                  # Create project
│   │   └── [id]/
│   │       ├── page.tsx                  # Project detail (wrapper)
│   │       ├── ProjectDetailsClient.tsx  # Main project UI
│   │       └── MaterialsSection.tsx      # Material usage tracking
│   ├── finances/
│   │   └── page.tsx                      # Finance tabs (BillBook/Invoices/Quotations)
│   ├── invoices/
│   │   ├── [id]/page.tsx                 # Invoice detail + PDF
│   │   └── new/page.tsx                  # Create invoice
│   ├── quotations/
│   │   ├── [id]/page.tsx                 # Quotation detail (TODO)
│   │   └── new/page.tsx                  # Create quotation ✅
│   ├── materials/
│   │   ├── page.tsx                      # Material inventory
│   │   └── purchase/page.tsx             # Record purchase
│   └── settings/
│       └── page.tsx                      # Company settings
├── components/
│   ├── finances/
│   │   ├── BillBookTab.tsx               # Transaction list
│   │   ├── InvoicesTab.tsx               # Invoice list
│   │   └── QuotationsTab.tsx             # Quotation list ✅
│   ├── Navigation.tsx                    # Main nav bar
│   ├── FAB.tsx                           # Floating action button
│   └── StatsCard.tsx                     # Dashboard widgets
└── lib/
    ├── supabaseClient.ts                 # Supabase connection
    ├── pdf-generator.ts                  # Invoice PDF generation
    └── utils.ts                          # Utility functions
```

---

## 🔐 Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🚀 Next Steps (Priority Order)

### High Priority
1. **Quotation Detail Page** - `/quotations/[id]`
   - View/edit quotation
   - Status management
   - Convert to invoice button
   - PDF generation

2. **Quotation PDF Generation**
   - Use same structure as invoice PDF
   - Include terms & conditions
   - Valid until date
   - Professional formatting

3. **Client Detail Page** - `/clients/[id]`
   - View client info
   - List all client projects
   - List all client invoices/quotations
   - Edit client details

### Medium Priority
4. **Dashboard Improvements**
   - Daily tasks card (AI)
   - Quick stats widgets
   - Recent activity feed

5. **AI Integration Setup**
   - Business questionnaire page
   - AI config interface
   - Task suggestion algorithm
   - Daily task generation

6. **Performance Optimization**
   - Query optimization
   - Component lazy loading
   - Image optimization
   - Bundle size reduction

### Low Priority
7. **Reporting & Analytics**
   - Revenue charts
   - Project profitability analysis
   - Material cost reports
   - Time tracking summaries

8. **Advanced Features**
   - Email notifications
   - Payment tracking
   - Project templates
   - Bulk operations

---

## 📝 Notes for Development Continuity

### When Starting Fresh
1. Load this document to understand current state
2. Check Supabase database structure (20 tables, 30+ indexes)
3. Test key flows: Create client → Create project → Create quotation → Create invoice
4. Verify PDF generation works
5. Check all forms match database schema

### Key Files to Reference
- Database structure: See "Database Schema" section above
- Invoice implementation: `src/app/invoices/[id]/page.tsx` (working example)
- Quotation implementation: `src/app/quotations/new/page.tsx` (just fixed)
- PDF generation: `src/lib/pdf-generator.ts`

### Common Pitfalls
- ❌ Don't use old `billbook`, `invoices`, or `quotations` list pages (replaced by `/finances`)
- ❌ Don't use `clients.address` - use `address_line1`/`address_line2`
- ❌ Don't use legacy quotation fields (labor_hours, project_name text)
- ❌ Don't forget to wrap null/undefined in TypeScript interfaces
- ✅ Always check Supabase column names before writing queries
- ✅ Use design system CSS variables from global.css
- ✅ Test on mobile (responsive design)

---

## 🎨 Design System

**Color Palette:**
- Primary: Teal (`--color-primary`)
- Background: Cream/Charcoal (light/dark mode)
- Text: Slate
- Success: Teal
- Error: Red
- Warning: Orange

**Components:**
- `.btn` - Button styles (primary, secondary, outline)
- `.card` - Card container
- `.form-control` - Input/select/textarea
- `.form-label` - Form labels
- `.status` - Status badges

**Spacing:**
- Design system uses CSS variables (`--space-4`, `--space-8`, etc.)
- Consistent padding/margins throughout

---

## 📞 Support & Maintenance

### For Future Developers
- This app uses **Next.js 14** with App Router
- **Supabase** for backend (PostgreSQL database)
- **TypeScript** throughout (strict mode)
- **TailwindCSS** for styling + custom design system

### Testing Checklist
- [ ] Create client with full address
- [ ] Create project linked to client
- [ ] Add material usage to project
- [ ] Create quotation for client
- [ ] Create invoice from quotation
- [ ] Download invoice PDF
- [ ] Verify PDF has correct company & client info
- [ ] Add transaction (income/expense)
- [ ] Test on mobile device

---

## 📊 Project Stats

- **Total Tables:** 20
- **Total Indexes:** 30+
- **Core Features:** 7 major modules
- **Pages:** 15+ routes
- **Components:** 20+ reusable components
- **Status:** Production-ready for core workflows
- **Next Major Feature:** AI Task Suggestions

---

**End of Documentation**  
*This document should be updated as new features are added or significant changes are made.*
