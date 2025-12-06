# COMPLETE PROJECT PROMPT FOR GOOGLE AI (GEMINI)

Paste this entire prompt into Google AI Studio or Gemini to generate the full SculptureFlow application.

---

## THE PROMPT (COPY EVERYTHING BELOW THIS LINE)

---

I need you to generate a COMPLETE, production-ready Next.js 14 web application called **SculptureFlow** - a comprehensive business management system for a sculpture studio.

# CRITICAL REQUIREMENTS

**TECH STACK (MANDATORY - DO NOT DEVIATE):**
- Next.js 14 with App Router (NOT Vite, NOT Create React App, NOT Pages Router)
- TypeScript (strict mode)
- Tailwind CSS
- Supabase (PostgreSQL database + Storage)
- React Hot Toast (notifications)
- Lucide React (icons)
- jsPDF (PDF generation)
- date-fns (date formatting)

**INITIALIZE WITH:**
```bash
npx create-next-app@latest sculpture-flow --typescript --tailwind --app
```

**ENVIRONMENT VARIABLES:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**CODE STANDARDS:**
- ✅ PRODUCTION-READY code ONLY - NO placeholders, NO TODOs, NO "implement later"
- ✅ Complete error handling (try-catch for all async operations)
- ✅ Loading states for ALL data fetching
- ✅ Form validation with clear error messages
- ✅ TypeScript types for EVERYTHING
- ✅ Mobile-first responsive design
- ✅ Accessibility features (ARIA labels, keyboard navigation)
- ✅ All imports included
- ✅ Every feature fully functional

---

# DATABASE SCHEMA (ALREADY IN SUPABASE)

The Supabase database is already set up with these tables:

**clients:**
- id (UUID, primary key)
- name (TEXT, required)
- phone (TEXT)
- whatsapp (TEXT)
- email (TEXT)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)

**projects:**
- id (UUID, primary key)
- client_id (UUID, foreign key → clients)
- name (TEXT, required)
- description (TEXT)
- status (TEXT: 'not_started' | 'in_progress' | 'pending_client' | 'completed')
- deadline (DATE)
- quoted_amount (DECIMAL)
- actual_cost (DECIMAL)
- hours_spent (DECIMAL)
- created_at, updated_at (TIMESTAMP)

**tasks:**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- description (TEXT, required)
- status (TEXT: 'pending' | 'completed' | 'rescheduled')
- due_date (DATE)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)

**materials:**
- id (UUID, primary key)
- name (TEXT, required)
- unit (TEXT, required) - e.g., 'kg', 'meter', 'piece'
- quantity (DECIMAL)
- cost_per_unit (DECIMAL)
- supplier (TEXT)
- low_stock_threshold (DECIMAL)
- created_at, updated_at (TIMESTAMP)

**project_materials:** (junction table)
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- material_id (UUID, foreign key → materials)
- quantity_used (DECIMAL)
- cost (DECIMAL)
- created_at (TIMESTAMP)

**time_entries:**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- start_time (TIMESTAMP)
- end_time (TIMESTAMP)
- duration_minutes (INTEGER)
- notes (TEXT)
- created_at (TIMESTAMP)

**photos:**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- file_path (TEXT, required) - Supabase Storage path
- category (TEXT: 'before' | 'during' | 'after')
- caption (TEXT)
- created_at (TIMESTAMP)

**invoices:**
- id (UUID, primary key)
- project_id (UUID, foreign key → projects)
- invoice_number (TEXT, unique)
- amount (DECIMAL, required)
- status (TEXT: 'pending' | 'partially_paid' | 'paid')
- paid_amount (DECIMAL)
- due_date (DATE)
- created_at, updated_at (TIMESTAMP)

**quotations:**
- id (UUID, primary key)
- client_id (UUID, foreign key → clients)
- project_name (TEXT, required)
- description (TEXT)
- labor_hours (DECIMAL)
- hourly_rate (DECIMAL)
- material_cost (DECIMAL)
- margin_percentage (DECIMAL)
- total_amount (DECIMAL)
- status (TEXT: 'draft' | 'sent' | 'approved' | 'rejected')
- created_at, updated_at (TIMESTAMP)

**Storage Bucket:** `project-photos` (public bucket in Supabase Storage)

---

# FILE STRUCTURE TO GENERATE

```
sculpture-flow/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.local (template)
├── .gitignore
├── README.md
├── src/
│   ├── app/
│   │   ├── layout.tsx (root layout)
│   │   ├── page.tsx (dashboard)
│   │   ├── globals.css (design system)
│   │   ├── projects/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/page.tsx (create)
│   │   │   └── [id]/
│   │   │       ├── page.tsx (details)
│   │   │       └── edit/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/page.tsx (create)
│   │   │   └── [id]/
│   │   │       ├── page.tsx (details)
│   │   │       └── edit/page.tsx
│   │   ├── quotations/
│   │   │   ├── page.tsx (list)
│   │   │   └── new/page.tsx (generator)
│   │   ├── invoices/
│   │   │   ├── page.tsx (list)
│   │   │   └── new/page.tsx (generator)
│   │   ├── materials/
│   │   │   └── page.tsx (inventory)
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── Navigation.tsx
│   │   ├── Header.tsx
│   │   ├── TimeTracker.tsx
│   │   ├── WorkPlanner.tsx
│   │   ├── PhotoUpload.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ClientCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── Loading.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── utils.ts
│   │   ├── whatsapp.ts
│   │   ├── pdf-generator.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
```

---

# DESIGN SYSTEM (FOR globals.css)

Use **Perplexity design system** with these exact colors:

**Light Mode:**
- Background: `#FCFCF9` (cream-50)
- Surface: `#FFFFFD` (cream-100)
- Primary: `#21808D` (teal-500)
- Text: `#13343B` (slate-900)
- Text Secondary: `#62686C` (slate-500)

**Dark Mode:**
- Background: `#1F2121` (charcoal-700)
- Surface: `#262828` (charcoal-800)
- Primary: `#32B8C6` (teal-300)
- Text: `#F5F5F5` (gray-200)
- Text Secondary: `rgba(167, 169, 169, 0.7)` (gray-300)

**CSS Variables to define:**
- `--color-background`, `--color-surface`, `--color-text`, `--color-text-secondary`
- `--color-primary`, `--color-primary-hover`, `--color-primary-active`
- `--color-secondary`, `--color-border`, `--color-error`, `--color-success`, `--color-warning`, `--color-info`
- Typography: `--font-family-base`, `--font-size-*`, `--font-weight-*`
- Spacing: `--space-4`, `--space-8`, `--space-12`, `--space-16`, `--space-20`, `--space-24`, `--space-32`
- Border radius: `--radius-sm`, `--radius-base`, `--radius-md`, `--radius-lg`, `--radius-full`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

**Pre-built component classes:**
- `.btn` (with variants: `.btn--primary`, `.btn--secondary`, `.btn--outline`, `.btn--sm`, `.btn--lg`)
- `.form-control` (for inputs, selects, textareas)
- `.form-label`, `.form-group`
- `.card` (with `.card__header`, `.card__body`, `.card__footer`)
- `.status` (with variants: `.status--success`, `.status--error`, `.status--warning`, `.status--info`)
- `.container` (responsive max-width container)
- Utility classes: `.flex`, `.items-center`, `.justify-between`, `.gap-*`, spacing utilities

Support both automatic dark mode (`@media (prefers-color-scheme: dark)`) and manual theme switching (`[data-color-scheme="dark"]`).

---

# FEATURES TO IMPLEMENT

## 1. DASHBOARD (/)

**Layout:**
- Top header with app name "SculptureFlow" and current date
- Bottom navigation bar (fixed) with 5 items: Dashboard, Projects, Clients, Money, Materials

**Components:**

**A. "Today's Priority" Card (prominent at top):**
- Fetch project with nearest deadline where status != 'completed'
- Display: project name, client name, deadline
- Calculate days remaining
- Color code: red if overdue, yellow if < 3 days, green otherwise
- Large "START WORK" button that starts time tracker for that project
- Empty state if no active projects

**B. Quick Stats Row (3 cards):**
- Projects in progress (count)
- Overdue projects (count with red badge if > 0)
- Active hours this month (sum of time_entries for current month)

**C. Active Projects Section:**
- Grid of project cards (all projects where status != 'completed')
- Each card: project name, client name, status badge, deadline, progress bar (tasks completed/total)
- Click card → navigate to project details
- Show max 6 projects, "View All" link if more
- Empty state with "Create First Project" CTA

**D. Work Planner Section:**
- "Today's Focus" heading
- Top 3-5 priority tasks sorted by algorithm:
  - Overdue projects first (score = -999)
  - Due today (score = -100)
  - Due this week (score = -(7 - days_until_deadline))
  - Others (score = project_value / 10000)
- Each task card: project name, task description, deadline badge, "Start" button
- "Move to Tomorrow" action
- Completed tasks section (collapsible)

**E. Floating Action Button (bottom right, above nav):**
- Opens menu with: New Project, New Client, New Quote
- Animated appearance

**Data Fetching:**
```typescript
- Fetch projects with client join: .from('projects').select('*, client:clients(*)').neq('status', 'completed')
- Fetch time entries for stats: .from('time_entries').select('duration_minutes').gte('created_at', startOfMonth)
- Fetch tasks with project join: .from('tasks').select('*, project:projects(*)').eq('status', 'pending')
```

---

## 2. PROJECTS

### A. Projects List (/projects)

**Features:**
- Tab filters: All | In Progress | Pending Client | Completed
- Search bar (debounced 300ms) filters by project name or client name
- Projects grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each project card shows:
  - Project name, client name (clickable)
  - Status badge (colored)
  - Deadline with countdown ("3 days left", "2 days overdue")
  - Progress bar (X/Y tasks completed)
  - Actions menu: View, Edit, Delete
- Sort by deadline (ascending for active, descending for completed)
- Empty state per filter tab
- Loading skeletons
- Delete confirmation dialog

### B. Create Project (/projects/new)

**Form fields:**
- Select Client (searchable dropdown with "Create New Client" option)
- Project Name (required, min 3 chars)
- Description (textarea with auto-resize)
- Deadline (date picker, must be future date)
- Quoted Amount (number input with ₹ prefix)
- Status (dropdown: Not Started, In Progress, Pending Client)

**Optional Initial Tasks:**
- "Add Task" button to add tasks before creating project
- Task fields: description, due date

**Actions:**
- Save as Draft (status = not_started)
- Create Project (validates, creates in DB, navigates to details)
- Cancel (with confirmation if form dirty)

**Validation:**
- Client required
- Project name required (min 3 chars)
- Deadline must be future date
- Quoted amount must be > 0
- Show inline error messages

### C. Project Details (/projects/[id])

**This is the MOST COMPLEX page. Include all sections:**

**Header:**
- Back button
- Project name (editable inline - click to edit, auto-save on blur with debounce 500ms)
- Client name (clickable link to client)
- Status dropdown (updates DB immediately on change)
- Deadline date picker (updates DB on change)
- Actions menu (⋮): Edit, Duplicate, Delete

**Time Tracker Card (sticky on mobile):**
- If timer running: Show HH:MM:SS with pulsing red dot, STOP button (large, red)
- If timer stopped: Show "Total: XX hours", START button (large, green)
- Timer state stored in localStorage (key: `timeTracker_${projectId}`)
- On STOP: Calculate duration, save to time_entries table, update project.hours_spent
- Recent entries list (last 5): date, duration, notes, edit/delete icons
- Edit entry: modal with start_time, end_time, notes fields
- Total hours for project: sum of all time_entries durations

**Project Overview Card:**
- Circular progress indicator: tasks completed / total tasks
- Stats row:
  - Total hours worked
  - Materials cost (sum from project_materials)
  - Actual cost vs quoted amount
- Budget indicator: green if actual_cost <= quoted_amount, red if over

**Tasks Section:**
- Quick add input at top (description field + "Add" button)
- Tasks list:
  - Checkbox to mark complete (optimistic UI update)
  - Task description (click to edit inline)
  - Due date badge (colored: red if overdue, yellow if today, gray if future)
  - Notes field (expandable)
  - Delete button (confirmation)
- Filter toggle: Show/Hide completed tasks
- Sort dropdown: Due date, Created date
- Progress text: "X of Y completed"

**Materials Used Section:**
- "Add Material" button opens modal with:
  - Select material (dropdown from materials table with search)
  - Quantity used (number input)
  - Cost (auto-calculated: material.cost_per_unit × quantity, read-only)
  - Notes (optional)
- Materials table: Name, Quantity, Unit, Cost, Delete button
- Running total at bottom: "Total Material Cost: ₹X,XXX"
- On add: Insert into project_materials, update project.actual_cost

**Photos Gallery:**
- Category tabs: All | Before | During | After
- Photo grid (3 cols mobile, 4+ cols desktop)
- Upload area: drag-drop zone + "Upload Photos" button
- Upload component:
  - Multiple file selection
  - Image preview before upload
  - Category selector per photo
  - Caption input (optional)
  - Upload to Supabase Storage bucket 'project-photos'
  - Save record to photos table with file_path
- Click photo opens lightbox:
  - Full-size image
  - Caption (editable)
  - Category tag
  - Date uploaded
  - Delete button (removes from storage + DB)
  - Next/Previous navigation arrows

**Project Notes Card:**
- Textarea for project.description field
- Auto-save on blur (debounced 500ms)
- "Last updated: X minutes ago" timestamp

**Client Communication Card:**
- "Send WhatsApp Update" button:
  - Opens modal with editable message
  - Pre-filled template: "Hi [client_name], update on [project_name]: [status]. [progress]% complete. Expected completion: [deadline]."
  - "Send" button opens WhatsApp: `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
- "Call Client" button: `tel:${client.phone}` link
- "Email Client" button: `mailto:${client.email}` link

**Actions Footer (sticky at bottom, only if not completed):**
- "Mark as Completed" button (primary, updates status)
- "Generate Invoice" button (secondary, navigates to /invoices/new with projectId param)

**Data Fetching:**
```typescript
const { data: project } = await supabase
  .from('projects')
  .select(`
    *,
    client:clients(*),
    tasks(*),
    project_materials(*, material:materials(*)),
    time_entries(*),
    photos(*)
  `)
  .eq('id', id)
  .single();
```

---

## 3. CLIENTS

### A. Clients List (/clients)

**Features:**
- Search bar (filters by name, phone, email)
- Client cards grid
- Each card shows:
  - Name, phone, email
  - Project count badge
  - Last project date ("Last project: 2 months ago")
  - Quick actions: View, Call, WhatsApp, Edit, Delete
- Sort dropdown: Name (A-Z), Recent activity, Most projects
- Empty state with "Add First Client" CTA
- Loading skeletons

### B. Create Client (/clients/new)

**Form fields:**
- Name (required, min 2 chars)
- Phone (format validation: +91XXXXXXXXXX or 10 digits)
- WhatsApp (defaults to phone if left empty)
- Email (email format validation)
- Notes (textarea)

**Actions:**
- Save Client
- Cancel

### C. Client Details (/clients/[id])

**Header:**
- Client name (editable inline)
- Back button

**Contact Info Card:**
- Phone, WhatsApp, Email (all editable inline with validation)
- Quick action buttons:
  - Call (`tel:` link)
  - WhatsApp (`wa.me` link with blank message)
  - Email (`mailto:` link)

**Notes Section:**
- Textarea (client.notes field)
- Auto-save on blur

**Projects Section:**
- Tabs: All | Active | Completed
- Project cards (same as projects list)
- Stats:
  - Total projects count
  - Total value (sum of all project.quoted_amount)
  - Average project value
- Click project → navigate to project details

**Quick Actions:**
- "Create Quotation" button (navigates to /quotations/new with clientId pre-filled)
- "Create Project" button (navigates to /projects/new with clientId pre-filled)

**Delete Client Button:**
- Confirmation dialog: "This will delete all associated projects, tasks, and data. Are you sure?"
- Only allow if no active projects (status != 'completed')
- Shows warning if active projects exist

---

## 4. QUOTATIONS

### A. Quotation Generator (/quotations/new)

**Form layout (single page, scrollable):**

**Section 1: Client Selection**
- Searchable dropdown (shows name + phone)
- "Create New Client" quick link at bottom

**Section 2: Project Details**
- Project Name (required)
- Description (rich textarea with auto-resize)

**Section 3: Labor**
- Hours (number input, step: 0.5)
- Hourly Rate (number input, default: ₹500 from constants)
- Labor Subtotal (calculated, read-only, bold): hours × rate

**Section 4: Materials**
- "Add Material" button
- Dynamic list of material rows:
  - Select Material (dropdown from materials table)
  - Quantity (number input)
  - Cost per Unit (pre-filled from selected material, read-only)
  - Line Total (calculated: quantity × cost_per_unit)
  - Remove row button (red X icon)
- Materials Subtotal (calculated): sum of all line totals

**Section 5: Pricing Calculation**
- Subtotal (calculated): labor_subtotal + materials_subtotal
- Margin slider (0-50%, default 20%):
  - Shows percentage value as you drag
  - Updates margin amount in real-time
- Margin Amount (calculated): subtotal × (margin_percentage / 100)
- **TOTAL** (calculated, large, bold, highlighted): subtotal + margin_amount

**Section 6: Terms & Conditions**
- Textarea with default template from constants
- Editable

**Actions (bottom of form):**
- "Save as Draft" (saves to quotations table, status=draft, shows toast)
- "Generate PDF" (calls generateQuotationPDF, downloads, updates status to 'sent')
- "Send via WhatsApp" (generates PDF first, then opens WhatsApp with message + link)
- "Convert to Project" (creates project from quotation, links quotation.id, navigates to project)

**Real-time Calculations:**
- All amounts update as user types
- Use useEffect hooks to watch dependencies
- Format all currency as ₹X,XXX.XX

**Validation:**
- Client must be selected
- Project name required
- Either labor hours OR at least one material must be added
- All amounts must be positive numbers

**PDF Generation (using jsPDF):**
```
- Header: "QUOTATION" title, logo placeholder
- Quote number: QUO-YYYYMMDD-001 (auto-generated)
- Date: current date
- Client section: name, address (if have), phone, email
- Itemized table:
  | Description | Quantity | Rate | Amount |
  | Labor | X hours | ₹Y | ₹Z |
  | Material A | X kg | ₹Y | ₹Z |
  | ... |
- Subtotal
- Margin (X%): ₹Y
- TOTAL: ₹Z (bold, large)
- Terms & Conditions section
- Footer: business details from constants
```

### B. Quotations List (/quotations)

**Features:**
- Tab filters: All | Draft | Sent | Approved | Rejected
- Quotation cards showing:
  - Quote number, client name, project name
  - Total amount
  - Status badge
  - Date created
  - Actions: View, Download PDF, Edit, Delete, Convert to Project
- Search by client name or project name
- Sort: Date, Amount, Client

---

## 5. INVOICES

### A. Invoice Generator (/invoices/new)

**Check for projectId in URL params or state:**
- If present: Pre-fill form from project data
- Client info, project name, materials from project_materials, hours from time_entries

**Form layout:**

**Section 1: Invoice Details**
- Invoice Number (auto-generated: INV-YYYYMMDD-001, display only)
- Invoice Date (date picker, default: today)
- Due Date (date picker, default: today + 30 days)

**Section 2: Bill To**
- Select Client (dropdown if not pre-filled)
- Display: Name, Address (if available), Phone, Email

**Section 3: Line Items**
- Table with columns: Description | Quantity | Rate | Amount
- Pre-filled rows if from project:
  - Labor: "X hours of work @ ₹Y/hour"
  - Each material as separate line
- "Add Line Item" button adds new editable row
- Each row has "Remove" button
- All fields editable

**Section 4: Calculations**
- Subtotal (sum of line item amounts)
- Tax % (optional, number input 0-100, default 0)
- Tax Amount (calculated: subtotal × tax_percentage / 100)
- **TOTAL** (bold, large): subtotal + tax_amount

**Section 5: Payment Details**
- Payment Status (dropdown: Pending, Partially Paid, Paid)
- Amount Paid (number input, default 0, max: total)
- Balance Due (calculated, highlighted if > 0): total - paid_amount
- Payment Terms (textarea, default template from constants)
- Notes (textarea)

**Actions:**
- "Save Invoice" (saves to invoices table)
- "Generate PDF" (downloads PDF using generateInvoicePDF)
- "Mark as Paid" (sets status=paid, paid_amount=total)
- "Send via WhatsApp" (generates PDF, opens WhatsApp with message + link)
- "Print" (opens browser print dialog)

**Validation:**
- Client required
- Invoice date required
- Due date must be >= invoice date
- At least one line item required
- Paid amount must be <= total

**PDF Generation (using jsPDF):**
```
- Header: "INVOICE" title, logo placeholder
- Invoice details: number, date, due date
- Bill To section: client details
- Itemized table: Description | Qty | Rate | Amount
- Subtotal, Tax, TOTAL (bold)
- Payment status section
- Amount paid, balance due (if any)
- Payment terms
- Footer: business details, payment instructions
```

### B. Invoices List (/invoices)

**Features:**
- Tab filters: All | Pending | Partially Paid | Paid | Overdue
- Invoice cards showing:
  - Invoice number, client name, project name
  - Amount, paid amount, balance due
  - Due date (red text if overdue)
  - Status badge
  - Actions: View, Download PDF, Send Reminder, Mark as Paid, Delete
- Stats cards at top:
  - Total Invoiced (sum of all invoice amounts)
  - Total Received (sum of all paid_amounts)
  - Outstanding Amount (sum of balances due)
- Search by client, project, or invoice number
- Date range filter (from date, to date)
- Sort: Date (desc), Amount (desc), Client name

**Send Reminder action:**
- Opens WhatsApp with message: "Hi [client_name], friendly reminder: Invoice #[number] for ₹[amount] is due on [date]. Thank you!"

---

## 6. MATERIALS

### A. Materials Inventory (/materials)

**Layout:**

**Header:**
- "Materials Inventory" title
- "Add Material" button (opens modal)

**Low Stock Alert Banner (if any materials below threshold):**
- Red/orange background
- Icon + text: "⚠️ X materials are low on stock"
- Lists material names with current quantity
- "View All" expands list if > 3

**Summary Cards (3 cards in row):**
- Total Materials: count of all materials
- Total Inventory Value: sum of (quantity × cost_per_unit)
- Low Stock Items: count where quantity < low_stock_threshold (red badge if > 0)

**Materials Table:**
- Columns: Name | Quantity | Unit | Cost/Unit | Total Value | Supplier | Actions
- Each row:
  - Name (text)
  - Quantity (click to edit inline):
    - On click: Show input field + quick buttons: +10, +5, +1, -1, -5, -10
    - Updates DB on blur or Enter
    - Show loading spinner during update
  - Unit (text)
  - Cost per Unit (click to edit inline, same as quantity)
  - Total Value (calculated: quantity × cost_per_unit, read-only)
  - Supplier (text)
  - Actions dropdown:
    - Edit (opens modal with all fields)
    - Delete (confirmation: "Are you sure? This will affect project calculations.")
    - View Usage (shows modal with list of projects using this material)
- Sort by clicking column headers (name, quantity, value)
- Search bar above table (filters by name or supplier)

**Filters (above table):**
- Supplier dropdown (shows unique suppliers + "All")
- Stock Level dropdown: All | Low Stock | In Stock | Out of Stock
- Sort by: Name | Quantity (asc/desc) | Value (desc)

**Add/Edit Material Modal:**
- Name (text, required)
- Unit (dropdown: kg, gram, meter, cm, piece, liter, sq.ft, cubic ft, etc.)
- Quantity (number, default 0)
- Cost per Unit (number, ₹ prefix)
- Supplier (text)
- Low Stock Threshold (number, default 10, helper text: "Alert when quantity falls below this")
- Notes (textarea)
- Save button

**Inline Editing:**
```typescript
// On quantity click
const [editing, setEditing] = useState(false);
const [value, setValue] = useState(material.quantity);

// Show input + quick adjust buttons
<div className="flex gap-2">
  <button onClick={() => adjustQuantity(-10)}>-10</button>
  <button onClick={() => adjustQuantity(-5)}>-5</button>
  <button onClick={() => adjustQuantity(-1)}>-1</button>
  <input value={value} onChange={e => setValue(e.target.value)} />
  <button onClick={() => adjustQuantity(1)}>+1</button>
  <button onClick={() => adjustQuantity(5)}>+5</button>
  <button onClick={() => adjustQuantity(10)}>+10</button>
</div>

// On blur or Enter: update DB
await supabase.from('materials').update({ quantity: value }).eq('id', material.id);
```

---

## 7. UI COMPONENTS

### Navigation.tsx (Bottom Nav)
- Fixed at bottom, full width
- 5 items with icons (Lucide React):
  - Home (Home icon) → /
  - Projects (Briefcase) → /projects
  - Clients (Users) → /clients
  - Money (DollarSign) → /invoices
  - Materials (Package) → /materials
- Active state: primary color background, bold text
- Mobile-friendly: 44px min touch target
- Hide on scroll down, show on scroll up (optional)

### Header.tsx
- Top sticky header
- Props: title (string), backButton (boolean), actions (ReactNode)
- Shows back arrow if backButton=true
- Right side: render actions prop (e.g., edit button, delete button)

### TimeTracker.tsx
- Props: projectId (string)
- State: timer running, elapsed time, recent entries
- localStorage key: `timeTracker_${projectId}` stores { startTime, projectId }
- START button:
  - Sets startTime to now
  - Saves to localStorage
  - Starts interval that updates elapsed display every second
- STOP button:
  - Calculates duration = now - startTime
  - Saves to time_entries table
  - Updates project.hours_spent
  - Clears localStorage
  - Stops interval
- Display format: HH:MM:SS
- Recent entries: fetch last 5 from time_entries for this project
- Edit entry: modal with start_time, end_time, notes fields

### WorkPlanner.tsx
- Fetches all tasks where status='pending'
- Joins with projects table to get deadline, quoted_amount
- Calculates priority score per task
- Sorts by score ascending (lower = higher priority)
- Shows top 3-5 tasks
- Each task card:
  - Project name + task description
  - Deadline badge (colored by urgency)
  - "Start Work" button (starts timer for that project, navigates to project details)
  - "Move to Tomorrow" (updates task.due_date to tomorrow)
  - Checkbox to mark complete

### PhotoUpload.tsx
- Props: projectId (string), onUploadComplete (callback)
- Drag-drop zone (use onDragOver, onDrop events)
- File input (hidden, triggered by "Upload" button)
- Multiple file selection (accept="image/*")
- Preview grid before upload
- For each file:
  - Category selector: Before | During | After
  - Caption input
  - Remove button
- "Upload All" button:
  - For each file:
    - Upload to Supabase Storage: `project-photos/${projectId}/${timestamp}_${filename}`
    - Insert record to photos table with file_path, category, caption
  - Show progress bar
  - Handle errors (file too large, upload failed)
- On complete: call onUploadComplete, clear preview

### ProjectCard.tsx
- Props: project (with client), onClick (callback)
- Shows:
  - Project name (h3)
  - Client name (link)
  - Status badge
  - Deadline ("5 days left" or "2 days overdue")
  - Progress bar (tasks completed / total)
- Actions menu (⋮): View, Edit, Delete
- Click card → calls onClick

### ClientCard.tsx
- Props: client (with project count), onClick (callback)
- Shows: Name, phone, email, project count badge
- Quick action buttons: Call, WhatsApp, Email
- Click card → calls onClick

### StatusBadge.tsx
- Props: status (string), variant (success|error|warning|info)
- Renders .status class with appropriate variant
- Color mapping:
  - not_started → gray
  - in_progress → blue
  - pending_client → yellow
  - completed → green
  - pending (invoice/payment) → yellow
  - paid → green
  - overdue → red

### ConfirmDialog.tsx
- Props: open (boolean), title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant (normal|danger)
- Modal with backdrop
- Title + message text
- Two buttons: Cancel (secondary), Confirm (primary or danger)
- Danger variant: red background on confirm button
- Click outside or ESC → calls onCancel
- Focus trap: Tab cycles between buttons

### Button.tsx
- Props: variant (primary|secondary|outline|ghost), size (sm|md|lg), loading (boolean), disabled, children, onClick
- Renders .btn with appropriate classes
- If loading: show spinner icon, disable button
- Support icon prop (renders before children)

### Card.tsx
- Props: children, header (ReactNode), footer (ReactNode), hover (boolean)
- Renders .card with .card__header, .card__body, .card__footer
- If hover=true: add hover effect

### Input.tsx
- Props: label, type, value, onChange, error, helperText, required, disabled, icon
- Renders .form-group > .form-label + .form-control
- If error: show red border + error message below
- If icon: render icon inside input (prefix or suffix)

### Select.tsx
- Props: label, options (array of {value, label}), value, onChange, error, searchable
- Renders .form-control <select>
- If searchable: use Combobox pattern with filter
- Options: map to <option> elements

### Modal.tsx
- Props: open, onClose, title, children, footer, size (sm|md|lg|full)
- Renders portal with backdrop
- Centered dialog
- Title, content area, footer with actions
- Click backdrop or ESC → calls onClose
- Focus trap

### Loading.tsx
- Exports:
  - Spinner component (animated spin icon)
  - SkeletonCard (gray pulsing card shape)
  - SkeletonText (gray pulsing text lines)
  - SkeletonList (multiple skeleton cards)
  - LoadingOverlay (fullscreen with spinner)

---

## 8. UTILITY FUNCTIONS

### lib/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### lib/utils.ts
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatRelativeDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function calculateDaysUntil(date: Date | string): number {
  return differenceInDays(new Date(date), new Date());
}

export function generateInvoiceNumber(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 900) + 100;
  return `INV-${date}-${random}`;
}

export function generateQuotationNumber(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 900) + 100;
  return `QUO-${date}-${random}`;
}

export function getStatusColor(status: string): string {
  const colors = {
    not_started: 'gray',
    in_progress: 'blue',
    pending_client: 'yellow',
    completed: 'green',
    pending: 'yellow',
    paid: 'green',
    overdue: 'red'
  };
  return colors[status] || 'gray';
}

export function getStatusBadgeClass(status: string): string {
  const color = getStatusColor(status);
  return `status status--${color}`;
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
```

### lib/whatsapp.ts
```typescript
export function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // Add +91 if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }
  return cleaned;
}

export function sendWhatsApp(phone: string, message: string): void {
  const formatted = formatPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${formatted}?text=${encoded}`;
  window.open(url, '_blank');
}

export const messageTemplates = {
  projectUpdate: (clientName: string, projectName: string, status: string, progress: number, deadline: string) =>
    `Hi ${clientName}, update on ${projectName}: ${status}. ${progress}% complete. Expected completion: ${deadline}.`,
  
  invoiceReminder: (clientName: string, invoiceNumber: string, amount: number, dueDate: string) =>
    `Hi ${clientName}, friendly reminder: Invoice #${invoiceNumber} for ₹${amount} is due on ${dueDate}. Thank you!`,
  
  quoteSent: (clientName: string, projectName: string, amount: number, validUntil: string) =>
    `Hi ${clientName}, quotation for ${projectName} is ready. Total: ₹${amount}. Valid until ${validUntil}.`
};
```

### lib/constants.ts
```typescript
export const DEFAULT_HOURLY_RATE = 500;

export const MATERIAL_UNITS = [
  'kg', 'gram', 'meter', 'cm', 'piece', 'liter', 'sq.ft', 'cubic ft'
];

export const PROJECT_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_client', label: 'Pending Client' },
  { value: 'completed', label: 'Completed' }
];

export const INVOICE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' }
];

export const PAYMENT_TERMS = `Payment is due within 30 days of invoice date.
Please make payment via bank transfer to:
Account Name: [Your Business Name]
Account Number: [Account Number]
IFSC Code: [IFSC Code]`;

export const TERMS_AND_CONDITIONS = `1. 50% advance payment required to begin work.
2. Balance payment due upon project completion.
3. Minor adjustments included; major changes will incur additional charges.
4. Project timeline subject to material availability.
5. Client approval required at key milestones.`;
```

### lib/pdf-generator.ts
```typescript
import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from './utils';

export async function generateQuotationPDF(
  quotation: any,
  client: any
): Promise<Blob> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('QUOTATION', 105, 20, { align: 'center' });
  
  // Quote details
  doc.setFontSize(10);
  doc.text(`Quote #: ${quotation.id}`, 20, 40);
  doc.text(`Date: ${formatDate(new Date())}`, 20, 46);
  
  // Client section
  doc.setFontSize(12);
  doc.text('Bill To:', 20, 60);
  doc.setFontSize(10);
  doc.text(client.name, 20, 66);
  if (client.phone) doc.text(client.phone, 20, 72);
  if (client.email) doc.text(client.email, 20, 78);
  
  // Itemized table
  let y = 95;
  doc.setFontSize(10);
  doc.text('Description', 20, y);
  doc.text('Amount', 170, y, { align: 'right' });
  y += 6;
  
  // Labor
  if (quotation.labor_hours > 0) {
    doc.text(`Labor: ${quotation.labor_hours} hours @ ${formatCurrency(quotation.hourly_rate)}/hr`, 20, y);
    doc.text(formatCurrency(quotation.labor_hours * quotation.hourly_rate), 170, y, { align: 'right' });
    y += 6;
  }
  
  // Materials
  if (quotation.material_cost > 0) {
    doc.text('Materials', 20, y);
    doc.text(formatCurrency(quotation.material_cost), 170, y, { align: 'right' });
    y += 6;
  }
  
  // Totals
  y += 10;
  doc.text('Subtotal:', 140, y);
  doc.text(formatCurrency(quotation.total_amount / (1 + quotation.margin_percentage / 100)), 170, y, { align: 'right' });
  y += 6;
  doc.text(`Margin (${quotation.margin_percentage}%):`, 140, y);
  doc.text(formatCurrency(quotation.total_amount - quotation.total_amount / (1 + quotation.margin_percentage / 100)), 170, y, { align: 'right' });
  y += 6;
  doc.setFontSize(12);
  doc.text('TOTAL:', 140, y);
  doc.text(formatCurrency(quotation.total_amount), 170, y, { align: 'right' });
  
  // Terms
  y += 20;
  doc.setFontSize(10);
  doc.text('Terms & Conditions:', 20, y);
  y += 6;
  const terms = TERMS_AND_CONDITIONS.split('\n');
  terms.forEach(line => {
    doc.text(line, 20, y);
    y += 5;
  });
  
  return doc.output('blob');
}

export async function generateInvoicePDF(
  invoice: any,
  project: any,
  client: any
): Promise<Blob> {
  // Similar structure to quotation PDF
  // Include invoice-specific fields: invoice_number, due_date, payment status
  // ... (implement similar to quotation)
  
  const doc = new jsPDF();
  // ... implementation
  return doc.output('blob');
}
```

### types/index.ts
```typescript
export interface Client {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'pending_client' | 'completed';
  deadline?: string;
  quoted_amount?: number;
  actual_cost: number;
  hours_spent: number;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string;
  description: string;
  status: 'pending' | 'completed' | 'rescheduled';
  due_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  supplier?: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMaterial {
  id: string;
  project_id: string;
  material_id: string;
  quantity_used: number;
  cost: number;
  created_at: string;
  material?: Material;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  notes?: string;
  created_at: string;
}

export interface Photo {
  id: string;
  project_id: string;
  file_path: string;
  category: 'before' | 'during' | 'after';
  caption?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  amount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  paid_amount: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  client_id: string;
  project_name: string;
  description?: string;
  labor_hours: number;
  hourly_rate: number;
  material_cost: number;
  margin_percentage: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  client: Client;
  tasks: Task[];
  project_materials: ProjectMaterial[];
  time_entries: TimeEntry[];
  photos: Photo[];
}
```

---

## 9. PACKAGE.JSON

Include these exact dependencies:

```json
{
  "name": "sculpture-flow",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "lucide-react": "^0.400.0",
    "jspdf": "^2.5.1",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

---

## 10. ROOT LAYOUT (app/layout.tsx)

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SculptureFlow - Business Management',
  description: 'Comprehensive business management for sculpture studios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Navigation />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```

---

## 11. README.md

Include:
- Project overview
- Features list
- Tech stack
- Prerequisites (Node.js 18+)
- Installation steps
- Environment variables setup
- Database schema setup instructions
- Deployment to Vercel guide
- Folder structure explanation
- Available scripts
- Troubleshooting section
- License (MIT)

---

## 12. ADDITIONAL REQUIREMENTS

**Error Handling:**
- Wrap all Supabase calls in try-catch
- Show user-friendly error messages via toast
- Log errors to console for debugging
- Never expose raw error messages to users

**Loading States:**
- Show skeleton loaders while fetching data
- Disable buttons during async operations
- Show loading spinner on button when submitting forms
- Use optimistic UI updates where appropriate

**Form Validation:**
- Validate all inputs client-side before submission
- Show inline error messages under fields
- Prevent submission if validation fails
- Use HTML5 validation attributes (required, min, max, pattern)

**Accessibility:**
- All interactive elements keyboard accessible
- Focus visible indicators
- ARIA labels on icon-only buttons
- Proper heading hierarchy (h1 > h2 > h3)
- Color contrast ratios meet WCAG AA
- Form inputs have associated labels

**Responsive Design:**
- Mobile-first approach
- Test breakpoints: 320px, 768px, 1024px, 1440px
- Touch targets minimum 44×44px
- Bottom navigation for mobile
- Collapsible sections on small screens
- Readable font sizes (minimum 14px body text)

**Performance:**
- Use Next.js Image component for images
- Lazy load components when appropriate
- Debounce search inputs (300ms)
- Paginate long lists (show 20 items, load more)
- Minimize bundle size

---

## GENERATE THE COMPLETE APPLICATION NOW

**IMPORTANT REMINDERS:**
1. ✅ Use Next.js 14 with App Router (NOT Vite)
2. ✅ Generate ALL files with complete implementations
3. ✅ NO placeholders, NO TODOs, NO "implement later"
4. ✅ All features must be fully functional
5. ✅ Include all imports and dependencies
6. ✅ TypeScript types for everything
7. ✅ Complete error handling and loading states
8. ✅ Mobile-responsive design
9. ✅ Production-ready code

Start generating the complete SculptureFlow application now. Generate all files in the correct structure. Make it production-ready.
