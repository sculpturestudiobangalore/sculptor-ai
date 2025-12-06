# COPILOT CHAT PROMPTS FOR SCULPTUREFLOW COMPLETION

Use these prompts in VS Code GitHub Copilot Chat to complete the missing features.

---

## 🎯 **STRATEGY: Complete Features One by One**

Use Copilot's `/createWorkspace` or chat commands to generate each missing component.

---

## 📋 **PROMPT 1: Generate TimeTracker Component**

**Open Copilot Chat (Cmd+I or Ctrl+I) and paste:**

```
@workspace /new Generate a complete TimeTracker component at src/components/TimeTracker.tsx

Requirements:
- Props: projectId (string)
- Use React hooks: useState, useEffect
- localStorage key: `timeTracker_${projectId}` to store { startTime: ISO string, projectId: string }
- START button functionality:
  * Save current time to localStorage
  * Start interval updating elapsed time every second
  * Display as HH:MM:SS with pulsing red dot animation
  * Button shows "STOP" in red
- STOP button functionality:
  * Calculate duration in minutes
  * Save to Supabase time_entries table: { project_id, start_time, end_time, duration_minutes }
  * Update projects table: increment hours_spent by (duration_minutes / 60)
  * Clear localStorage
  * Stop interval
  * Show success toast
- Display total hours from project.hours_spent
- Show recent 5 entries from time_entries table with edit/delete actions
- Edit modal with start_time, end_time, notes fields
- Delete with confirmation dialog
- Complete error handling with react-hot-toast notifications
- Use Lucide React icons: Play, Square, Clock, Edit, Trash
- TypeScript with proper types from src/types/index.ts
- Import supabase from src/lib/supabase.ts
- Mobile-responsive with Tailwind CSS
- Use design system classes from globals.css

Generate complete production-ready code with NO placeholders.
```

---

## 📋 **PROMPT 2: Generate PhotoUpload Component**

```
@workspace /new Generate a complete PhotoUpload component at src/components/PhotoUpload.tsx

Requirements:
- Props: projectId (string), onUploadComplete (callback function)
- Drag-and-drop zone using onDragOver, onDrop events
- File input (hidden, triggered by button)
- Multiple image file selection (accept="image/*")
- Preview grid before upload showing thumbnails
- For each image preview:
  * Category dropdown: Before | During | After
  * Caption text input
  * Remove button
- "Upload All" button:
  * Upload each file to Supabase Storage bucket 'project-photos'
  * File path: `${projectId}/${Date.now()}_${file.name}`
  * After upload, insert record to photos table: { project_id, file_path, category, caption }
  * Show upload progress (0-100%)
  * Handle errors (file too large > 5MB, upload failed)
  * On success: show toast, call onUploadComplete, clear previews
- Complete error handling with try-catch
- Use react-hot-toast for notifications
- Use Lucide React icons: Upload, X, Image
- TypeScript with proper types
- Import supabase from src/lib/supabase.ts
- Tailwind CSS with glassmorphic design
- Mobile-responsive

Generate complete production-ready code with NO placeholders.
```

---

## 📋 **PROMPT 3: Generate WorkPlanner Component**

```
@workspace /new Generate a complete WorkPlanner component at src/components/WorkPlanner.tsx

Requirements:
- Fetch all tasks with status='pending' from tasks table
- Join with projects table to get: project.name, project.deadline, project.quoted_amount
- Calculate priority score for each task:
  * If project is overdue: score = -999
  * If due today: score = -100
  * If due this week: score = -(7 - days_until_deadline)
  * Otherwise: score = project.quoted_amount / 10000
- Sort tasks by score ascending (lower score = higher priority)
- Display top 3-5 tasks as cards
- Each task card shows:
  * Project name (bold)
  * Task description
  * Deadline badge (colored: red if overdue, yellow if today, gray if future)
  * "Start Work" button: starts time tracker for that project, navigates to /projects/[id]
  * "Move to Tomorrow" button: updates task.due_date to tomorrow
  * Checkbox to mark complete: updates task.status to 'completed'
- Empty state: "No pending tasks. Great job!"
- Loading skeleton while fetching
- Error handling with toast
- Use Lucide React icons: AlertCircle, Calendar, Play
- TypeScript with proper types from src/types/index.ts
- Use Next.js router for navigation: import { useRouter } from 'next/navigation'
- Supabase queries with proper error checking
- Tailwind CSS glassmorphic cards
- Mobile-responsive

Generate complete production-ready code with NO placeholders.
```

---

## 📋 **PROMPT 4: Update Project Details Page**

```
@workspace Open src/app/projects/[id]/page.tsx and update it completely.

Current file has placeholder "coming soon" sections for:
- Tasks
- Photos
- Time Tracker
- Materials Used

Replace entire file with complete implementation:

1. Import and use TimeTracker component
2. Import and use PhotoUpload component
3. Complete Tasks Section:
   - Quick add input with "Add" button
   - Tasks list with checkboxes to mark complete
   - Inline edit description (click to edit, auto-save on blur)
   - Due date badge (colored by status)
   - Delete button with confirmation
   - Toggle to show/hide completed tasks
   - Progress counter: "X of Y completed"
4. Complete Materials Section:
   - "Add Material" button opens modal
   - Modal has: material selector dropdown, quantity input, auto-calculated cost
   - Materials table showing: name, quantity, unit, cost, delete button
   - Running total: "Total Material Cost: ₹X,XXX"
   - On add: insert to project_materials table, update project.actual_cost
5. Photos Gallery Section:
   - PhotoUpload component integrated
   - Category tabs: All | Before | During | After
   - Photo grid with thumbnails (3-4 cols responsive)
   - Click photo opens lightbox with full image, caption, delete button
6. Project Overview Card:
   - Circular progress indicator (tasks completed / total)
   - Stats: total hours, materials cost, actual vs quoted
   - Budget indicator (green/red)
7. Client Communication Card:
   - WhatsApp button with template message
   - Call button (tel: link)
   - Email button (mailto: link)
8. Actions Footer:
   - "Mark as Completed" button
   - "Generate Invoice" button (navigates to /invoices/new with projectId)

Use existing types from src/types/index.ts
Import supabase from src/lib/supabase.ts
Import utils from src/lib/utils.ts (formatCurrency, formatDate)
All Supabase queries with complete error handling
Loading states for all async operations
Toast notifications for user actions
TypeScript strict mode
Tailwind CSS with glassmorphic design
Mobile-responsive layout

Generate COMPLETE file replacing all placeholder content. NO "coming soon" messages.
```

---

## 📋 **PROMPT 5: Update Dashboard Page**

```
@workspace Open src/app/page.tsx and enhance it with WorkPlanner component.

Current implementation might be missing:
- WorkPlanner integration
- Floating Action Button

Update the file to include:

1. Import WorkPlanner component
2. Add WorkPlanner section below Active Projects
3. Implement Floating Action Button (FAB):
   - Fixed bottom-right position (60px from bottom, 24px from right)
   - Round button with "+" icon
   - Opens menu on click with 3 options:
     * New Project → /projects/new
     * New Client → /clients/new  
     * New Quote → /quotations/new
   - Gradient background, box-shadow, hover animation
   - Menu appears above button with glassmorphic design
4. Ensure all stats are calculating correctly:
   - Projects in progress: count where status='in_progress'
   - Overdue: count where deadline < today AND status != 'completed'
   - Active hours: sum of time_entries.duration_minutes for current month / 60
5. Today's Priority card:
   - Fetch project with nearest deadline (status != 'completed')
   - Show days remaining with color coding
   - START WORK button functional

Keep existing good code, enhance missing parts.
Use Lucide React icons: Plus, Briefcase, Users, FileText
TypeScript with proper types
Complete error handling
Toast notifications
Tailwind CSS glassmorphic design
Mobile-responsive

Generate complete updated file.
```

---

## 📋 **PROMPT 6: Generate Client Pages**

```
@workspace /new Generate three client-related files:

1. src/app/clients/new/page.tsx - Create Client Page
   - Form fields: name (required), phone, whatsapp (defaults to phone), email, notes
   - Phone validation: 10 digits or +91XXXXXXXXXX format
   - Email validation: proper email format
   - Submit button: saves to clients table, shows toast, navigates to /clients
   - Cancel button: navigates back
   - Form validation with inline errors
   - Loading state during save

2. src/app/clients/[id]/page.tsx - Client Details Page
   - Fetch client by ID with projects
   - Inline editable fields: name, phone, whatsapp, email
   - Auto-save on blur (debounced 500ms)
   - Notes section with textarea (auto-save)
   - Quick action buttons: Call, WhatsApp, Email
   - Projects section with tabs: All | Active | Completed
   - Stats cards: Total projects, Total value, Average value
   - Quick actions: "Create Quotation", "Create Project" (navigate with clientId param)
   - Delete client button with restrictions (no active projects)

3. src/components/ClientCard.tsx - Client Card Component
   - Props: client (with project_count), onClick
   - Display: name, phone, email, project count badge
   - Quick buttons: Call, WhatsApp, Email (smaller icons)
   - Click card → calls onClick
   - Glassmorphic card design
   - Hover effect

Use TypeScript types from src/types/index.ts
Import supabase from src/lib/supabase.ts
Import formatPhoneNumber from src/lib/whatsapp.ts
Complete error handling
Toast notifications
Tailwind CSS
Mobile-responsive

Generate all three complete files with NO placeholders.
```

---

## 📋 **PROMPT 7: Update Clients List Page**

```
@workspace Open src/app/clients/page.tsx and update it to use ClientCard component.

Requirements:
- Import ClientCard from src/components/ClientCard
- Search functionality (debounced 300ms):
  * Filter by name, phone, or email
  * Use useDebounce hook from src/hooks/useDebounce.ts
- Sort dropdown: Name (A-Z), Recent activity, Most projects
- Clients grid using ClientCard component (1-3 cols responsive)
- Each client data includes project count from join query:
  ```typescript
  const { data } = await supabase
    .from('clients')
    .select(`
      *,
      projects (count)
    `)
  ```
- Click card → navigate to /clients/[id]
- "Add Client" floating button → navigate to /clients/new
- Empty state if no clients: "No clients yet. Create your first client!"
- Loading skeletons while fetching
- Error handling with toast

Keep search and sort functionality.
Use ClientCard for display.
Complete TypeScript types.
Tailwind CSS glassmorphic design.
Mobile-responsive.

Generate complete updated file.
```

---

## 📋 **PROMPT 8: Generate Quotation Pages**

```
@workspace /new Generate two quotation files:

1. src/app/quotations/page.tsx - Quotations List
   - Tab filters: All | Draft | Sent | Approved | Rejected
   - Quotation cards showing:
     * Quote number (auto-generated from ID)
     * Client name (from join)
     * Project name
     * Total amount (formatted as ₹X,XXX)
     * Status badge (colored)
     * Created date (relative: "2 days ago")
     * Actions: View, Download PDF, Edit, Delete, Convert to Project
   - Search by client name or project name
   - Sort: Date (desc), Amount (desc), Client name
   - Click "Convert to Project": creates project, links quotation, navigates to project
   - Empty state: "No quotations yet"
   - Loading skeletons

2. src/app/quotations/new/page.tsx - Quotation Generator
   - Client selector (searchable dropdown with "Create New Client" link)
   - Project name and description inputs
   - Labor section:
     * Hours input (step 0.5)
     * Hourly rate input (default ₹500 from constants)
     * Labor subtotal (calculated, read-only)
   - Materials section:
     * "Add Material" button
     * Dynamic material rows array with:
       - Material dropdown (from materials table)
       - Quantity input
       - Cost per unit (auto-filled from material)
       - Line total (calculated)
       - Remove button
     * Materials subtotal (calculated)
   - Pricing section:
     * Subtotal (labor + materials)
     * Margin slider (0-50%, default 20%)
     * Margin amount (calculated)
     * TOTAL (bold, large)
   - Terms & Conditions textarea (default from constants)
   - Actions:
     * Save as Draft (status='draft')
     * Generate PDF (use generateQuotationPDF from src/lib/pdf-generator.ts)
     * Send via WhatsApp (generate PDF, open WhatsApp)
     * Convert to Project
   - Real-time calculations using useEffect
   - Form validation
   - Complete error handling
   - Toast notifications

Use types from src/types/index.ts
Import supabase, utils, constants, pdf-generator, whatsapp
TypeScript strict mode
Tailwind CSS glassmorphic design
Mobile-responsive with good UX

Generate both complete files with NO placeholders.
```

---

## 📋 **PROMPT 9: Generate Invoice Generator**

```
@workspace /new Generate src/app/invoices/new/page.tsx - Invoice Generator

Requirements:
- Check for projectId in URL searchParams
- If projectId: pre-fill from project data
  * Fetch project with client, project_materials, time_entries
  * Auto-populate: client info, line items (labor + materials)
- Invoice number: auto-generated INV-YYYYMMDD-XXX (use generateInvoiceNumber)
- Invoice date and due date pickers (default: today, today+30)
- Bill To section: client selector (if not pre-filled)
- Line Items table (dynamic array):
  * Columns: Description | Quantity | Rate | Amount
  * Pre-filled rows if from project
  * "Add Line Item" button adds editable row
  * Remove button per row
  * All fields editable
- Calculations:
  * Subtotal (sum of line amounts)
  * Tax % input (0-100, default 0)
  * Tax amount (calculated)
  * TOTAL (bold, large)
- Payment Details:
  * Status dropdown: Pending | Partially Paid | Paid
  * Amount paid input (max: total)
  * Balance due (calculated, highlighted if > 0)
  * Payment terms textarea (default from constants)
  * Notes textarea
- Actions:
  * Save Invoice (to invoices table)
  * Generate PDF (use generateInvoicePDF)
  * Mark as Paid (status='paid', paid_amount=total)
  * Send via WhatsApp
  * Print (window.print)
- Form validation:
  * Client required
  * At least one line item
  * Paid amount <= total
  * Due date >= invoice date
- Complete error handling
- Toast notifications
- Loading states

Use Next.js 14 App Router with searchParams
Import types, supabase, utils, constants, pdf-generator, whatsapp
TypeScript strict mode
Tailwind CSS glassmorphic design
Mobile-responsive forms

Generate complete production-ready file with NO placeholders.
```

---

## 📋 **PROMPT 10: Update Materials Inventory Page**

```
@workspace Open src/app/materials/page.tsx and add inline editing functionality.

Current file probably shows basic list. Add:

1. Inline Quantity Editing:
   - Click quantity cell → shows input field
   - Quick adjust buttons: -10, -5, -1, +1, +5, +10
   - Updates DB on blur or Enter key
   - Show loading spinner during update
   - Optimistic UI update
   - Error handling with rollback

2. Inline Cost Editing:
   - Same pattern as quantity
   - Format as currency (₹X,XXX)

3. Low Stock Alert Banner (at top):
   - Only show if any material.quantity < material.low_stock_threshold
   - Red/orange background
   - List materials with low stock
   - "View All" button if > 3 items

4. Summary Cards:
   - Total Materials count
   - Total Inventory Value: sum(quantity × cost_per_unit)
   - Low Stock Items count (with red badge if > 0)

5. Filters:
   - Supplier dropdown (unique suppliers from DB)
   - Stock Level: All | Low Stock | In Stock | Out of Stock
   - Sort: Name | Quantity | Value

6. Actions per row:
   - Edit (opens modal with all fields)
   - Delete (confirmation dialog)
   - View Usage (shows modal with projects using this material)

7. Add Material Modal:
   - Name, unit (dropdown), quantity, cost, supplier, threshold, notes
   - Form validation
   - Save to materials table

Keep existing search functionality.
Use TypeScript with proper types.
Complete error handling.
Toast notifications.
Tailwind CSS glassmorphic design.
Mobile-responsive table (consider card view on mobile).

Generate complete updated file with inline editing.
```

---

## 📋 **PROMPT 11: Update Invoices List Page**

```
@workspace Open src/app/invoices/page.tsx and enhance it.

Add missing functionality:

1. Stats Cards at Top:
   - Total Invoiced: sum of all invoice.amount
   - Total Received: sum of all invoice.paid_amount
   - Outstanding Amount: sum of (amount - paid_amount) where status != 'paid'

2. Tab Filters:
   - All | Pending | Partially Paid | Paid | Overdue
   - Overdue: due_date < today AND status != 'paid'

3. Invoice Cards:
   - Invoice number, client name, project name (from joins)
   - Amount, paid amount, balance due
   - Due date with red text if overdue
   - Status badge (colored)
   - Actions dropdown:
     * View (navigate to invoice details if exists)
     * Download PDF (generate and download)
     * Send Reminder (WhatsApp with template)
     * Mark as Paid (update status, paid_amount)
     * Delete (confirmation)

4. Search & Filters:
   - Search by client, project, or invoice number
   - Date range filter (from date, to date)
   - Sort: Date (desc), Amount (desc), Client name

5. Send Reminder Action:
   - Uses messageTemplates.invoiceReminder from whatsapp.ts
   - Opens WhatsApp with pre-filled message

Keep existing grid layout.
Add stats cards and enhanced actions.
Complete error handling.
Toast notifications.
TypeScript types.
Tailwind CSS.
Mobile-responsive.

Generate complete updated file.
```

---

## 🎯 **USAGE INSTRUCTIONS FOR COPILOT**

### **How to Use These Prompts:**

1. **Open VS Code** with your project
2. **Open Copilot Chat** (Cmd+I or Ctrl+I, or click chat icon)
3. **Paste one prompt at a time** starting with Prompt 1
4. **Review generated code** - Copilot will create/update files
5. **Test the feature** in browser
6. **Move to next prompt** once tested

### **Copilot Chat Commands:**

- `@workspace /new` - Generate new file
- `@workspace Open [file]` - Open and edit existing file
- `/explain` - Explain code
- `/fix` - Fix errors in code
- `/tests` - Generate tests

### **If Copilot Output is Incomplete:**

If Copilot generates partial code, ask:
```
Continue generating the rest of the file. Complete all functions and sections.
```

Or:
```
The generated code has placeholders. Replace all TODOs with complete implementations.
```

---

## 🔄 **RECOMMENDED ORDER:**

1. ✅ **Prompt 1** - TimeTracker (needed for Prompt 4)
2. ✅ **Prompt 2** - PhotoUpload (needed for Prompt 4)
3. ✅ **Prompt 3** - WorkPlanner (needed for Prompt 5)
4. ✅ **Prompt 4** - Update Project Details (most visible improvement)
5. ✅ **Prompt 5** - Update Dashboard (second most visible)
6. ✅ **Prompt 6** - Generate Client Pages
7. ✅ **Prompt 7** - Update Clients List
8. ✅ **Prompt 8** - Generate Quotations
9. ✅ **Prompt 9** - Generate Invoice Creator
10. ✅ **Prompt 10** - Update Materials with Inline Edit
11. ✅ **Prompt 11** - Update Invoices List

---

## ✅ **TESTING CHECKLIST**

After each prompt:
- [ ] File generated/updated successfully
- [ ] No TypeScript errors
- [ ] Imports resolve correctly
- [ ] Component renders in browser
- [ ] Feature works as expected
- [ ] Toast notifications appear
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Glassmorphic styling applied

---

## 🐛 **COMMON COPILOT ISSUES & FIXES**

**Issue: Copilot generates incomplete code**
```
Continue from where you left off. Generate the complete remaining code for this file.
```

**Issue: Missing imports**
```
Add all missing imports at the top of this file. Import from correct paths.
```

**Issue: TypeScript errors**
```
Fix all TypeScript errors in this file. Use proper types from src/types/index.ts.
```

**Issue: Code doesn't match design system**
```
Update this component to use design system classes from globals.css: .btn, .card, .form-control, etc.
Apply glassmorphic styling with backdrop-filter and glass effects.
```

---

## 💡 **PRO TIPS FOR COPILOT:**

1. **Be specific** - Mention exact file paths and imports
2. **Reference existing code** - "Use pattern from TimeTracker.tsx"
3. **Iterate** - Start with basic version, then enhance
4. **Use @workspace** - Copilot can see all project files
5. **Test frequently** - Don't generate 10 files before testing first one

---

Start with **Prompt 1 (TimeTracker)** and work through sequentially! 🚀
