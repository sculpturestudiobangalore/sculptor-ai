import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { streamText, convertToModelMessages } from 'ai'
import { aiTools } from '@/lib/ai-tools/index'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, metadata } = await req.json()

  // Get model from metadata (sent from frontend)
  const modelId = metadata?.model || 'gemini-2.5-flash'

  // Determine provider dynamically
  let modelProvider
  if (modelId.startsWith('gemini')) modelProvider = google(modelId)
  else if (modelId.startsWith('gpt')) modelProvider = openai(modelId)
  else throw new Error(`Unsupported model: ${modelId}`)

  const result = streamText({
    model: modelProvider,
    messages: convertToModelMessages(messages),
    tools: aiTools,
  })

  return result.toUIMessageStreamResponse()
}
