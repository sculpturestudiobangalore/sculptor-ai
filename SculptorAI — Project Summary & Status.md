SculptorAI — Project Summary & Status

1. Project Objective
   SculptorAI is an AI-driven conversational business and workflow management system specifically designed for a one-person sculpting, metalwork fabrication business. The goal is to replace traditional dashboards, spreadsheets, and manual scheduling with an intuitive conversation-first interface powered by generative AI and dynamically rendered UI components.

Key Functional Capabilities:
Client onboarding and management

Project planning and costing

Daily task scheduling with dependencies

Inventory management and material procurement

Dynamic quotation and invoice generation

Real-time conversational interaction with AI

Generative UI components like charts, cards, forms, invoice previews embedded inside chat

2. Tools Created
   Currently, the project includes a total of 26 specialized AI tools categorized as:

Category Tools
Client Management createClientTool, updateClientTool, listClientsTool, getClientTool, validateClientDataTool
Project Management createProjectTool, listProjectsTool, getProjectDetailsTool, updateProjectTool, addProjectMaterialTool, updateTaskProgressTool, closeProjectTool
Task Management createTaskTool, listTasksTool, getTaskProgressTool
Material Inventory viewInventoryTool, addMaterialPurchaseTool, viewMaterialUsageReportTool, checkReorderAlertsTool
Financial Operations addQuotationItemTool, createQuotationWithItemsTool, generateInvoiceWithItemsTool, generateQuotationPDFTool, generateInvoicePDFTool, recordPaymentTool, financialReportTool 3. Tech Stack & Versions
Layer Technologies & Versions
Frontend Next.js 14, React, AI SDK v5 (Vercel)
Styling Tailwind CSS v4
Backend Vercel Edge Functions, Supabase
Database & Authentication Supabase (Postgres + Auth)
AI Models Gemini 2.5 (Free), optional OpenAI/Anthropic for heavier tasks
UI Components AI Elements (shadcn/ui), Streamdown Markdown Renderer
File Parsing & OCR Gemini Vision, Perplexity AI
Speech-to-Text Web Speech API (planned)
Deployment Vercel + Supabase 4. Done So Far
Full Next.js app with AI SDK v5 chat integration

Conversational interface with text + voice input (UI placeholders)

Dynamic message rendering including tool outputs

Integrated 26 business-specific AI tools

API route managing chat requests and tool execution

Tailwind v4 with proper config and modern UI components

Responsive design, mobile optimized with no scroll issues

File upload UI and framework for camera capture (backend hookup pending)

Comprehensive SQL schema for Supabase

Prompt engineering with strict JSON schemas and action validation

Idempotency and safe execution patterns in backend

Operational background jobs planned (cron tasks)

5. Pending Tasks & Roadmap
   Item Status Priority Notes
   Supabase Database Deployment Incomplete High Run SQL migrations, create tables, RLS policies
   User Authentication Setup Not started High Email/OTP login integration
   File Upload Backend Hookup Partially done Medium Connect UI upload to Supabase storage
   Voice Input Audio Processing Not started Medium Complete Web Speech API + fallback
   Conversation History Not started High Save/load messages from DB
   PDF Invoice Generation Not started Medium Dynamic PDF generation from chat data
   Daily Scheduling & Alerts Planned Medium Cron jobs for plans, reorders, reminders
   UI Advanced Features Partial Low Reasoning interface, message branching, file previews
   Testing & Deployment Planned High Unit, integration, E2E tests, Vercel deployment
6. Architecture Overview
   User Interaction: Voice or text input → AI extraction prompt + memory context

AI Layer: Gemini 2.x for extraction; OpenAI/Anthropic for planning and reasoning

Backend: Vercel Edge Functions, calling AI, validating & executing DB transactions securely

Database: Supabase Postgres with RLS and audit logging

Client Rendering: Dynamic generative UI powered by AI tool invocations in chat messages

7. Next Recommended Steps
   Deploy database schema and run migrations

Set up user authentication (Supabase)

Hookup file upload UI to Supabase Storage

Implement conversation history persistence

Integrate voice input end-to-end

Create PDF invoice generation workflow

Build scheduled background jobs and notifications

Additional Features Mentioned in Chat History and Project Scope

1. AI Daily Planner (Scheduler)
   AI-powered daily/weekly scheduling assistant

Generates task schedules automatically balancing project and material delivery timelines

Supports sending reminders and updates (e.g., WhatsApp notifications planned)

Uses AI to optimize task deadlines and resource allocation dynamically

Implemented as a cron job triggered backend component (planned but not done yet)

2. Context-Aware Chat
   The chat maintains deep conversation context via memory middleware or database fact retrieval

Allows long-term memory integration with project/client/task information for personalized responses

Incorporates context windows so the AI does not forget previous conversations or workspace states

Supports dynamic context truncation to fit model input size constraints

3. Chat History and Persistence
   Store and retrieve complete chat conversations from Supabase

Support for multiple conversations, loaded on user request

Enables users to refer to previous quotes, projects, materials in chat history

Foundation for future features like collaborative chat or team access

4. Financial and Inventory Report Generation
   Financial reports auto-generated on demand by AI tools

Inventory reorder alert reports to anticipate stock needs

Summarized PDF reports integrated into chat UI (planned)

5. File & Voice Integration
   File uploads integrated with Supabase Storage backend

Voice input realized via Web Speech API & Whisper fallback

Supports parsing attachments like invoices or material specs via vision AI (Gemini Vision)

Future support for voice commands and dictation in chat

6. AI-Driven Generative UI Components
   AI generates dynamic UI cards, timelines, charts inside chat representing projects/tasks status

Allows users to interact with visually generated plans and documents

These interactive components can trigger AI tools or workflows dynamically

Summary
Feature Status Importance
Chat History & Persistence Planned High
AI Daily Planner (Cron) Planned Medium
Context-Aware Memory Planned High
File Upload Backend Hookup Partial Medium
Voice Input Integration Partial Medium
AI Generative UI Elements Planned Low-High
PDF Generation (Invoices) Planned Medium
Financial / Inventory Reports Planned Medium

Here's a detailed list of all the AI tools planned for SculptorAI along with their current implementation status, compiled diligently from our entire chat history and all references:

AI Tools Overview for SculptorAI

1. Total Planned AI Tools: 60+
   We initially planned to combine and implement over 60 AI tools across all aspects of workshop management.

2. Categories and Tools
   Category Tools Planned (Short Description) Tools Implemented (Count) Tools Pending
   Client Management Tools to create, update, list, get, and validate clients. E.g., createClientTool automates client onboarding, validateClientDataTool checks data integrity. 5 0
   Project Management Create and manage projects, update materials, track progress, and close projects. Tools like createProjectTool, updateProjectMaterialTool. 7 ~5
   Task Management Handle task creation, updating, progress monitoring. Includes createTaskTool, updateTaskTool, listTasksTool, getTaskProgressTool. 4 ~3
   Material Inventory View and add inventory, check reorder alerts, and generate usage reports. Exemplified by addMaterialPurchaseTool, checkReorderAlertsTool. 5 ~5
   Financial Operations Automate quotations, invoice generation, payment recording, and financial reports. Includes addQuotationItemTool, generateInvoicePDFTool, recordPaymentTool. 6 ~10
   Daily Planning & Scheduling AI planner for daily/weekly scheduling optimizing project timelines and tasks. Planned as an advanced AI tool, not yet implemented. 0 5+
   Contextual Memory & Chat History Maintain conversation context for personalized AI responses and save/load chat history from DB for continuity. Partial 5+
   File & Voice Tools Support file uploads (invoices, images) and voice input with transcription using services like Gemini Vision and Whisper. Partial 5
3. Summary of What Is Done vs Pending
   Status Description Estimated Number
   Fully Implemented Core workshop tooling for clients, projects, tasks, inventory, and financial functions. ~22
   Partially Done Backend and UI framework for file upload and voice input controls, but partial integration with services still required. 2
   Planned/Pending Advanced contextual memory, chat history persistence, AI daily planner, PDF generation, full voice input pipeline, alert systems. 33+
4. Examples of Key Tools
   Tool Name Description
   createClientTool Automates client onboarding and validates client data.
   updateProjectMaterialTool Adds or updates project materials for ongoing projects.
   recordPaymentTool Records payments and updates financial history in the system.
   checkReorderAlertsTool Checks inventory levels and alerts for reordering materials before they run low.
   generateInvoicePDFTool Generates PDF invoice documents from work done and materials used.
   dailyTaskPlanner Planned intelligent AI to plan daily work schedules optimizing time and resources.
   chatMemoryTool Keeps track of conversation history for context-aware AI responses.
   fileUploadTool Supports user file uploads with image/PDF parsing via Gemini Vision.
5. Next Steps in AI Tool Development
   Finalize daily planner AI tool including cron job scheduling and notifications.

Complete chat history management with persistent storage.

Fully integrate file upload and voice input FEATURES with backend and frontend.

Develop PDF generation and financial report automation tools.

Introduce advanced AI context tools like reasoning display, branching, and suggestions.

6. Summary
   You have a solid core of 22 AI tools implemented already, covering all essential business tasks.

Around 33+ AI tools remain, focusing on advanced AI planning, chat experience enhancements, and integrations like voice/file upload.

Your ai-tools.ts manages all tools; backend handles tool invocation generically.

Frontend chat UI renders responses and tool outputs dynamically, no code changes needed for individual tool addition.
