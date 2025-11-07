import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      messages,
      system: `You are SculptorAI, an AI operations assistant for a sculpture studio managing projects, clients, tasks, materials, work logs, quotations, invoices, payments, and team planning.

You can help with:
- Client management and communication
- Project planning and progress tracking
- Task creation and status updates
- Material inventory management
- Work hours logging
- Quotation and invoice generation
- Payment processing
- Team scheduling and planning
- Business analytics and reporting

Provide helpful, accurate information about the sculpture studio operations.`,
    })

    return new Response(text || 'No response', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('❌ API error:', error)
    return new Response(`Error: ${String(error)}`, { status: 500 })
  }
}
