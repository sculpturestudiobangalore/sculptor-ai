# SCULPTUREFLOW - PROJECT EXECUTION FILE
## Complete Step-by-Step Build Instructions for Google AI Studio

---

## 🎯 PROJECT OVERVIEW

**App Name:** SculptureFlow  
**Purpose:** Business management system for sculpture studio  
**AI Tool:** Google AI Studio Build Mode (Gemini 2.0 Flash)  
**Deployment:** Vercel (connected to Supabase via marketplace)  
**Timeline:** 5-7 focused build sessions  

---

## 📦 PHASE 0: SETUP & INITIALIZATION

### Step 0.1: Supabase Database Setup

**You mentioned you already connected Vercel to Supabase - perfect!**

Now, set up the database schema:

1. **Open Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project** (the one connected to Vercel)
3. **Go to SQL Editor** (left sidebar)
4. **Create a new query** and paste this complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- TABLES
-- ====================================

-- Clients Table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_client', 'completed')),
  deadline DATE,
  quoted_amount DECIMAL(10,2),
  actual_cost DECIMAL(10,2) DEFAULT 0,
  hours_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rescheduled')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials Table
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  cost_per_unit DECIMAL(10,2),
  supplier TEXT,
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Materials (Junction Table)
CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10,2),
  cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries Table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos Table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  category TEXT CHECK (category IN ('before', 'during', 'after')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid')),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations Table
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  description TEXT,
  labor_hours DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  margin_percentage DECIMAL(5,2),
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- INDEXES (for performance)
-- ====================================

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deadline ON projects(deadline);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_project_materials_project_id ON project_materials(project_id);
CREATE INDEX idx_project_materials_material_id ON project_materials(material_id);

-- ====================================
-- TRIGGERS (auto-update timestamps)
-- ====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- ROW LEVEL SECURITY (Enable RLS)
-- ====================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (since we're not using auth yet)
-- You can restrict these policies later

CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on materials" ON materials FOR ALL USING (true);
CREATE POLICY "Allow all operations on project_materials" ON project_materials FOR ALL USING (true);
CREATE POLICY "Allow all operations on time_entries" ON time_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on photos" ON photos FOR ALL USING (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations on quotations" ON quotations FOR ALL USING (true);

-- ====================================
-- SAMPLE DATA (for testing)
-- ====================================

-- Insert sample client
INSERT INTO clients (name, phone, whatsapp, email, notes) VALUES
  ('Rajesh Kumar', '+919876543210', '+919876543210', 'rajesh@example.com', 'Regular client, prefers bronze sculptures'),
  ('Priya Sharma', '+919876543211', '+919876543211', 'priya@example.com', 'Corporate client for office installations');

-- Insert sample materials
INSERT INTO materials (name, unit, quantity, cost_per_unit, supplier, low_stock_threshold) VALUES
  ('Bronze', 'kg', 50, 450, 'Metal Suppliers Ltd', 10),
  ('Clay', 'kg', 100, 25, 'Art Materials Inc', 20),
  ('Stone (Granite)', 'kg', 200, 150, 'Stone Depot', 30),
  ('Wood (Teak)', 'cubic ft', 15, 800, 'Timber Traders', 5),
  ('Resin', 'liter', 25, 300, 'Polymer Supply Co', 5);

-- Insert sample project (using the first client's ID)
INSERT INTO projects (client_id, name, description, status, deadline, quoted_amount) 
SELECT 
  id, 
  'Temple Lion Sculpture', 
  'Life-size bronze lion for temple entrance', 
  'in_progress', 
  CURRENT_DATE + INTERVAL '30 days',
  150000
FROM clients 
WHERE name = 'Rajesh Kumar' 
LIMIT 1;

-- ====================================
-- STORAGE BUCKET
-- ====================================

-- Note: This needs to be created in Supabase Storage UI
-- 1. Go to Storage in left sidebar
-- 2. Click "Create bucket"
-- 3. Name: "project-photos"
-- 4. Make it PUBLIC
-- 5. No RLS policies needed for now
```

5. **Click "Run"** to execute the schema
6. **Verify tables created:** Go to Table Editor (left sidebar) - you should see all 9 tables

### Step 0.2: Create Storage Bucket

1. **Go to Storage** in Supabase sidebar
2. **Click "New bucket"**
3. **Name:** `project-photos`
4. **Public bucket:** ✅ Yes (check the box)
5. **Click "Create bucket"**
6. **Verify:** You should see the bucket listed

### Step 0.3: Get Supabase Credentials

1. **Go to Project Settings** > **API**
2. **Copy these values** (you'll need them):
   - **Project URL:** (looks like `https://xxxxx.supabase.co`)
   - **anon public key:** (long string starting with `eyJ...`)

**Save these somewhere safe!** You'll paste them into Google AI Studio.

---

## 🚀 PHASE 1: GOOGLE AI STUDIO SETUP

### Step 1.1: Access Google AI Studio

1. **Go to:** https://aistudio.google.com
2. **Sign in** with your Google account
3. **Click "Build"** in the left sidebar (new vibe coding interface)

### Step 1.2: Start New App Project

1. **Click "New"** button
2. **In the prompt box, paste this EXACT prompt:**

```
I need to build a complete full-stack business management web application called SculptureFlow for a sculpture studio business.

IMPORTANT SETUP INSTRUCTIONS:
1. Create a Next.js 14 app with App Router and TypeScript
2. Use Tailwind CSS for styling
3. Connect to Supabase for backend (PostgreSQL database + file storage)
4. The database schema is ALREADY CREATED in Supabase with these tables:
   - clients, projects, tasks, materials, project_materials, time_entries, photos, invoices, quotations

ENVIRONMENT VARIABLES NEEDED:
Create a .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=[paste your URL here]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[paste your anon key here]

REQUIRED DEPENDENCIES:
Install these packages:
- @supabase/supabase-js
- @supabase/auth-helpers-nextjs
- lucide-react (for icons)
- jspdf (for PDF generation)
- react-hot-toast (for notifications)
- date-fns (for date formatting)

PROJECT STRUCTURE:
Create this exact file structure:
- src/app/ (Next.js pages using App Router)
- src/components/ (React components)
- src/lib/ (utility functions, Supabase client)
- src/types/ (TypeScript types)

First, generate the complete project setup with:
1. package.json with all dependencies
2. tsconfig.json
3. next.config.js
4. tailwind.config.ts
5. .env.local template
6. src/app/globals.css with the COMPLETE design system (I'll provide this)
7. src/lib/supabase.ts (Supabase client initialization)
8. src/types/index.ts (TypeScript interfaces for all database tables)

Wait for my confirmation before proceeding to generate pages and components.

Are you ready to start? Confirm you understand the setup requirements.
```

3. **Click "Generate"** (or press Enter)

**Wait for Gemini to respond and generate the initial setup files.**

### Step 1.3: Provide System Instructions

After Gemini generates the initial setup, you need to add the system instructions:

1. **Click the "⚙️ Settings" icon** in Google AI Studio (top right)
2. **Look for "System Instructions" field**
3. **Paste the ENTIRE contents** of the `google-ai-system-instructions.md` file I created earlier
4. **Click "Save"**

**Now Gemini will remember all your project requirements for every subsequent request!**

---

## 📝 PHASE 2: DESIGN SYSTEM SETUP

### Step 2.1: Create Global CSS with Design System

**Prompt for Google AI Studio:**

```
Now create the src/app/globals.css file with the COMPLETE Perplexity design system.

This file must include:
1. @tailwind directives
2. Complete CSS custom properties (CSS variables) for:
   - Colors (light and dark mode)
   - Typography
   - Spacing
   - Border radius
   - Shadows
   - Animations
3. Base HTML styles
4. Pre-built component classes:
   - .btn (with variants: btn--primary, btn--secondary, btn--outline, btn--sm, btn--lg)
   - .form-control (input, select, textarea styles)
   - .form-label
   - .form-group
   - .card (with card__header, card__body, card__footer)
   - .status (with variants: status--success, status--error, status--warning, status--info)
   - .container (responsive container)
   - Utility classes (flex, gap, spacing utilities)

The design system MUST support:
- Automatic dark mode using @media (prefers-color-scheme: dark)
- Manual theme switching with [data-color-scheme="dark"] and [data-color-scheme="light"]
- Mobile-first responsive design
- Accessibility features

Use these exact color values for light mode:
- Background: cream-50 (#FCFCF9)
- Surface: cream-100 (#FFFFFD)
- Primary: teal-500 (#21808D)
- Text: slate-900 (#13343B)

And for dark mode:
- Background: charcoal-700 (#1F2121)
- Surface: charcoal-800 (#262828)
- Primary: teal-300 (#32B8C6)
- Text: gray-200 (#F5F5F5)

Generate the COMPLETE globals.css file now. Do not use placeholders.
```

**Wait for the complete CSS file to be generated.**

---

## 🏗️ PHASE 3: CORE INFRASTRUCTURE

### Step 3.1: Generate Type Definitions

**Prompt:**

```
Generate the complete src/types/index.ts file with TypeScript interfaces for all database tables.

Create interfaces for:
1. Client (from clients table)
2. Project (from projects table, with client relation)
3. Task (from tasks table)
4. Material (from materials table)
5. ProjectMaterial (from project_materials table)
6. TimeEntry (from time_entries table)
7. Photo (from photos table)
8. Invoice (from invoices table)
9. Quotation (from quotations table)

Also include:
- Enum types for status fields (ProjectStatus, TaskStatus, InvoiceStatus, QuotationStatus)
- Helper types for form data
- Types for project with joined relations (ProjectWithClient, ProjectWithDetails, etc.)

Use exact field names from the Supabase schema I provided earlier.
```

### Step 3.2: Generate Utility Functions

**Prompt:**

```
Generate three utility files:

1. src/lib/utils.ts with helper functions:
   - formatCurrency(amount: number): string - Format numbers as ₹X,XXX
   - formatDate(date: Date | string): string - Format as "DD MMM YYYY"
   - formatRelativeDate(date: Date | string): string - "3 days ago", "in 5 days"
   - calculateDaysUntil(date: Date | string): number - Days until a date
   - getStatusColor(status: string): string - Return color class for status
   - getStatusBadgeClass(status: string): string - Return badge CSS class
   - truncateText(text: string, length: number): string
   - generateInvoiceNumber(): string - Generate INV-YYYYMMDD-XXX format
   - generateQuotationNumber(): string - Generate QUO-YYYYMMDD-XXX format

2. src/lib/whatsapp.ts with:
   - formatPhoneNumber(phone: string): string - Format for WhatsApp
   - sendWhatsApp(phone: string, message: string): void - Open WhatsApp
   - Message template functions for: project updates, invoice reminders, quotation sent

3. src/lib/constants.ts with:
   - Default hourly rate
   - Material units array
   - Project status options
   - Invoice status options
   - Payment terms template
   - T&C template

Generate all three files with COMPLETE implementations.
```

### Step 3.3: Generate PDF Generator

**Prompt:**

```
Generate src/lib/pdf-generator.ts with functions to generate PDFs using jsPDF library.

Create these functions:

1. generateQuotationPDF(quotation: Quotation, client: Client): Promise<Blob>
   - Professional template with header
   - Quote number and date
   - Client details section
   - Itemized breakdown table (labor + materials)
   - Subtotal, margin, and total
   - Terms & conditions
   - Footer with business contact info
   
2. generateInvoicePDF(invoice: Invoice, project: Project, client: Client): Promise<Blob>
   - Invoice header with number and dates
   - Bill to section with client details
   - Itemized table with project details
   - Payment status and amounts
   - Due date prominently displayed
   - Payment instructions
   
Both functions should:
- Use professional fonts and layout
- Include table borders and proper spacing
- Bold important numbers (totals)
- Return Blob for download or sharing

Generate complete implementation with no placeholders.
```

---

## 🎨 PHASE 4: UI COMPONENTS

### Step 4.1: Generate Base UI Components

**Prompt:**

```
Generate these reusable UI components in src/components/ui/:

1. Button.tsx - Polymorphic button component
   - Variants: primary, secondary, outline, ghost
   - Sizes: sm, md, lg
   - Loading state with spinner
   - Disabled state
   - Icon support
   
2. Card.tsx - Flexible card component
   - Optional header, body, footer sections
   - Hover effect option
   - Border variants
   
3. Input.tsx - Form input wrapper
   - Label integration
   - Error message display
   - Helper text support
   - Icons (prefix/suffix)
   
4. Select.tsx - Styled select dropdown
   - Searchable option
   - Multiple select support
   - Custom option rendering
   
5. Modal.tsx - Dialog/modal component
   - Backdrop with click-outside to close
   - Title and description
   - Footer actions
   - Sizes: sm, md, lg, full
   - Accessible (focus trap, ESC to close)
   
6. Toast.tsx - Notification component (wrapper for react-hot-toast)
   - Success, error, warning, info variants
   - Auto-dismiss option
   - Action button support
   
7. Loading.tsx - Loading states
   - Spinner component
   - Skeleton loaders (card, list, text)
   - Full-page loading overlay

Generate all 7 components with complete implementations, TypeScript types, and accessibility features.
```

### Step 4.2: Generate Feature Components

**Prompt:**

```
Generate these feature-specific components:

1. src/components/Navigation.tsx
   - Bottom navigation bar (mobile-first)
   - 5 nav items: Dashboard, Projects, Clients, Money, Materials
   - Icons from lucide-react
   - Active state highlighting
   - Fixed position at bottom
   - Hide on scroll down, show on scroll up (optional enhancement)
   
2. src/components/Header.tsx
   - Top header with app name
   - Optional back button
   - Action buttons (context-dependent)
   - Mobile-responsive
   
3. src/components/TimeTracker.tsx
   - Current timer display (if running)
   - START button (large, green) when stopped
   - STOP button (large, red) when running
   - Total hours display for project
   - Recent entries list (last 5)
   - Edit/delete entry actions
   - Uses localStorage to persist timer state
   - Formats time as HH:MM:SS
   
4. src/components/WorkPlanner.tsx
   - "Today's Focus" heading
   - Top 3-5 priority tasks
   - Priority calculation algorithm (based on deadline + project value)
   - Task cards with project name, deadline, start button
   - "Move to tomorrow" action
   - Completed tasks section (collapsible)
   
5. src/components/PhotoUpload.tsx
   - Drag & drop zone
   - File picker button
   - Multiple file support
   - Image preview grid
   - Category selector (before/during/after)
   - Caption input per photo
   - Upload progress indicator
   - Upload to Supabase Storage
   - Error handling for file size/type
   
6. src/components/ProjectCard.tsx
   - Reusable project card
   - Shows: name, client, status, deadline, progress
   - Click to navigate to details
   - Overflow menu with actions
   
7. src/components/ClientCard.tsx
   - Client info card
   - Quick action buttons (call, WhatsApp, email)
   - Project count display
   
8. src/components/StatusBadge.tsx
   - Dynamic status indicator
   - Color-coded based on status
   - Size variants
   
9. src/components/ConfirmDialog.tsx
   - Confirmation modal for destructive actions
   - Custom title, message, action labels
   - Danger variant for deletes
   - Accessible

Generate all 9 components with complete implementations.
```

---

## 📄 PHASE 5: PAGES - PART 1 (Dashboard & Projects)

### Step 5.1: Root Layout

**Prompt:**

```
Generate src/app/layout.tsx - the root layout for the entire app.

Requirements:
- Import globals.css
- Import fonts (Inter from next/font/google)
- Set HTML lang="en"
- Include metadata (title, description)
- Wrap children with Toaster provider (react-hot-toast)
- Include Navigation component at bottom
- Mobile viewport meta tag
- Dark mode support via CSS media query

Generate complete implementation.
```

### Step 5.2: Dashboard Page

**Prompt:**

```
Generate src/app/page.tsx - the main dashboard/landing page.

This is the most important page. Requirements:

1. Header with "SculptureFlow" title and date

2. "Today's Priority" Card (prominent at top):
   - Fetch project with nearest deadline where status != 'completed'
   - Display project name, client name, deadline
   - Calculate and show days remaining
   - Color code: red if overdue, yellow if < 3 days, green otherwise
   - Large "START WORK" button that starts time tracker
   - If no active projects: empty state

3. Quick Stats Row (3 cards in grid):
   - Card 1: Projects in progress (count + icon)
   - Card 2: Overdue projects (count + red badge if > 0)
   - Card 3: Active hours this month (sum of time_entries)

4. "Active Projects" Section:
   - Heading with count
   - Grid of ProjectCard components (all projects where status != 'completed')
   - Sort by: deadline (ascending)
   - Show max 6, "View All" link to /projects if more
   - Empty state if no projects

5. "Today's Focus" Section:
   - Use WorkPlanner component
   - Shows top 3-5 priority tasks

6. Floating Action Button (bottom right, above navigation):
   - Opens menu with: New Project, New Client, New Quote
   - Animated on click

Data Fetching:
- Fetch projects with client joins
- Fetch time entries for current month
- Fetch tasks with project joins for work planner
- Use Supabase client from lib/supabase
- Handle loading states (skeleton)
- Handle errors (toast notification)

Generate complete implementation with TypeScript, proper error handling, and all features working.
```

### Step 5.3: Projects List Page

**Prompt:**

```
Generate src/app/projects/page.tsx - projects list view.

Requirements:

1. Header with "Projects" title and "+" button (create new)

2. Tab Filters:
   - All, In Progress, Pending Client, Completed
   - Active tab highlighted
   - Filter projects on click

3. Search Bar:
   - Debounced search (300ms)
   - Filter by project name or client name
   - Clear button when text entered

4. Projects Grid:
   - Responsive: 1 col mobile, 2 col tablet, 3 col desktop
   - Use ProjectCard component for each project
   - Each card shows:
     * Project name
     * Client name (clickable link)
     * Status badge
     * Deadline with countdown
     * Progress bar (tasks completed / total tasks)
     * Actions: View, Edit, Delete
   - Click card → navigate to /projects/[id]

5. Empty States:
   - Different message for each filter tab
   - "Create Project" CTA button
   - Illustration or icon

6. Loading State:
   - Skeleton cards while fetching

7. Delete Confirmation:
   - Use ConfirmDialog component
   - "Are you sure? This will delete all tasks, time entries, and photos."

Data Fetching:
- Fetch projects with client join
- Include tasks count for progress calculation
- Filter based on active tab and search query
- Sort by deadline (ascending for active, descending for completed)

Generate complete implementation with all features.
```

### Step 5.4: Create Project Page

**Prompt:**

```
Generate src/app/projects/new/page.tsx - create new project form.

Requirements:

1. Header with "New Project" title and cancel button

2. Form Fields:
   - Select Client (dropdown, searchable)
     * Shows client name and phone
     * "Create New Client" option at bottom
   - Project Name (text input, required)
   - Description (textarea, auto-resize)
   - Deadline (date picker, must be future date)
   - Quoted Amount (number input, ₹ prefix)
   - Status (dropdown: Not Started, In Progress, Pending Client)

3. Initial Tasks (optional):
   - "Add Task" button
   - Task input fields (description, due date)
   - Can add multiple tasks before creating project

4. Form Actions:
   - Save as Draft (status = not_started)
   - Create Project (validate all required fields)
   - Cancel (navigate back with confirmation if form dirty)

5. Validation:
   - Client must be selected
   - Project name required (min 3 chars)
   - Deadline must be future date
   - Quoted amount must be > 0
   - Show error messages under fields

6. On Success:
   - Create project in database
   - Create tasks if any added
   - Show success toast
   - Navigate to project details page

Generate complete implementation with full validation and error handling.
```

### Step 5.5: Project Details Page

**Prompt:**

```
Generate src/app/projects/[id]/page.tsx - comprehensive project management page.

This is the MOST COMPLEX page. Requirements:

1. Header Section:
   - Back button
   - Project name (editable inline - click to edit, auto-save on blur)
   - Client name (link to /clients/[id])
   - Status dropdown (updates DB immediately on change)
   - Deadline date picker (updates DB on change)
   - Actions menu (⋮): Edit, Duplicate, Delete

2. Time Tracker Card (sticky at top on mobile):
   - Use TimeTracker component
   - Pass project ID
   - Show current timer if running
   - START/STOP buttons
   - Total hours for this project
   - Recent time entries list

3. Project Overview Card:
   - Progress circle: tasks completed / total tasks
   - Stats row:
     * Total hours
     * Materials cost
     * Actual cost vs quoted amount
   - Budget indicator: green if under budget, red if over

4. Tasks Section:
   - Add task input (inline, quick add)
   - Tasks list:
     * Checkbox to mark complete
     * Task description (editable)
     * Due date badge
     * Notes (expandable)
     * Delete button
   - Filter toggle: Show/hide completed
   - Sort options: Due date, Created date

5. Materials Used Section:
   - "Add Material" button → opens modal
   - Modal form:
     * Select material (dropdown from materials table)
     * Quantity used (number input)
     * Cost (auto-calculated from material.cost_per_unit × quantity)
     * Notes (optional)
   - Materials list table:
     * Material name, quantity, unit, cost
     * Delete action
   - Running total: "Total Material Cost: ₹X,XXX"

6. Photos Gallery Section:
   - Category tabs: All, Before, During, After
   - Photo grid (3 cols mobile, 4+ cols desktop)
   - Upload button → PhotoUpload component
   - Click photo → lightbox view with:
     * Full-size image
     * Caption
     * Category
     * Date uploaded
     * Delete button
     * Next/Previous navigation

7. Project Notes Card:
   - Rich textarea (description field)
   - Auto-save on blur
   - Last updated timestamp

8. Client Communication Card:
   - "Send WhatsApp Update" button:
     * Opens modal with editable message template
     * Pre-filled with project progress
     * Opens WhatsApp on send
   - "Call Client" button (tel: link)
   - "Email Client" button (mailto: link)

9. Actions Footer (sticky at bottom):
   - "Mark as Completed" button (primary)
   - "Generate Invoice" button (secondary)
   - Only show if project not already completed

Data Fetching:
- Fetch project with all relations:
  * Client
  * Tasks
  * Materials (via project_materials join)
  * Time entries
  * Photos
- Use Supabase realtime subscriptions for live updates (optional enhancement)
- Handle loading states for each section
- Handle errors gracefully

Interactions:
- Optimistic UI updates for task completion
- Auto-save project name/description changes (debounced 500ms)
- Confirmation dialog for destructive actions
- Toast notifications for all actions
- Navigate to invoice page with project pre-filled

Generate the COMPLETE implementation. This is a critical page.
```

---

## 📄 PHASE 6: PAGES - PART 2 (Clients & Money)

### Step 6.1: Clients List Page

**Prompt:**

```
Generate src/app/clients/page.tsx - clients list view.

Requirements:
1. Header with "Clients" title and "+" button
2. Search bar (filter by name, phone, email)
3. Client cards grid:
   - Name, phone, email
   - Project count badge
   - Last project date
   - Quick actions: View, Call, WhatsApp, Edit, Delete
4. Sort dropdown: Name (A-Z), Recent, Most Projects
5. Empty state with "Add First Client" CTA
6. Loading skeleton

Generate complete implementation.
```

### Step 6.2: Client Details Page

**Prompt:**

```
Generate src/app/clients/[id]/page.tsx - client profile page.

Requirements:
1. Header with client name (editable) and back button
2. Contact Info Card:
   - Phone, WhatsApp, Email (all editable)
   - Quick action buttons: Call, WhatsApp, Email
3. Notes Section (textarea, auto-save)
4. Projects Section:
   - All projects for this client
   - Grouped by status (tabs or sections)
   - Project cards (clickable)
   - Stats: Total projects, Total value, Average project value
5. Quick Actions:
   - Create Quotation (for this client)
   - Create Project (for this client)
6. Delete Client Button:
   - Confirmation dialog
   - Warning: "This will delete all associated projects"
   - Only allow if no active projects

Generate complete implementation.
```

### Step 6.3: Quotation Generator

**Prompt:**

```
Generate src/app/quotations/new/page.tsx - create quotation page.

Requirements:

1. Header: "New Quotation" + Cancel button

2. Form Sections:

   A. Client Selection:
      - Searchable dropdown
      - Shows name + phone
      - "Create New Client" quick action

   B. Project Details:
      - Project name (required)
      - Description (rich textarea)

   C. Labor Section:
      - Hours (number input)
      - Hourly Rate (number, default ₹500)
      - Labor Subtotal (auto-calculated, read-only, bold)

   D. Materials Section:
      - "Add Material" button
      - Dynamic list of material lines:
        * Select material (dropdown)
        * Quantity (number)
        * Cost per unit (pre-filled from materials table)
        * Line total (calculated)
        * Remove button
      - Materials Subtotal (calculated)

   E. Pricing:
      - Subtotal (Labor + Materials, calculated)
      - Margin slider (0-50%, default 20%)
      - Margin Amount (calculated)
      - TOTAL (large, bold, highlighted)

   F. Terms & Conditions:
      - Textarea with default template
      - Editable

3. Actions:
   - Save as Draft (saves to quotations table, status=draft)
   - Generate PDF:
     * Use generateQuotationPDF from lib
     * Download PDF
     * Update status to 'sent'
   - Send via WhatsApp:
     * Generate PDF first
     * Open WhatsApp with message + link
   - Convert to Project:
     * Create project with quote details
     * Link quotation.id to project
     * Navigate to project page

4. Real-time Calculations:
   - All amounts update as user types
   - Show calculations clearly
   - Currency formatting (₹X,XXX.XX)

5. Validation:
   - Client required
   - Project name required
   - Either labor OR materials must be added
   - Amounts must be positive

Generate complete implementation with PDF generation working.
```

### Step 6.4: Invoice Generator

**Prompt:**

```
Generate src/app/invoices/new/page.tsx - create invoice page.

Requirements:

1. Check if coming from project (URL param or state):
   - If yes: Pre-fill all fields from project
   - Client info, project name, materials, hours, quoted amount

2. Form Sections:

   A. Invoice Details:
      - Invoice Number (auto-generated, display only)
      - Invoice Date (default today, date picker)
      - Due Date (default +30 days, date picker)

   B. Bill To (Client):
      - Select client dropdown
      - Display: Name, Address (if have), Phone, Email

   C. Line Items:
      - Description, Quantity, Rate, Amount columns
      - Pre-filled from project if coming from project:
        * Labor: "X hours of work" + hourly rate
        * Each material as separate line
      - "Add Line Item" button
      - Remove line button
      - Editable fields

   D. Totals:
      - Subtotal (sum of line items)
      - Tax % (optional, default 0)
      - Tax Amount (calculated)
      - Total (bold, large)

   E. Payment Details:
      - Payment Status (dropdown: Pending, Partially Paid, Paid)
      - Amount Paid (number, default 0)
      - Balance Due (calculated, highlighted if > 0)
      - Payment Terms (textarea)
      - Notes (textarea)

3. Actions:
   - Save Invoice (to database)
   - Generate PDF (use generateInvoicePDF)
   - Mark as Paid (status=paid, paid_amount=total)
   - Send via WhatsApp (PDF + message)
   - Print (browser print dialog)

4. Validations:
   - Client required
   - Invoice date required
   - Due date must be >= invoice date
   - At least one line item
   - Paid amount <= total amount

5. Payment Tracking:
   - If partially paid: show payment history (future enhancement)
   - Due date warning if overdue

Generate complete implementation with PDF generation.
```

### Step 6.5: Invoices List Page

**Prompt:**

```
Generate src/app/invoices/page.tsx - invoices list view.

Requirements:
1. Tab filters: All, Pending, Partially Paid, Paid, Overdue
2. Invoice cards showing:
   - Invoice number, client name, project name
   - Amount, paid amount, balance
   - Due date (red if overdue)
   - Status badge
   - Actions: View, Download PDF, Send Reminder, Mark as Paid, Delete
3. Stats cards:
   - Total invoiced
   - Total received
   - Outstanding amount
4. Search and date range filter
5. Sort options: Date, Amount, Client

Generate complete implementation.
```

---

## 📄 PHASE 7: PAGES - PART 3 (Materials)

### Step 7.1: Materials Inventory Page

**Prompt:**

```
Generate src/app/materials/page.tsx - materials inventory management.

Requirements:

1. Header: "Materials Inventory" + "Add Material" button

2. Low Stock Alert Section (if any):
   - Banner at top
   - Lists materials where quantity < low_stock_threshold
   - Red highlight
   - "Restock" quick action button

3. Summary Cards:
   - Total materials count
   - Total inventory value (sum of quantity × cost_per_unit)
   - Low stock items count (red badge if > 0)

4. Materials Table:
   - Columns:
     * Name
     * Quantity (editable inline)
     * Unit
     * Cost per Unit (editable inline)
     * Total Value (calculated)
     * Supplier
     * Actions
   - Sortable columns (click header to sort)
   - Search bar (filter by name, supplier)

5. Quick Quantity Adjust:
   - Click quantity → show +/- buttons and input field
   - Quick increment buttons: +1, +5, +10, -1, -5, -10
   - Manual input field
   - Updates DB on blur or Enter key
   - Show loading indicator during update

6. Actions Menu per Row:
   - Edit (opens modal with all fields)
   - Delete (confirmation dialog)
   - View Usage (shows projects where material used)
   - Add to Project (quick add to active project)

7. Add Material Modal:
   - Name (text, required)
   - Unit (dropdown: kg, gram, meter, cm, piece, liter, etc.)
   - Quantity (number)
   - Cost per Unit (number, ₹)
   - Supplier (text)
   - Low Stock Threshold (number, default 10)
   - Notes (textarea)
   - Save button

8. Bulk Actions:
   - Checkbox selection
   - Bulk delete (with confirmation)
   - Export to CSV (optional enhancement)

9. Filters:
   - Supplier filter (dropdown of unique suppliers)
   - Stock level filter: All, Low Stock, In Stock, Out of Stock
   - Sort: Name, Quantity, Value

Generate complete implementation with inline editing working.
```

---

## 🔧 PHASE 8: FINAL TOUCHES

### Step 8.1: Edit Pages

**Prompt:**

```
Generate edit pages for:

1. src/app/projects/[id]/edit/page.tsx
   - Same form as create, but pre-filled with project data
   - Update instead of create
   
2. src/app/clients/[id]/edit/page.tsx
   - Same form as create, but pre-filled with client data
   - Update instead of create

Generate both with complete implementations.
```

### Step 8.2: Error Handling & 404 Pages

**Prompt:**

```
Generate error handling pages:

1. src/app/not-found.tsx - 404 page
   - Friendly message
   - "Go to Dashboard" button
   - Illustration

2. src/app/error.tsx - Error boundary
   - Error message display
   - "Try again" button
   - "Go to Dashboard" button

Generate both pages.
```

### Step 8.3: README & Documentation

**Prompt:**

```
Generate a comprehensive README.md file with:

1. Project overview and features
2. Tech stack used
3. Prerequisites (Node.js version, etc.)
4. Installation steps:
   - Clone repo
   - Install dependencies
   - Set up environment variables
   - Run Supabase schema
   - Start dev server
5. Environment variables explanation
6. Deployment to Vercel instructions
7. Database schema overview
8. Folder structure explanation
9. Available scripts
10. Troubleshooting section
11. Future enhancements
12. License

Generate complete README.md file.
```

---

## 🚀 PHASE 9: BUILD & DEPLOY

### Step 9.1: Export Project from Google AI Studio

1. **In Google AI Studio**, after all code is generated:
2. **Click "Export" button** (or "Download" icon)
3. **Select "Download as ZIP"**
4. **Extract the ZIP file** to your desired location

### Step 9.2: Initialize Git Repository

Open terminal in project folder:

```bash
# Initialize git
git init

# Create .gitignore if not already created
echo "node_modules
.next
.env.local
.DS_Store" > .gitignore

# Add all files
git add .

# Initial commit
git commit -m "Initial commit - SculptureFlow app"
```

### Step 9.3: Create GitHub Repository

1. **Go to GitHub:** https://github.com/new
2. **Repository name:** `sculpture-flow`
3. **Description:** "Business management app for sculpture studio"
4. **Visibility:** Private (or Public, your choice)
5. **Do NOT initialize** with README (already have one)
6. **Click "Create repository"**

### Step 9.4: Push to GitHub

Copy the commands from GitHub's "…or push an existing repository" section:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sculpture-flow.git
git branch -M main
git push -u origin main
```

### Step 9.5: Deploy to Vercel

1. **Go to Vercel:** https://vercel.com/dashboard
2. **Click "Add New..." → "Project"**
3. **Import from GitHub:**
   - Select `sculpture-flow` repository
   - Click "Import"
4. **Configure Project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: `next build` (default)
   - Output Directory: .next (default)
5. **Environment Variables:**
   - Click "Add" for each variable:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [your Supabase URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your Supabase anon key]
   ```
6. **Click "Deploy"**

**Wait 2-3 minutes** for deployment to complete.

### Step 9.6: Configure Supabase Redirect URLs

After deployment, Vercel gives you a URL (e.g., `sculpture-flow.vercel.app`).

1. **Go to Supabase Dashboard** → Your Project
2. **Authentication** → **URL Configuration**
3. **Site URL:** `https://sculpture-flow.vercel.app` (your Vercel URL)
4. **Redirect URLs:** Add:
   ```
   https://sculpture-flow.vercel.app/**
   http://localhost:3000/**
   ```
5. **Click "Save"**

---

## ✅ TESTING CHECKLIST

### After Deployment, Test These Features:

#### Dashboard
- [ ] Page loads without errors
- [ ] Shows "Today's Priority" if projects exist
- [ ] Shows empty state if no projects
- [ ] Quick stats cards display correct counts
- [ ] Active projects grid displays
- [ ] Work planner shows priority tasks
- [ ] FAB menu opens (New Project/Client/Quote)

#### Projects
- [ ] Can create new project
- [ ] Projects list displays with correct data
- [ ] Tab filters work (All, In Progress, etc.)
- [ ] Search filters projects
- [ ] Can click project to view details
- [ ] Project details page loads all sections
- [ ] Time tracker START/STOP works
- [ ] Can add/complete tasks
- [ ] Can add materials to project
- [ ] Can upload photos
- [ ] Can edit project name inline
- [ ] Status dropdown updates DB
- [ ] WhatsApp update button opens WhatsApp
- [ ] Can mark project as completed

#### Clients
- [ ] Can create new client
- [ ] Clients list displays
- [ ] Search works
- [ ] Can view client details
- [ ] Can edit client info
- [ ] Quick actions work (call, WhatsApp, email)
- [ ] Shows all projects for client

#### Quotations
- [ ] Can create new quotation
- [ ] Client dropdown works
- [ ] Can add multiple materials
- [ ] Calculations update in real-time
- [ ] Margin slider works
- [ ] Can generate PDF (downloads correctly)
- [ ] WhatsApp send button opens WhatsApp
- [ ] Can convert quote to project

#### Invoices
- [ ] Can create new invoice
- [ ] Pre-fills from project if linked
- [ ] Can add/remove line items
- [ ] Calculations work correctly
- [ ] Can generate PDF (downloads correctly)
- [ ] Can mark as paid
- [ ] Send reminder opens WhatsApp
- [ ] Invoices list shows correct statuses

#### Materials
- [ ] Can add new material
- [ ] Materials table displays
- [ ] Low stock alerts show correctly
- [ ] Inline quantity editing works
- [ ] Quick +/- buttons work
- [ ] Can edit material details
- [ ] Can delete material (with confirmation)
- [ ] Total inventory value calculates correctly

#### General
- [ ] Bottom navigation works on all pages
- [ ] Dark mode switches (if system preference)
- [ ] Mobile responsive (test on phone)
- [ ] Loading states display
- [ ] Error messages show when actions fail
- [ ] Toast notifications work
- [ ] Forms validate correctly
- [ ] Can't submit invalid data

---

## 🐛 TROUBLESHOOTING

### Common Issues & Solutions:

#### 1. "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. Supabase connection error
- Check environment variables in Vercel dashboard
- Verify Supabase URL and key are correct
- Check if Supabase project is running
- Verify RLS policies allow operations

#### 3. Images not uploading
- Check if 'project-photos' bucket exists in Supabase Storage
- Verify bucket is set to PUBLIC
- Check file size limits (default 50MB)

#### 4. PDF generation fails
- Verify jspdf is installed: `npm list jspdf`
- Check browser console for errors
- Test with simpler data first

#### 5. WhatsApp links not working
- Verify phone number format (+91XXXXXXXXXX)
- Check if WhatsApp is installed (on mobile)
- Test with web.whatsapp.com (on desktop)

#### 6. Build fails on Vercel
- Check build logs for specific error
- Verify all environment variables are set
- Check TypeScript errors: `npm run build` locally
- Verify all dependencies are in package.json

#### 7. Dark mode not working
- Check if CSS variables are defined for both modes
- Verify @media queries are correct
- Check if [data-color-scheme] attributes work

---

## 🎨 CUSTOMIZATION GUIDE

### How to Customize for Your Friend's Branding:

1. **Logo:**
   - Add logo image to `/public/logo.png`
   - Update Header component to use logo
   - Update PDF generator to include logo

2. **Colors:**
   - Edit `src/app/globals.css`
   - Change primary color (search for --color-primary)
   - Update both light and dark mode values

3. **Business Details:**
   - Edit `src/lib/constants.ts`
   - Update business name, address, phone, email
   - These appear in PDFs and footers

4. **Default Values:**
   - Hourly rate: Edit `src/lib/constants.ts`
   - Terms & Conditions: Edit template in constants
   - Payment terms: Edit template in constants

5. **Language:**
   - All text is in English currently
   - Can translate by finding all UI strings
   - Consider using i18n library for multi-language

---

## 📈 NEXT STEPS (Future Enhancements)

### Phase 2 Features (After MVP):

1. **Authentication:**
   - Add Supabase Auth
   - Login page
   - User roles (Admin, Worker)
   - Row Level Security based on user

2. **Advanced Features:**
   - Email notifications (using Supabase Edge Functions)
   - SMS reminders for deadlines
   - Calendar integration
   - Project templates
   - Recurring invoices
   - Payment gateway integration (Razorpay)

3. **Analytics:**
   - Revenue dashboard
   - Project profitability analysis
   - Time tracking reports
   - Material usage analytics

4. **Mobile App:**
   - React Native app using same Supabase backend
   - Offline support
   - Push notifications

5. **Collaboration:**
   - Multi-user support
   - Comments on projects
   - File attachments
   - Activity log

6. **AI Features:**
   - Smart task suggestions
   - Deadline predictions
   - Material usage forecasting
   - Automated quotation generation

---

## 🎓 GOOGLE AI STUDIO TIPS

### How to Get Best Results:

1. **Be Specific:**
   - Don't say "create a form"
   - Say "create a form with these exact fields: [list fields]"

2. **Reference System Instructions:**
   - "Following the system instructions, generate..."
   - "Using the design system defined in system instructions..."

3. **Request Complete Code:**
   - Always say "Generate COMPLETE implementation"
   - Add "No placeholders or TODOs"
   - Specify "Production-ready code"

4. **Break Complex Pages:**
   - If a page is too complex, generate in parts
   - "First generate the data fetching logic"
   - "Now generate the UI components"
   - "Finally, wire them together"

5. **Iterate:**
   - After generation, test it
   - Go back and say "The X feature isn't working, fix it by..."
   - Provide specific error messages

6. **Use Examples:**
   - Show example data structures
   - Show example output format
   - Reference existing components

7. **Save Progress:**
   - Download code after each major section
   - Commit to git frequently
   - Don't lose your work!

---

## 💡 EFFICIENCY HACKS

### Speed Up Development:

1. **Generate Multiple Files at Once:**
   ```
   Generate these 3 files in one response:
   1. src/components/Button.tsx
   2. src/components/Card.tsx
   3. src/components/Input.tsx
   ```

2. **Clone & Modify:**
   - Generate one complete CRUD page
   - Then say "Create a similar page for [entity] but with these differences: [list]"

3. **Template Pattern:**
   - Create one perfect form page
   - Reuse structure for all other forms

4. **Component Library First:**
   - Generate all UI components before pages
   - Pages become faster to generate

5. **Database First:**
   - Schema already done ✅
   - Types generated from schema
   - Forms follow database structure

---

## ✨ FINAL NOTES

### Remember:

- **Google AI Studio is FREE** (as of now) - no API costs!
- **Gemini 2.0 Flash** is the fastest and most capable model
- **Build Mode** handles all the wiring automatically
- **System Instructions** make the AI remember your requirements
- **Iterate quickly** - generate, test, refine
- **Deploy often** - Vercel auto-deploys on git push

### Success Metrics:

After completing all phases, you should have:
- ✅ 20+ pages/routes fully functional
- ✅ 15+ reusable components
- ✅ Complete CRUD for all entities
- ✅ PDF generation working
- ✅ WhatsApp integration working
- ✅ Time tracking functional
- ✅ Mobile responsive
- ✅ Dark mode support
- ✅ Production-ready code
- ✅ Deployed on Vercel

**Estimated total build time: 8-12 hours** (with Google AI Studio doing the heavy lifting!)

---

## 🆘 NEED HELP?

If you run into issues:

1. **Check the error message carefully**
2. **Search the error on Google**
3. **Check Supabase docs:** https://supabase.com/docs
4. **Check Next.js docs:** https://nextjs.org/docs
5. **Ask Google AI Studio:** "I'm getting this error: [paste error]. How do I fix it?"
6. **Check this project execution file** for troubleshooting section

---

## 🎉 YOU'RE READY!

You now have:
1. ✅ Complete system instructions for Google AI Studio
2. ✅ Database schema created in Supabase
3. ✅ Step-by-step prompts for every component and page
4. ✅ Deployment guide
5. ✅ Testing checklist
6. ✅ Troubleshooting guide

**Time to start building! Go to Google AI Studio and paste the first prompt from Phase 1.**

Good luck! 🚀
