# 🎨 SCULPTUREFLOW - COMPLETE VISUAL SITEMAP & WIREFRAMES

## 📱 **NAVIGATION STRUCTURE**

### **Bottom Navigation Bar (Always Visible)**
```
┌─────────────────────────────────────────────────────┐
│  🏠      📁       👤       💰       📦              │
│ Home  Projects Clients Invoices Materials           │
└─────────────────────────────────────────────────────┘
```

---

## 🗺️ **COMPLETE SITE MAP**

```
SculptureFlow App
│
├── 🏠 HOME (Dashboard)
│   └── /
│
├── 📁 PROJECTS
│   ├── /projects (List)
│   ├── /projects/new (Create)
│   └── /projects/[id] (Details)
│
├── 👤 CLIENTS
│   ├── /clients (List)
│   ├── /clients/new (Create)
│   └── /clients/[id] (Details)
│
├── 💰 INVOICES
│   ├── /invoices (List)
│   └── /invoices/new (Create)
│
├── 📦 MATERIALS
│   └── /materials (Inventory)
│
└── 💵 QUOTATIONS
    ├── /quotations (List)
    └── /quotations/new (Generator)
```

---

## 🏠 **SCREEN 1: DASHBOARD** (`/`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ SculptureFlow                      📅 Nov 2     │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─── Today's Priority ─────────────────────┐  │
│ │                                           │  │
│ │  Temple Lion Sculpture                    │  │
│ │  Rajesh Kumar                             │  │
│ │                                           │  │
│ │  Deadline: 01 Dec 2025                    │  │
│ │  29 days left                             │  │
│ │                                           │  │
│ │                    [START WORK] ─────────►│  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌──────┐  ┌──────┐  ┌──────────┐              │
│ │In    │  │Over  │  │Active    │              │
│ │Prog  │  │due   │  │Hours     │              │
│ │  1   │  │  0   │  │  0.0h    │              │
│ └──────┘  └──────┘  └──────────┘              │
│                                                 │
│ Active Projects              [View All] ────►  │
│ ┌─────────────────────────────────────────┐   │
│ │ Temple Lion Sculpture                   │   │
│ │ Rajesh Kumar                            │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Today's Focus                                   │
│ ┌─────────────────────────────────────────┐   │
│ │ 📋 Design temple entrance (Due today)   │   │
│ │     [Start] [Move to Tomorrow]          │   │
│ │                                          │   │
│ │ ✓ Order bronze material                  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│                                  [+] ◄── FAB   │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Header** - App name + current date
2. **Today's Priority Card** - Project with nearest deadline
3. **Stats Cards** (3) - Projects, Overdue, Hours
4. **Active Projects** - Grid of project cards
5. **Today's Focus** - WorkPlanner with smart prioritized tasks
6. **Floating Action Button (FAB)** - Bottom right, opens menu

### **Interactions:**
- Tap "START WORK" → Navigate to project details
- Tap project card → Navigate to project details
- Tap FAB → Opens menu (New Project, New Client, New Quote)
- Tap task "Start" → Navigate to project, start timer
- Check task → Mark as completed

---

## 📁 **SCREEN 2: PROJECTS LIST** (`/projects`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Projects                          [+ New]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ [All] [In Progress] [Pending] [Completed]      │
│                                                 │
│ 🔍 Search projects...                          │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Temple Lion Sculpture                   │   │
│ │ Rajesh Kumar                            │   │
│ │ 📅 Due: Dec 1 (29 days)  ⚙️ In Progress │   │
│ │ ▓▓▓▓▓▓░░░░ 60% complete                 │   │
│ │                           [View] [Edit] │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Garden Fountain                         │   │
│ │ Priya Sharma                            │   │
│ │ 📅 Due: Nov 15 (13 days) ⚠️ Overdue     │   │
│ │ ▓▓▓░░░░░░░ 30% complete                 │   │
│ │                           [View] [Edit] │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Header** - Back button + "New Project" button
2. **Tab Filters** - All, In Progress, Pending Client, Completed
3. **Search Bar** - Debounced search
4. **Project Cards Grid** - Name, client, deadline, status, progress bar
5. **Actions per card** - View, Edit, Delete

### **Interactions:**
- Tap project card → Navigate to project details
- Tap "+ New" → Navigate to create project
- Search → Filter projects live
- Tab filter → Show filtered projects

---

## 🔧 **SCREEN 3: PROJECT DETAILS** (`/projects/[id]`)

### **Layout (Scrollable):**
```
┌─────────────────────────────────────────────────┐
│ ← Temple Lion Sculpture             [⋮ Menu]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─── Project Info ────────────────────────┐   │
│ │ Client: Rajesh Kumar ───────────────────►│   │
│ │ Status: 🟢 In Progress                   │   │
│ │ Deadline: 01 Dec 2025                    │   │
│ │ Description: Life-size bronze lion       │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Time Tracker ────────────────────────┐   │
│ │ ⏱️ 00:00:00                              │   │
│ │                                          │   │
│ │        [▶ START TRACKING] ◄── Big button│   │
│ │                                          │   │
│ │ Total Time: 0h 0m                        │   │
│ │                                          │   │
│ │ Recent Entries:                          │   │
│ │ • Nov 1: 2h 30m [Edit] [Delete]         │   │
│ │ • Oct 30: 3h 15m [Edit] [Delete]        │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Tasks (3 of 5 completed) ───────────┐   │
│ │                                          │   │
│ │ ➕ Add new task...                       │   │
│ │                                          │   │
│ │ ☑ Design sketch              [Delete]   │   │
│ │ ☑ Order materials            [Delete]   │   │
│ │ ☐ Create mold                [Delete]   │   │
│ │ ☐ Bronze casting             [Delete]   │   │
│ │ ☐ Final polishing            [Delete]   │   │
│ │                                          │   │
│ │ [Show completed (2)] ────────────────►  │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Photos ─────────────────────────────┐   │
│ │ [All] [Before] [During] [After]         │   │
│ │                                          │   │
│ │ 📤 Drag & drop photos or click to       │   │
│ │    upload                                │   │
│ │                                          │   │
│ │ ┌──┐ ┌──┐ ┌──┐                          │   │
│ │ │📷│ │📷│ │📷│ ... (grid of photos)     │   │
│ │ └──┘ └──┘ └──┘                          │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Materials Used ──────────────────────┐   │
│ │                                          │   │
│ │ Material: [Bronze ▼]                     │   │
│ │ Quantity: [10] kg                        │   │
│ │ Cost/Unit: ₹450.00                       │   │
│ │ Line Total: ₹4,500.00           [×]     │   │
│ │                                          │   │
│ │ [+ Add Material Row]                     │   │
│ │                                          │   │
│ │ Subtotal: ₹4,500.00                      │   │
│ │ [Add to Project]                         │   │
│ │                                          │   │
│ │ ─────────────────────────────────────    │   │
│ │ Materials Currently Used:                │   │
│ │ • Bronze: 10kg × ₹450 = ₹4,500          │   │
│ │ Total Cost: ₹4,500.00                    │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Client Communication ────────────────┐   │
│ │ [📱 WhatsApp] [📞 Call] [✉️ Email]      │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Actions ─────────────────────────────┐   │
│ │ [Mark as Completed] [Generate Invoice]  │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Project Info Card** - Editable inline
2. **Time Tracker** - START/STOP with live timer
3. **Tasks Section** - Add, complete, delete tasks
4. **Photos Gallery** - Upload, view by category
5. **Materials Section** - Add form + list of used materials
6. **Communication Card** - Quick contact buttons
7. **Actions** - Complete project, generate invoice

### **Interactions:**
- Tap "START TRACKING" → Timer starts, button becomes red "STOP"
- Tap STOP → Save time entry, show in list
- Check task → Mark as completed
- Tap "Add task" → Opens quick-add modal
- Tap photo → Opens lightbox view
- Upload photos → Drag-drop or file picker
- Add material → Shows in list below, updates total
- Tap WhatsApp → Opens WhatsApp with template
- Tap "Generate Invoice" → Navigate to invoice generator with pre-filled data

---

## 👤 **SCREEN 4: CLIENTS LIST** (`/clients`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Clients                           [+ New]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔍 Search clients...                           │
│                                                 │
│ Sort: [Name ▼] [Recent] [Most Projects]        │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Rajesh Kumar                            │   │
│ │ 📱 +91 9876543210                       │   │
│ │ ✉️  rajesh@example.com                  │   │
│ │ 📊 3 projects • ₹1,50,000 total         │   │
│ │ [📱][📞][✉️]              [View Details]│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Priya Sharma                            │   │
│ │ 📱 +91 9123456789                       │   │
│ │ ✉️  priya@example.com                   │   │
│ │ 📊 1 project • ₹75,000 total            │   │
│ │ [📱][📞][✉️]              [View Details]│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Header** - Back + "New Client" button
2. **Search Bar** - Filter by name, phone, email
3. **Sort Dropdown** - Name, Recent, Most Projects
4. **Client Cards** - Name, contact, stats, quick actions

### **Interactions:**
- Tap client card → Navigate to client details
- Tap quick action icons → Call, WhatsApp, Email
- Tap "+ New" → Navigate to create client

---

## 📄 **SCREEN 5: CLIENT DETAILS** (`/clients/[id]`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Rajesh Kumar                      [Edit]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─── Contact Information ─────────────────┐   │
│ │ Name: Rajesh Kumar (editable)           │   │
│ │ Phone: +91 9876543210 (editable)        │   │
│ │ WhatsApp: +91 9876543210 (editable)     │   │
│ │ Email: rajesh@example.com (editable)    │   │
│ │                                          │   │
│ │ [📱 WhatsApp] [📞 Call] [✉️ Email]      │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Stats ──────────────────────────────┐   │
│ │ Total Projects: 3                       │   │
│ │ Total Value: ₹1,50,000                  │   │
│ │ Average Value: ₹50,000                  │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Notes (auto-save) ───────────────────┐   │
│ │ Regular customer, prefers bronze...     │   │
│ │ (textarea)                               │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ Projects                                        │
│ [All] [Active] [Completed]                      │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Temple Lion Sculpture                   │   │
│ │ 📅 Due: Dec 1 • ⚙️ In Progress          │   │
│ │ ₹50,000                  [View Project] │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Garden Fountain                         │   │
│ │ 📅 Completed Oct 15 • ✅ Done           │   │
│ │ ₹75,000                  [View Project] │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ [Create Quotation] [Create New Project]        │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Contact Info Card** - Inline editable with auto-save
2. **Quick Actions** - WhatsApp, Call, Email
3. **Stats Cards** - Project count, total/average value
4. **Notes** - Auto-save textarea
5. **Projects List** - Tabs for filtering
6. **Action Buttons** - Create quotation, create project

---

## 💰 **SCREEN 6: INVOICES LIST** (`/invoices`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Invoices                          [+ New]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│ │Total     │  │Total     │  │Outstand  │      │
│ │Invoiced  │  │Received  │  │-ing      │      │
│ │₹3,50,000 │  │₹2,00,000 │  │₹1,50,000 │      │
│ └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│ [All] [Pending] [Partially Paid] [Paid]        │
│                                                 │
│ 🔍 Search invoices...                          │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ INV-20251101-001                        │   │
│ │ Rajesh Kumar • Temple Lion              │   │
│ │ ₹50,000 (₹20,000 paid) 📅 Due Nov 30   │   │
│ │ 🟡 Partially Paid                       │   │
│ │ [Download PDF] [Send Reminder] [Pay]   │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ INV-20251025-003                        │   │
│ │ Priya Sharma • Garden Fountain          │   │
│ │ ₹75,000 (₹75,000 paid) 📅 Due Oct 25   │   │
│ │ ✅ Paid                                  │   │
│ │ [Download PDF] [View Details]           │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Stats Cards** (3) - Total Invoiced, Received, Outstanding
2. **Tab Filters** - All, Pending, Partially Paid, Paid, Overdue
3. **Search Bar** - Filter by client, project, invoice number
4. **Invoice Cards** - Number, client, amounts, status, actions

### **Interactions:**
- Tap invoice card → Navigate to invoice details (if exists)
- Tap "Download PDF" → Generate and download PDF
- Tap "Send Reminder" → Opens WhatsApp with reminder message
- Tap "Mark as Paid" → Update status, show success toast

---

## 💵 **SCREEN 7: INVOICE GENERATOR** (`/invoices/new`)

### **Layout (Scrollable):**
```
┌─────────────────────────────────────────────────┐
│ ← Create Invoice                    [Save]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Invoice #: INV-20251102-004 (auto)              │
│ Date: [Nov 2, 2025 ▼]                          │
│ Due Date: [Dec 2, 2025 ▼]                      │
│                                                 │
│ ┌─── Bill To ─────────────────────────────┐   │
│ │ Client: [Rajesh Kumar ▼]                │   │
│ │ +91 9876543210                           │   │
│ │ rajesh@example.com                       │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Line Items ──────────────────────────┐   │
│ │ Description    | Qty | Rate  | Amount   │   │
│ │ Bronze casting | 1   | 30000 | 30000    │   │
│ │ Labor charges  | 40h | 500   | 20000    │   │
│ │ [+ Add Line Item]                        │   │
│ │                                          │   │
│ │ Subtotal:              ₹50,000          │   │
│ │ Tax (0%):              ₹0                │   │
│ │ TOTAL:                 ₹50,000          │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Payment ─────────────────────────────┐   │
│ │ Status: [Pending ▼]                      │   │
│ │ Amount Paid: ₹[0]                        │   │
│ │ Balance Due: ₹50,000                     │   │
│ │                                          │   │
│ │ Payment Terms:                           │   │
│ │ (textarea with default terms)            │   │
│ │                                          │   │
│ │ Notes:                                   │   │
│ │ (textarea)                               │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ [Save Invoice] [Generate PDF] [Send WhatsApp]  │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Invoice Details** - Number (auto), dates
2. **Bill To** - Client selector
3. **Line Items Table** - Dynamic rows, add/remove
4. **Calculations** - Subtotal, tax, total (auto-calculated)
5. **Payment Section** - Status, paid amount, balance, terms
6. **Actions** - Save, Generate PDF, Send WhatsApp

### **Interactions:**
- Select client → Auto-fill contact info
- Add line item → New editable row
- Remove line item → Delete row, recalculate
- Change quantities/rates → Auto-recalculate totals
- Enter paid amount → Calculate balance
- Save → Create invoice in DB
- Generate PDF → Create and download PDF
- Send WhatsApp → Generate PDF + open WhatsApp

---

## 📦 **SCREEN 8: MATERIALS INVENTORY** (`/materials`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Materials                         [+ New]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⚠️ Low Stock Alert: Bronze (5kg), Steel (2kg)  │
│                                                 │
│ ┌──────┐  ┌──────┐  ┌──────┐                  │
│ │Total │  │Invent│  │Low   │                  │
│ │Items │  │Value │  │Stock │                  │
│ │  25  │  │₹2.5L │  │  2   │                  │
│ └──────┘  └──────┘  └──────┘                  │
│                                                 │
│ 🔍 Search materials...                         │
│ Filter: [All Suppliers ▼] [All Stock ▼]        │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ Name     | Qty    | Unit | Cost  | ...  │   │
│ │ Bronze   | [10] kg| kg   | ₹450  | Edit │   │
│ │          | [-5][-1][+1][+5] ◄── Quick adj │   │
│ │ Steel    | [5] kg | kg   | ₹200  | Edit │   │
│ │ Marble   | [3] m³ | m³   | ₹8000 | Edit │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ (Table with inline editing)                     │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Low Stock Alert Banner** - Shows if any material < threshold
2. **Stats Cards** (3) - Total items, inventory value, low stock count
3. **Search & Filters** - Search, supplier filter, stock level filter
4. **Materials Table** - Inline editable quantity/cost, quick adjust buttons
5. **Actions per row** - Edit (modal), Delete, View Usage

### **Interactions:**
- Click quantity → Edit inline
- Click +/- buttons → Quick adjust quantity
- Edit → Opens modal with all fields
- Delete → Confirmation, then remove from DB
- View Usage → Shows projects using this material

---

## 💵 **SCREEN 9: QUOTATIONS LIST** (`/quotations`)

### **Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Quotations                        [+ New]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ [All] [Draft] [Sent] [Approved] [Rejected]     │
│                                                 │
│ 🔍 Search quotations...                        │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ QUOTE-2025-001                          │   │
│ │ Rajesh Kumar • Temple Lion              │   │
│ │ ₹50,000 • 📋 Draft • Nov 1, 2025       │   │
│ │ [View] [Edit] [Download PDF] [Convert] │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ QUOTE-2025-002                          │   │
│ │ Priya Sharma • Garden Fountain          │   │
│ │ ₹75,000 • ✅ Approved • Oct 25, 2025    │   │
│ │ [View] [Download PDF] [Convert Project]│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

---

## 💵 **SCREEN 10: QUOTATION GENERATOR** (`/quotations/new`)

### **Layout (Scrollable):**
```
┌─────────────────────────────────────────────────┐
│ ← Create Quotation                  [Save]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─── Client & Project ────────────────────┐   │
│ │ Client: [Rajesh Kumar ▼] [+ New Client] │   │
│ │ Project Name: Temple Lion Sculpture      │   │
│ │ Description: (textarea)                  │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Labor ───────────────────────────────┐   │
│ │ Hours: [40] @ ₹[500]/hour               │   │
│ │ Labor Subtotal: ₹20,000                  │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Materials ────────────────────────────┐   │
│ │ Material | Qty | Cost/Unit | Total       │   │
│ │ Bronze   | 10kg| ₹450     | ₹4,500      │   │
│ │ [+ Add Material]                         │   │
│ │ Materials Subtotal: ₹4,500               │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Pricing ─────────────────────────────┐   │
│ │ Subtotal:        ₹24,500                 │   │
│ │ Margin: [●────] 20% = ₹4,900            │   │
│ │                                          │   │
│ │ TOTAL:           ₹29,400                 │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌─── Terms & Conditions ──────────────────┐   │
│ │ (textarea with default T&C)              │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ [Save Draft] [Generate PDF] [Send WhatsApp]    │
│ [Convert to Project] ─────────────────────────►│
│                                                 │
└─────────────────────────────────────────────────┘
│  🏠     📁      👤      💰       📦            │
└─────────────────────────────────────────────────┘
```

### **Components:**
1. **Client & Project** - Client selector, project name/description
2. **Labor Section** - Hours × rate = subtotal
3. **Materials Section** - Dynamic rows, subtotal
4. **Pricing Section** - Subtotal, margin slider (20%), TOTAL
5. **Terms & Conditions** - Editable textarea
6. **Actions** - Save draft, Generate PDF, Send WhatsApp, Convert to Project

### **Interactions:**
- Change hours/rate → Recalculate labor subtotal
- Add material → New row, recalculate materials subtotal
- Adjust margin slider → Recalculate total in real-time
- Save Draft → Save to DB with status='draft'
- Generate PDF → Create quotation PDF
- Send WhatsApp → Generate PDF + open WhatsApp
- Convert to Project → Create project from quotation

---

## 🎨 **DESIGN SYSTEM SUMMARY**

### **Colors:**
- **Background:** Purple gradient (#667eea → #764ba2)
- **Cards:** Glassmorphic (white 10% opacity, backdrop blur)
- **Primary:** Teal/Purple gradient (#667eea → #764ba2)
- **Text:** White (light mode), Dark (dark mode)
- **Success:** Green (#10b981)
- **Error:** Red (#ef4444)
- **Warning:** Orange (#f59e0b)

### **Components:**
- **Cards:** Rounded 16px, glass effect, subtle shadow
- **Buttons:** Rounded 12px, gradient backgrounds, hover lift
- **Inputs:** Rounded 12px, glass background, 48px height
- **Badges:** Rounded full, colored by status
- **Modals:** Centered, glass backdrop, slide-in animation

### **Typography:**
- **H1:** 2.5rem, bold (700)
- **H2:** 1.875rem, bold (700)
- **Body:** 1rem, regular (400)
- **Small:** 0.875rem, medium (500)

### **Spacing:**
- **Gap:** 1rem (16px) between cards
- **Padding:** 1.5rem (24px) inside cards
- **Margin:** 1rem (16px) between sections

---

## 📊 **USER FLOWS**

### **Flow 1: Start Work on Project**
```
Dashboard → Tap "START WORK" → Project Details → Time Tracker running
```

### **Flow 2: Add Project Photo**
```
Project Details → Photos section → Upload → Select files → Add captions → Upload
```

### **Flow 3: Create Invoice from Project**
```
Project Details → "Generate Invoice" → Invoice Generator (pre-filled) → Save
```

### **Flow 4: Track Materials**
```
Project Details → Add Material → Select material → Enter quantity → Add to Project
```

### **Flow 5: Create Quotation**
```
Dashboard FAB → New Quote → Select Client → Add Labor + Materials → Adjust Margin → Generate PDF
```

---

## 🎯 **KEY FEATURES MAP**

### **Dashboard:**
- Today's priority
- Quick stats
- Active projects
- Smart task planner
- Quick actions (FAB)

### **Project Details:**
- Time tracking (START/STOP)
- Task management
- Photo gallery
- Materials tracking
- Client communication

### **Clients:**
- Contact management
- Project history
- Stats tracking
- Quick communication

### **Invoices:**
- Financial tracking
- PDF generation
- Payment status
- Reminders

### **Materials:**
- Inventory management
- Inline editing
- Low stock alerts
- Usage tracking

### **Quotations:**
- Price calculation
- Margin adjustment
- PDF generation
- Convert to project

---

This visual sitemap gives you a complete picture of all 10+ screens, their layouts, components, and how users navigate between them! 🎨🚀
