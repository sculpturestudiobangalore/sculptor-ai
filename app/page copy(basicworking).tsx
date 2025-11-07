'use client'

import { Send, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!input.trim() || isLoading) return

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: input,
  }

  const updatedMessages = [...messages, userMessage]
  setMessages(updatedMessages)
  setInput('')
  setIsLoading(true)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) throw new Error('API error')

    if (!response.body) throw new Error('No response body')
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let messageAdded = false
    const aiMessageId = (Date.now() + 1).toString()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk

      if (!messageAdded) {
        setMessages((prev) => [...prev, {
          id: aiMessageId,
          role: 'assistant',
          content: chunk,
        }])
        messageAdded = true
      } else {
        setMessages((prev) => {
          const updated = [...prev]
          const lastMsg = updated[updated.length - 1]
          if (lastMsg?.id === aiMessageId) {
            lastMsg.content += chunk
          }
          return updated
        })
      }
    }
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      },
    ])
  } finally {
    setIsLoading(false)
  }
}


  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <div className="border-b border-purple-700 bg-purple-900/50 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Sculpture AI</h1>
            <p className="text-sm text-purple-300">Your intelligent workshop assistant</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-purple-700 text-purple-100 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-purple-700 p-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-purple-700 bg-purple-900/50 backdrop-blur p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-purple-800 text-white placeholder-purple-400 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white font-medium"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
