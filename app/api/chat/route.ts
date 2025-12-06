import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { streamText, convertToCoreMessages } from 'ai'
import {
  coreTools,
  toolCategories,
  getToolsByCategory,
  ToolCategory,
  allTools,
} from '@/lib/tool-groups'
import { saveConversationContext } from '@/lib/context-manager'

export const maxDuration = 300

// Helper to determine which tools to activate based on user message
function determineActiveTools(messages: any[]) {
  const lastMessage = messages[messages.length - 1]
  let content = ''

  if (typeof lastMessage.content === 'string') {
    content = lastMessage.content
  } else if (Array.isArray(lastMessage.parts)) {
    content = lastMessage.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join(' ')
  } else if (Array.isArray(lastMessage.content)) {
    // Handle case where content is an array (e.g. from Vercel AI SDK Core)
    content = lastMessage.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join(' ')
  }

  content = content.toLowerCase()

  // Start with core tools
  let activeTools = { ...coreTools }

  // Check for keywords to activate advanced categories
  const keywords: Record<string, ToolCategory> = {
    // Client management
    client: 'clientManagement',
    customer: 'clientManagement',

    // Project management
    project: 'projectManagement',

    // Task management
    task: 'taskManagement',

    // Scheduling
    schedule: 'scheduling',
    plan: 'scheduling',
    calendar: 'scheduling',
    daily: 'scheduling',

    // Materials & Inventory
    material: 'materials',
    stock: 'materials',
    inventory: 'materials',

    // Vendors
    vendor: 'vendors',
    supplier: 'vendors',
    purchase: 'vendors',

    // Quotations
    quote: 'quotations',
    quotation: 'quotations',
    estimate: 'quotations',

    // Financial (includes invoices and payments)
    invoice: 'financial',
    billing: 'financial',
    payment: 'financial',
    paid: 'financial',
    outstanding: 'financial',
    refund: 'financial',
    tax: 'financial',

    // Reporting
    report: 'reporting',
    analytics: 'reporting',
    profit: 'reporting',
    profitability: 'reporting',
    overview: 'reporting',

    // Context
    context: 'context',
    memory: 'context',
    constraint: 'context',

    // Time tracking
    time: 'timeTracking',
    hour: 'timeTracking',
    clock: 'timeTracking',
    log: 'timeTracking',

    // Intelligence
    intelligence: 'intelligence',
    ai: 'intelligence',

    // Company settings
    company: 'companySettings',
    business: 'companySettings',
    settings: 'companySettings',

    // Documentation
    photo: 'documentation',
    image: 'documentation',
    document: 'documentation',
  }

  // Add tools from matching categories
  Object.entries(keywords).forEach(([keyword, category]) => {
    if (content.includes(keyword)) {
      const categoryTools = getToolsByCategory(category)
      activeTools = { ...activeTools, ...categoryTools }
    }
  })

  // ALWAYS provide all tools - the keyword system was too restrictive
  // The AI model is smart enough to select the right tools based on context
  return allTools
}

export async function POST(req: Request) {
  const { messages, metadata } = await req.json()
  console.log('API: Received messages:', JSON.stringify(messages, null, 2))

  // Get sessionId from metadata (frontend should send this)
  const sessionId = metadata?.sessionId || `session_${Date.now()}`
  const userId = metadata?.userId || 'default-user'

  // Get model from metadata
  const modelId = metadata?.model || 'gemini-2.5-flash'

  // Determine provider dynamically
  let modelProvider
  if (modelId.startsWith('gemini')) modelProvider = google(modelId)
  else if (modelId.startsWith('gpt')) modelProvider = openai(modelId)
  else throw new Error(`Unsupported model: ${modelId}`)

  // Determine active tools for this request
  const activeTools = determineActiveTools(messages)
  console.log(`API: Active tools count: ${Object.keys(activeTools).length}`)

  const result = streamText({
    model: modelProvider,
    system: `You are Sculptor, a highly intelligent and proactive AI assistant for an interior design and construction company.
Your role is to help manage clients, projects, tasks, finances, and materials efficiently.

🧠 CONTEXT AWARENESS & ENTITY RECOGNITION:
- Always reference entities (clients, projects, tasks) mentioned earlier in the conversation
- When user says "update it", "change that", "for them" - infer the entity from recent context
- Use project names or client names from context when calling tools
- Remember what was just discussed and apply actions to those entities

📋 TOOL SELECTION GUIDELINES:

**For Forms vs Direct Actions:**
- When user says "create quotation" WITHOUT item details → use showQuotationFormTool
- When user says "create quotation" WITH all item details → use generateQuotationTool
- When user says "create project" → ALWAYS use showCreateProjectFormTool (show form first)
- When user says "edit quotation QTN-XXX" → use showQuotationFormTool with quotationNumber

**For List Operations:**
- "list all [entities]", "show me [entities]" → ALWAYS call the appropriate listTool (listClientsTool, listProjectsTool, etc.)
- NEVER answer list queries from memory - always call the tool to get fresh data

**For Updates:**
- "update [entity]" mentioned in context → infer entity ID/name from conversation history
- "change status to X" after discussing a task → use updateTaskStatusTool with that task
- "mark as complete" → use appropriate update tool based on entity type

**Natural Language Patterns to Recognize:**
- "create quotation for ABC Corp" → show quotation form with clientName="ABC Corp"
- "list invoices for that client" → use client from recent context
- "update the task status" → infer which task from conversation
- "show me all projects" → call listProjectsTool immediately
- "how's the budget looking?" → call getFinancialDashboardTool

🎯 CRITICAL RULES:

**Project Creation:**
When user asks to create a project (variations: "create project", "new project", "create project for [client]", "create project from [quotation]"):
1. IMMEDIATELY call 'showCreateProjectFormTool' with the client name if provided
2. DO NOT ask for project details - the form handles that
3. DO NOT use createProjectTool directly for user-facing requests

**Data Freshness:**
- ALWAYS call list/get tools when user asks for current information
- Do NOT answer from memory or make assumptions about data
- Trust the tools to provide accurate, up-to-date information

**Execution Limits:**
- Limit tool usage to a MAXIMUM of 5 steps per user request
- Chain related tools logically (e.g., get client → create quotation)
- Be efficient - don't make redundant tool calls

🎨 RESPONSE STYLE:
- Be helpful, concise, and context-aware
- Acknowledge successful operations briefly
- For errors, explain what went wrong and suggest next steps
- Use natural, conversational language`,
    messages: convertToCoreMessages(messages),
    tools: activeTools,

    // Save context after each message
    onFinish: async ({ text, finishReason }) => {
      try {
        // Convert messages to context-manager format
        const contextMessages = messages.map((msg: any) => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date().toISOString(),
        }))

        // Add AI response
        contextMessages.push({
          role: 'assistant',
          content: text || '',
          timestamp: new Date().toISOString(),
        })

        await saveConversationContext(sessionId, contextMessages, userId)
        console.log('✅ Context saved to DB')
      } catch (error) {
        console.error('❌ Error saving context:', error)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
