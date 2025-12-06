PROJECT REPORT

Project Name: SculptorAI – Intelligent Business & Workflow Management System
Client: [Client Name] – Sculpting / Metalwork / Art Fabrication
Project Lead / Developer: [Your Name]
Date: [Insert Date]


---

 1.⁠ ⁠Project Overview

SculptorAI is an AI-driven business management platform designed specifically for a one-man sculpting and fabrication business. The goal is to replace traditional dashboards, spreadsheets, and manual scheduling with a conversation-first interface powered by generative AI and dynamic UI rendering.

The application allows the user to simply talk to the system to create and manage:

Client onboarding

Project planning and costing

Daily task scheduling

Inventory management and material procurement

Quotation & invoice generation


Instead of traditional screens, the system dynamically generates UI components (graphs, documents, cards, forms, invoice previews) inside a chat interface.


---

 2.⁠ ⁠Problem Statement

The client manages multiple sculpting projects simultaneously, each with varying materials, drying/welding cooldown periods, labor availability, and unpredictable dependencies. Traditional project management apps fail because:

Too many variables to model manually

Projects don’t follow linear task flows

Switching between projects is frequent and unpredictable

Manual inventory tracking leads to delays and cost miscalculations

Generating quotes and invoices consumes significant time


The client desires a single place to manage work without interacting with complex UI screens.


---

 3.⁠ ⁠Objectives

Category	Objective

Operational Efficiency	Automate day-to-day scheduling and task planning through AI reasoning.
Business Management	Auto-generate quotations, invoices, and material purchase lists.
Inventory Accuracy	Track inventory usage automatically when tasks require materials.
User Experience	Replace dashboards with a conversational interface + generative UI.



---

 4.⁠ ⁠Scope of Work

Core Features

 1.⁠ ⁠Conversational AI Interface

Speech-to-text and text-to-speech interaction

Natural language project updates (“start work on Wolf sculpture today”)



 2.⁠ ⁠Project Management

Track multiple active projects

Automatically break projects into tasks

Suggest optimal order of execution based on drying/cooling/curing conditions



 3.⁠ ⁠Inventory + Procurement

Upload bill/invoice images → AI extracts data

Auto-deduct materials when tasks are executed

Suggest material purchase based on inventory levels



 4.⁠ ⁠Quotations & Invoices

Generate PDF quotation or invoice from spoken input: “Generate a quotation for brass eagle sculpture, 3ft, finished bronze.”



 5.⁠ ⁠Daily Schedule Generation

“What do I work on today?” → dynamic task list



 6.⁠ ⁠Generative UI

Instead of text-only responses, AI returns UI components such as:

Graphs (project progress, daily hours)

Cards (project summaries, inventory alerts)

Forms (quotation template preview)

Image previews (bill scanning result)






---

 5.⁠ ⁠Architecture

Frontend

Next.js (Vercel)

Vercel AI SDK (Generative UI + useChat + streaming responses)

Upload support (camera / file picker)

Dynamic UI rendering based on AI tool calls


Backend

Component	Role

Supabase (free tier)	Database, authentication, file storage
Vercel Edge Functions	API logic, tool invocation handlers
Optional paid model (OpenAI)	Complex reasoning and long context processing
Gemini / Perplexity (free)	Secondary tasks like OCR, summarization


Data Flow

 1.⁠ ⁠User speaks or types:
“Add new client, Rohan. New project: Brass wolf sculpture.”


 2.⁠ ⁠AI interprets request


 3.⁠ ⁠Calls functions for database insertion


 4.⁠ ⁠UI component is dynamically generated (client card, project summary card)




---

 6.⁠ ⁠Technology Stack

Layer	Technology

UI Framework	Next.js 14 / React
Conversational AI	Vercel AI SDK V5 ONLY
Models	Gemini (free) + optional OpenAI
DB / Auth	Supabase
File Parsing / OCR	Gemini Vision 
Deployment	Vercel + Supabase



---

 7.⁠ ⁠Timeline (Estimated)

Phase	Deliverables	Duration

Phase 1	Project setup, DB design, conversational architecture	1 week
Phase 2	Project & inventory management tools	2 weeks
Phase 3	Quotation, invoice automation	1 week
Phase 4	Generative UI enhancements (charts, cards)	1–2 weeks
Phase 5	Testing + deployment	1 week


Total Estimated Duration: 5–7 weeks


---

 8.⁠ ⁠Success Metrics

Metric	Target

Time saved on planning	70% reduction
Time to generate quotation	< 30 seconds
Inventory errors	0% missing material surprises
User dependence on dashboards	Replaced with single conversational flow



---

 9.⁠ ⁠Future Enhancements (optional)

WhatsApp integration for client updates

AI cost prediction based on material rates and project history

Time estimation using supervised learning on past projects



---

10.⁠ ⁠Conclusion

SculptorAI transforms chaotic, multi-project, nonlinear sculpting workflows into a streamlined conversational assistant powered by generative UI with real-time data integration.

The system acts as a:

Project manager

Inventory controller

Business admin

AI co-pilot and personal assistant


All accessed from a single AI conversation, not a maze of dashboards.


Architecture & Technical Documentation

Project: SculptorAI — Conversational Business OS for Sculptors
Audience: Engineers, Architects, DevOps, Product Managers
Style: Professional technical documentation (actionable, copy-paste ready).


---

1 — System Overview (one line)

User talks or uploads → AI interprets intent → Server validates & executes actions against Supabase → AI crafts user-facing responses and dynamic UI tool invocations → client renders conversational + generative UI components.


---

2 — High-level Components

1.⁠ ⁠Frontend (Next.js + Vercel AI SDK)

Chat UI (text + voice input + camera + file upload)

Tool renderer for generative UI components (cards, charts, PDF preview) sdk V5 compatible

Minimal “Today” snapshot view (generated by AI)



2.⁠ ⁠API / Orchestration (Vercel Serverless / Edge Functions)

POST /api/message — central message handler

Tool endpoints: /api/tools/generate-pdf, /api/tools/upload-image, /api/tools/generate-chart

Worker endpoints / Cron triggers: /api/cron/daily-plan, /api/cron/reorder-check



3.⁠ ⁠AI Layer

Primary: Gemini (or selected provider) for parsing/extraction & general replies

Premium model (OpenAI / Anthropic) for heavy planning (plan_day, multi-project scheduling)

Prompt library (extraction, planner, memory summarizer, confirmation)



4.⁠ ⁠Database & Storage (Supabase)

Postgres tables: clients, projects, tasks, inventory, project_materials, invoices, files, logs, memories, users, agent_actions

Storage: Supabase Storage for uploaded images & generated PDFs



5.⁠ ⁠Background / Workers

Scheduled tasks (reorder checks, daily plans, email reminders)

Job queue (lightweight): e.g., use Supabase Functions or Vercel Cron



6.⁠ ⁠Monitoring & Observability

Logs: application + AI responses + DB writes

Metrics: AI calls, tokens, rate of clarifications, undo rates, failed parses





---

3 — Data Model (SQL schema ready)

Below are concise SQL table definitions (Postgres / Supabase). Use UUIDs.

-- Enable uuid extension
create extension if not exists "uuid-ossp";

-- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  title text NOT NULL,
  status text DEFAULT 'active', -- active, paused, completed
  priority int DEFAULT 5,
  deadline timestamptz,
  estimated_hours numeric,
  created_at timestamptz DEFAULT now()
);

-- tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  estimated_minutes int,
  status text DEFAULT 'todo', -- todo, in_progress, done
  dependencies jsonb DEFAULT '[]'::jsonb, -- array of task ids
  notes text,
  created_at timestamptz DEFAULT now()
);

-- inventory
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text,
  reorder_level numeric DEFAULT 0,
  supplier_info jsonb,
  created_at timestamptz DEFAULT now()
);

-- project_materials
CREATE TABLE project_materials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES inventory(id),
  quantity_required numeric,
  created_at timestamptz DEFAULT now()
);

-- invoices
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id),
  user_id uuid REFERENCES users(id),
  amount numeric,
  status text DEFAULT 'draft', -- draft, sent, paid
  due_date timestamptz,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- files
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  project_id uuid,
  invoice_id uuid,
  file_url text NOT NULL,
  file_type text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- logs (append-only)
CREATE TABLE logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  user_message text,
  ai_json jsonb,
  action_executed jsonb,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

-- memories (short facts)
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  key text,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- agent_actions (for audit & idempotency)
CREATE TABLE agent_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  idempotency_key text UNIQUE,
  action jsonb,
  executed boolean DEFAULT false,
  executed_at timestamptz
);


---

4 — Canonical JSON action schema (strict)

When sending user text to the model, require model to return only a JSON object that matches:

{
  "action":"string",            // one of allowed actions
  "idempotency_key":"string",   // uuid generated client-side
  "data": { },                  // action-specific payload
  "confidence": 0.0,            // 0.0 - 1.0 (optional)
  "clarify": null               // null or question string to ask user
}

Allowed actions (minimum):

create_client

create_project

add_task

reschedule_task

plan_day

update_inventory

reorder_inventory

generate_invoice

generate_quotation

attach_file

query_status (user asks for summary)


Example (add task):

{
  "action":"add_task",
  "idempotency_key":"uuid-v4",
  "data": {
    "project_id":"proj-uuid",
    "title":"Sand wolf sculpture (fine)",
    "earliest_start":"2025-11-05T18:30:00+05:30",
    "estimated_minutes":90,
    "notes":"After clay dries for minimum 4 hours"
  },
  "confidence":0.91,
  "clarify":null
}

If clarify is non-null, the server should not execute any DB write and should ask user for clarification.


---

5 — Interaction Flow (sequence text diagram)

1.⁠ ⁠User → Frontend: voice/text/image


2.⁠ ⁠Frontend: transcribe audio (Web Speech API) → create message object + idempotency_key


3.⁠ ⁠Frontend → /api/message: send { user_id, idempotency_key, text, attachments }


4.⁠ ⁠Server → AI (Gemini): sends system prompt + convoSummary + recent relevant records + user message


5.⁠ ⁠AI → Server: returns JSON action


6.⁠ ⁠Server:

validate action schema

check idempotency (agent_actions)

if clarify → return to frontend and log

run business validation (inventory, conflicts)

if destructive or low confidence → ask confirmation

execute DB transaction(s)

insert into logs and mark agent_action as executed



7.⁠ ⁠Server → AI (optional): craft human reply (friendly / personality)


8.⁠ ⁠Server → Frontend: reply + tool invocations (render chart, show file)


9.⁠ ⁠Frontend: render message + dynamic UI element (chart, PDF thumbnail, card)




---

6 — Prompt Templates (strict, copy-paste ready)

6.1 Extraction (system prompt — send on every user message)

SYSTEM: You are an operations extraction agent. The user speaks naturally. Output MUST be valid JSON ONLY and conform to the schema:
{ "action": "...", "idempotency_key": "...", "data": { ... }, "confidence": 0.0, "clarify": null }
Allowed actions: create_client, create_project, add_task, reschedule_task, plan_day, update_inventory, reorder_inventory, generate_invoice, generate_quotation, attach_file, query_status.
If required info is missing, do NOT guess: set "clarify" to a short question asking the missing information. Examples follow in EXAMPLES section.

6.2 Planner prompt (use premium model)

SYSTEM: You are a schedule optimizer for a one-person fabrication business. Input: user_id, list of active projects with tasks (including durations, dependencies, cooling/drying periods), current inventory, labor availability windows, and urgent deadlines. Output: JSON object { "plan": [ { "task_id", "start_time", "end_time", "notes } ], "conflicts": [ ... ], "recommendations": [ ... ] }. Optimize to maximize deadline compliance and minimize task switches. Consider drying/cooling windows and material availability. If impossible, propose trade-offs.

6.3 Memory summarizer (calls at session end)

SYSTEM: Summarize the last session into 1-4 short bullet facts the system should remember long-term for this user. Use simple phrases like "prefers morning welding" or "supplier X: 7-10 day lead". Output JSON: { "memories": ["...","..."] }.

6.4 Confirmation/Reply generator

SYSTEM: Given executed action and result (db rows), craft a short friendly user-facing reply (2-3 sentences) confirming what was done. If an action failed, explain why and provide next steps.


---

7 — Server / API Implementation (example)

Below is a simplified TypeScript/Node (Next.js API route) pseudocode example for /api/message.

// pages/api/message.ts
import { NextApiRequest, NextApiResponse } from "next";
import { callGemini } from "../../lib/ai";
import { supabaseAdmin } from "../../lib/supabaseAdmin"; // server-side Supabase client
import { validateAction } from "../../lib/validation";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, text, attachments, idempotencyKey } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "missing params" });

  // 1. Build context: recent memories + relevant projects/tasks
  const convoSummary = await buildConvoSummary(userId);

  // 2. Call AI extraction model
  const prompt = buildExtractionPrompt(convoSummary, text, idempotencyKey);
  const aiRaw = await callGemini(prompt);

  // Parse JSON - enforce only JSON
  let aiObj;
  try {
    aiObj = JSON.parse(aiRaw);
  } catch (e) {
    return res.json({ reply: "I couldn't understand that. Can you rephrase?" });
  }

  // 3. Validate schema
  const valid = validateAction(aiObj);
  if (!valid) return res.json({ reply: "I couldn't extract a valid action. Can you rephrase?" });

  // 4. Idempotency
  const existing = await supabaseAdmin.from("agent_actions").select("*").eq("idempotency_key", aiObj.idempotency_key).maybeSingle();
  if (existing.data) {
    return res.json({ reply: "Action already processed." });
  }

  // Insert agent_action (tentative)
  await supabaseAdmin.from("agent_actions").insert({ user_id: userId, idempotency_key: aiObj.idempotency_key, action: aiObj, executed:false });

  // 5. If clarify -> return question
  if (aiObj.clarify) {
    await supabaseAdmin.from("logs").insert({ user_id: userId, user_message: text, ai_json: aiObj });
    return res.json({ reply: aiObj.clarify });
  }

  // 6. Execute action with business validations inside a transaction
  const result = await executeAction(aiObj, userId);
  // log result
  await supabaseAdmin.from("logs").insert({ user_id: userId, user_message: text, ai_json: aiObj, action_executed: aiObj, result });

  // mark action executed
  await supabaseAdmin.from("agent_actions").update({ executed:true, executed_at: new Date() }).eq("idempotency_key", aiObj.idempotency_key);

  // 7. Craft a user-facing reply (optionally via AI)
  const reply = await callGeminiForReply(aiObj, result);
  return res.json({ reply, result });
}

Notes:

executeAction must perform DB writes with checks (inventory sufficiency, task conflict detection, etc) and return structured result.

Never allow raw AI to run arbitrary SQL or file operations.



---

8 — UI Design & Generative UI mapping

Chat Message Types

text — plain conversational reply

tool — AI requests a UI tool. Example tool: { name: "chart", payload: {...} }

action_confirmation — small badge with Undo / Edit

file_preview — PDF thumbnail + download

image_card — extracted OCR key-value pairs with action buttons


Tools to implement on client

1.⁠ ⁠renderChart(payload) — bar/line/pie; uses lightweight chart library (chart.js) rendering inside chat bubble.


2.⁠ ⁠fileViewer({url}) — PDF viewer thumbnail + open.


3.⁠ ⁠imageAnalyzerPreview({ocrResults}) — show extracted fields with buttons: “Create Invoice / Add to Inventory / Ignore”.


4.⁠ ⁠taskTimelineView({tasks}) — small timeline UI generated for today’s schedule.



Generative UI Flow

AI returns JSON with tool_invocation type.

Client maps tool_invocation.name to a React component and renders with payload.



---

9 — Voice & Image Handling

Voice

Use Web Speech API for client-side STT (fast, free). For unsupported browsers, record short audio blob and send to server for transcription (use Whisper or Gemini audio model).

Flow: audio → text → call /api/message with idempotency_key.


TTS

Use browser speechSynthesis for short replies. For richer voice, use provider if desired.


Images

Upload captured image to Supabase Storage via signed upload token (client-side).

Once stored, call OCR/vision model to extract structured items (date, vendor, amount, material lines). Store extraction in files.metadata and optionally auto-create inventory or invoices.



---

10 — Scheduling & Background Jobs

Daily Plan Cron

Daily (e.g., 3 AM local): call plan_day agent to generate next day schedule; store tasks and notify user.


Reorder Check Cron

Run hourly/daily: query inventory where quantity <= reorder_level, create reorder_inventory suggestions, notify via chat.


Delayed tasks

When user says “remind me in 4 hours,” server creates scheduled row and uses cron to push notification at that time.


Implement via either:

Vercel Cron (lightweight) + serverless endpoints, or

Supabase Edge Functions + scheduled triggers.



---

11 — Security, Privacy & Compliance

Auth: Supabase Auth (email/OTP). JWT used for API auth.

Least Privilege: Server uses Supabase service role keys; client uses row-level security (RLS) for user data.

Encryption: TLS in transit. Supabase handles encryption at rest.

Data deletion: expose "forget me" endpoint to purge memories, logs, and user data.

Logging policy: logs contain PII only when necessary. Optionally redact sensitive fields.

Rate limiting: server-side per-user rate limits to prevent runaway AI costs.

Audit: agent_actions and logs provide full audit trail of AI suggestions vs executed actions.

GDPR: provide data export & deletion endpoints.



---

12 — Observability & Metrics

Track:

API calls per endpoint

AI calls per action type (extraction, planner, reply)

Tokens used per model & cost estimation

Clarify rate (how often AI asks for missing info)

Undo/rollback rate

Failed writes / exceptions

User retention & active daily users


Tools: Vercel Analytics, Supabase logs, Sentry for errors, Prometheus + Grafana optional.


---

13 — Testing Strategy

Unit tests

Validate validateAction for many malformed inputs.

Test executeAction business logic with mock DB (Jest).


Integration tests

Simulate full flow: text→AI mock→API→DB→reply. Use recorded AI responses.


Fuzz tests

Large variety of user natural language variants to ensure extraction prompt resilience.


E2E tests

Puppeteer or Playwright to test chat UI (text, voice simulation, file upload).


Manual

Build a test corpus of transcripts and run nightly checks to ensure prompt continues extracting correct JSON.



---

14 — Operational Considerations & Scaling

Start small: Vercel free tier + Supabase free tier, Gemini free. Use premium model only for plan_day.

Cache common replies and plan_day results for 24 hours (unless user edits).

Partition users by tenant to limit blast radius.

If usage grows:

Move heavy background jobs to dedicated worker (e.g., AWS Fargate, Fly.io).

Use dedicated DB cluster (Supabase paid plan).

Introduce queue (Redis/RabbitMQ) for idempotent job processing.




---

15 — Rollback & Undo Patterns

All changes must be transactional and logged (insert into logs with action_executed and before/after snapshots).

Provide quick "Undo last AI action" that reads last agent_actions executed and reverses DB changes using stored inverse operations or snapshots.

Maintain soft-deletes (boolean deleted_at) for critical records with a retention window.



---

16 — Example Prompts & Exemplars (practical)

Extraction Prompt (compact with examples):

SYSTEM: Output ONLY JSON and follow schema. Allowed actions: create_client, create_project, add_task, reschedule_task, plan_day, update_inventory, reorder_inventory, generate_invoice, generate_quotation, attach_file, query_status.

EXAMPLE 1:
User: "New client Rohan. Make a 3ft brass eagle due Jan 15, materials: brass sheets 10kg."
JSON: { "action":"create_project", "idempotency_key":"...", "data": { "client_name":"Rohan", "title":"Brass eagle", "deadline":"2026-01-15", "materials":[{"name":"brass sheets","qty":10,"unit":"kg"}] }, "confidence":0.95, "clarify":null }

If missing info, set "clarify":"What is X?" and do NOT guess.

Planner Prompt (example instruct):

Provide projects, tasks, drying/cooling rules, labor windows → output day plan optimized.



---

17 — Minimal MVP Checklist (deliver in 7–14 days)

[x] Supabase schema + auth

[x] Next.js minimal chat UI (text only)

[x] /api/message extraction flow (Gemini mock)

[x] create_client, create_project, add_task handlers

[x] Logs & idempotency

[x] Upload & store images (Supabase)

[x] Memory summarizer job

[ ] Voice STT fallback (Web Speech API)

[ ] Planner using premium model

[ ] Generative UI tool rendering (charts, cards)

[ ] Invoice PDF generator

[ ] Cron jobs (daily plan & reorder)



---

18 — Deliverables I can produce next (pick one)

Full Next.js + Supabase starter repo scaffold (with endpoints & sample prompts)

Exact extraction prompt with 12 exemplars and negative examples

Plan_day premium prompt and example input/output (complex constraint solving)

Example Next.js chat component using Vercel AI SDK + tool renderer

A ready-to-run SQL migration file and seed data for testing


Tell me which deliverable you want now and I’ll generate it immediately.