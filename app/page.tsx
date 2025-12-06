'use client'

import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import ToolCard from '@/components/tool-card'
import BatchToolResultCard from '@/components/cards/BatchToolResultCard'
import { loadConversationContext, saveConversationContext, Message } from '@/lib/context-manager'
import {
  Sparkles,
  Paperclip,
  Mic,
  Camera,
  X,
  Send,
  StopCircle,
  FileText,
  User,
  Bot,
  Settings,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & efficient', icon: '⚡' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning', icon: '🔮' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Balanced performance', icon: '🎯' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Lightweight & quick', icon: '💨' },
]

type SubmitPayload = {
  text?: string
}

type SpeechRecognitionResultItem = {
  [index: number]: { transcript: string }
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultItem>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  onstart: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  start: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const getSpeechRecognitionCtor = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === 'undefined') return undefined

  const extendedWindow = window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor
    SpeechRecognition?: SpeechRecognitionConstructor
  }

  return extendedWindow.SpeechRecognition ?? extendedWindow.webkitSpeechRecognition
}

type ToolMessagePart = {
  type: string
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  output?: unknown
  input?: unknown
}

// TOOLS TO HIDE FROM UI stream (The Invisible Brain)
const HIDDEN_TOOLS = [
  'saveContextMemoryTool',
  'retrieveContextMemoryTool',
  'searchContextMemoryTool',
  'invalidateScheduleCacheTool',
  'optimizeTaskOrderTool', // Often internal
]

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('sculpture-ai-session')
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('sculpture-ai-session', sid)
      }
      return sid
    }
    return `session_${Date.now()}`
  })

  // Load context on mount
  useEffect(() => {
    async function load() {
      if (sessionId) {
        const history = await loadConversationContext(sessionId)
        if (history.length > 0) {
          // @ts-ignore - Vercel AI SDK types mismatch but this is valid for initialMessages
          console.log('Restoring context:', history.length, 'messages')
        }
      }
    }
    load()
  }, [sessionId])

  // Initialize chat with persistence saving
  // NOTE: We do not pass initialMessages here to avoid hydration errors.
  // Instead we rely on the DB sync for "Memory" and start fresh in UI for now.
  const { messages, sendMessage, status, error, stop } = useChat({
    onFinish: (message) => {
      // Save full context to DB
      // We reconstruct the array to be safe
      const msgsToSave: Message[] = [
        // @ts-ignore
        ...messages.map(m => ({ role: m.role as any, content: m.content })),
        // @ts-ignore
        { role: 'assistant', content: message.content }
      ]
      saveConversationContext(sessionId, msgsToSave)
    }
  })

  const isStreaming = status === 'submitted' || status === 'streaming'

  // Remove file handler
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Autoscroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // File upload handler
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length + attachedFiles.length > 5) {
      toast.error('Maximum 5 files allowed')
      return
    }
    setAttachedFiles((prev) => [...prev, ...acceptedFiles])
    toast.success(`${acceptedFiles.length} file(s) attached`)
  }

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    maxSize: 10485760, // 10MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
    },
    noClick: true,
    noKeyboard: true,
  })

  // Voice recording (Web Speech API)
  const startRecording = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor()
    if (!SpeechRecognitionCtor) {
      toast.error('Voice input not supported in this browser')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = (event: Event) => {
      void event
      setIsRecording(true)
    }

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const result = event.results[0] as SpeechRecognitionResultItem | undefined
      const transcript = result?.[0]?.transcript
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      }
      setIsRecording(false)
    }

    recognition.onerror = (event: Event) => {
      void event
      toast.error('Voice recognition failed')
      setIsRecording(false)
    }

    recognition.onend = (event: Event) => {
      void event
      setIsRecording(false)
    }

    recognition.start()
  }

  // Submit handler
  const handleSubmit = (message?: SubmitPayload) => {
    const text = message?.text ?? input
    if (!text.trim() && attachedFiles.length === 0) return

    sendMessage({
      text,
      metadata: {
        model: selectedModel,
        files: attachedFiles.map((f) => f.name),
        sessionId: sessionId,
        userId: 'default-user'
      },
    })
    setInput('')
    setAttachedFiles([])
  }

  // Consolidated Tool Action Handler
  const handleToolAction = (action: string, data: any) => {
    if (action === 'submitMessage') {
      handleSubmit({ text: data })
      return
    }
    const prompts: Record<string, string> = {
      viewClient: `Show full details for client ID: ${data}`,
      viewProject: `Show complete project details for ID: ${data}`,
      viewTasks: `List all tasks for project ID: ${data}`,
      viewMaterials: `Show material usage for project ID: ${data}`,
      generateQuotation: `Generate quotation for project ID: ${data}`,
      generateInvoice: `Generate invoice for project ID: ${data}`,
    }

    if (prompts[action]) {
      setInput(prompts[action])
      handleSubmit({ text: prompts[action] })
      return
    }

    if (action === 'saveProject') {
      const msg = `Update project ${data.projectId} with these details: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }

    if (action === 'createProject') {
      const msg = `Create new project with these details: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }

    // Handle Split & Combine Submissions
    if (action === 'splitQuotation') {
      const msg = `SPLIT_QUOTATION_SUBMIT: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }
    if (action === 'splitInvoice') {
      const msg = `SPLIT_INVOICE_SUBMIT: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }
    if (action === 'combineQuotation') {
      const msg = `COMBINE_QUOTATION_SUBMIT: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }
    if (action === 'combineInvoice') {
      const msg = `COMBINE_INVOICE_SUBMIT: ${JSON.stringify(data)}`
      handleSubmit({ text: msg })
      return
    }
    if (action === 'cancelSplit' || action === 'cancelSplitInvoice' || action === 'cancelCombine') {
      handleSubmit({ text: "Cancel operation" })
      return
    }
  }

  const currentModel = MODELS.find(m => m.id === selectedModel)

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-linear-to-br from-[#0b0120] via-[#1a0b3d] to-[#04010f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
      <div className="relative z-10 flex h-screen flex-col">

        {/* Header - Made more compact */}
        <div className="border-b border-white/10 bg-white/10 px-3 py-2 sm:px-6 sm:py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-xl bg-linear-to-br from-[#a855f7] via-[#7c3aed] to-[#6366f1] p-2 shadow-lg">
                <Sparkles className="h-5 w-5 text-white sm:h-6 sm:w-6" />
              </div>
              <div className="text-left">
                <h1 className="text-base font-semibold text-white sm:text-xl">Sculpture AI</h1>
                <p className="hidden text-xs text-white/70 sm:block">Studio operations partner</p>
              </div>
            </div>

            {/* Model Selector - Compact */}
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                aria-haspopup="listbox"
                aria-expanded={showModelSelector}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-left text-white backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/15 sm:px-3 sm:py-2"
              >
                <span className="text-sm sm:text-base">{currentModel?.icon}</span>
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-semibold text-white">{currentModel?.name}</div>
                </div>
                <Settings className="h-3 w-3 text-white/60 sm:h-4 sm:w-4" />
              </button>

              {showModelSelector && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-[#140724]/95 py-2 shadow-2xl backdrop-blur-xl sm:w-72"
                  role="listbox"
                  aria-label="Model selector"
                >
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id)
                        setShowModelSelector(false)
                      }}
                      role="option"
                      aria-selected={selectedModel === model.id}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${selectedModel === model.id
                        ? 'bg-white/15 text-white shadow-inner shadow-white/10'
                        : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                      <span className="text-lg">{model.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{model.name}</div>
                        <div className="text-xs text-white/60">{model.description}</div>
                      </div>
                      {selectedModel === model.id && (
                        <div className="h-2 w-2 rounded-full bg-violet-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Fixed overflow and sizing */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="mx-auto w-full max-w-3xl">
              {messages.length === 0 ? (
                // Empty State - More compact
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-6 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-xl">
                    <Sparkles className="h-12 w-12 text-violet-300 sm:h-16 sm:w-16" />
                  </div>
                  <h2 className="mb-3 text-2xl font-semibold text-white sm:text-3xl">
                    Welcome to Sculpture AI
                  </h2>
                  <p className="mb-8 max-w-md text-sm text-white/70 sm:text-base">
                    Ask anything about your clients, projects, finances, or production schedule.
                  </p>

                  {/* Quick Actions - Responsive grid */}
                  <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
                    {[
                      {
                        text: 'Show me all active projects',
                        icon: '📊',
                        label: 'Projects',
                      },
                      {
                        text: 'Generate an invoice',
                        icon: '💰',
                        label: 'Invoice',
                      },
                      {
                        text: 'Check material inventory',
                        icon: '📦',
                        label: 'Inventory',
                      },
                      {
                        text: 'List pending tasks',
                        icon: '✅',
                        label: 'Tasks',
                      },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(btn.text)}
                        className="group rounded-2xl border border-white/15 bg-white/10 p-4 text-left text-white/90 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/15"
                      >
                        <span className="mb-2 flex items-center gap-2 text-2xl">
                          <span>{btn.icon}</span>
                        </span>
                        <span className="block text-sm font-semibold text-white sm:text-base">{btn.label}</span>
                        <span className="mt-1 hidden text-xs text-white/60 sm:block">{btn.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Messages List
                <div className="space-y-4">
                  {messages.map((message: UIMessage) => {
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                      >
                        {/* AI Avatar */}
                        {message.role === 'assistant' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg sm:h-10 sm:w-10">
                            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`${message.role === 'user' ? 'order-first' : ''} max-w-[85%] sm:max-w-[75%]`}>
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-lg transition-transform ${message.role === 'user'
                              ? 'bg-linear-to-r from-[#8b5cf6] via-[#d946ef] to-[#ec4899] text-white'
                              : 'border border-white/15 bg-white/8 text-white/90'
                              }`}
                          >
                            {(() => {
                              // Group tool parts for batching
                              const partsToRender = []
                              let currentBatch: { toolName: string, parts: ToolMessagePart[] } | null = null

                              message.parts.forEach((part, index) => {
                                if (part.type === 'text') {
                                  if (currentBatch) {
                                    partsToRender.push({ type: 'batch', data: currentBatch })
                                    currentBatch = null
                                  }
                                  partsToRender.push({ type: 'text', data: part })
                                } else if (part.type.startsWith('tool-')) {
                                  const toolPart = part as ToolMessagePart
                                  const toolName = part.type.replace('tool-', '')

                                  // @ts-ignore
                                  if (toolPart.state === 'output-available' && toolPart.output !== undefined) {
                                    // INVISIBLE BRAIN: Skip rendering hidden tools on success
                                    if (HIDDEN_TOOLS.includes(toolName)) {
                                      // Optionally log to console for debug
                                      console.log(`[Invisible Brain] Executed ${toolName}`, toolPart.output)
                                      return null
                                    }

                                    // Check if we can batch
                                    if (currentBatch && currentBatch.toolName === toolName) {
                                      currentBatch.parts.push(toolPart)
                                    } else {
                                      if (currentBatch) {
                                        partsToRender.push({ type: 'batch', data: currentBatch })
                                      }
                                      currentBatch = { toolName, parts: [toolPart] }
                                    }
                                  } else {
                                    // For errors/loading, render individually for now to avoid complexity in batcher
                                    if (currentBatch) {
                                      partsToRender.push({ type: 'batch', data: currentBatch })
                                      currentBatch = null
                                    }
                                    partsToRender.push({ type: 'raw-tool', data: part, toolName })
                                  }
                                }
                              })
                              if (currentBatch) {
                                partsToRender.push({ type: 'batch', data: currentBatch })
                              }

                              return partsToRender.map((item, i) => {
                                if (item.type === 'text') {
                                  return (
                                    <div key={i} className="prose prose-invert prose-sm max-w-none text-sm text-white/90 whitespace-pre-wrap">
                                      {(item.data as any).text}
                                    </div>
                                  )
                                }

                                if (item.type === 'batch') {
                                  const batch = item.data as { toolName: string, parts: ToolMessagePart[] }
                                  // If only 1 item, use standard ToolCard to avoid overhead
                                  if (batch.parts.length === 1) {
                                    const toolPart = batch.parts[0]
                                    return (
                                      <div key={i} className="mt-3">
                                        <ToolCard
                                          toolName={batch.toolName}
                                          input={toolPart.input}
                                          output={toolPart.output}
                                          onAction={(action, data) => handleToolAction(action, data)}
                                        />
                                      </div>
                                    )
                                  }
                                  // Render Batch Card
                                  return (
                                    <div key={i} className="mt-3">
                                      <BatchToolResultCard
                                        toolName={batch.toolName}
                                        results={batch.parts.map(p => ({ input: p.input, output: p.output }))}
                                        onAction={(action, data) => handleToolAction(action, data)}
                                      />
                                    </div>
                                  )
                                }

                                if (item.type === 'raw-tool') {
                                  const toolPart = item.data as ToolMessagePart
                                  const toolName = (item as any).toolName

                                  if (toolPart.state === 'output-error') {
                                    return (
                                      <div key={i} className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-sm text-rose-100 backdrop-blur-xl">
                                        {toolName} encountered an error. Please try again.
                                      </div>
                                    )
                                  }
                                  if (HIDDEN_TOOLS.includes(toolName)) {
                                    // Render nothing for hidden tools unless there's an error
                                    return null
                                  }

                                  if (toolPart.state?.startsWith('input-')) {
                                    return (
                                      <div
                                        key={i}
                                        className="mt-3 rounded-xl border border-white/15 bg-white/6 p-3 text-xs uppercase tracking-wide text-white/55 backdrop-blur-xl"
                                      >
                                        <span className="flex items-center gap-2">
                                          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" />
                                          {toolName} in progress
                                        </span>
                                      </div>
                                    )
                                  }
                                }
                                return null
                              })
                            })()}

                            {/* Timestamp */}
                            <div
                              className={`mt-2 text-[10px] ${message.role === 'user' ? 'text-white/70' : 'text-white/55'
                                }`}
                            >
                              {new Date().toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        {/* User Avatar */}
                        {message.role === 'user' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white shadow-lg sm:h-10 sm:w-10">
                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Typing Indicator */}
                  {isStreaming && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg sm:h-10 sm:w-10">
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="rounded-2xl border border-white/12 bg-white/8 px-5 py-3 shadow-lg backdrop-blur-xl">
                        <div className="flex gap-1.5">
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-white/70"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-white/60"
                            style={{ animationDelay: '120ms' }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-white/50"
                            style={{ animationDelay: '240ms' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-rose-200">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />
                    <span className="font-semibold tracking-wide">Something went wrong</span>
                  </div>
                  <p className="mt-2 text-sm text-rose-100/80">{error.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="sticky bottom-0 left-0 right-0 border-t border-white/10 bg-[#0b0120]/95 px-3 py-3 backdrop-blur-2xl sm:px-6 sm:py-4">
            <div className="mx-auto w-full max-w-3xl">
              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-xl"
                    >
                      <FileText className="h-3 w-3 text-violet-200 sm:h-4 sm:w-4" />
                      <span className="text-xs font-medium sm:text-sm">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-white/60 transition-colors hover:text-white"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Controls Row - Mobile: Right aligned, Desktop: Left */}
              <div className="mb-2 flex justify-end gap-2 sm:justify-start">
                <button
                  onClick={openFileDialog}
                  aria-label="Attach file"
                  className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  title="Attach file"
                  type="button"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Take photo"
                  className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  title="Take photo"
                  type="button"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))}
                  className="hidden"
                />
                <button
                  onClick={startRecording}
                  disabled={isStreaming || isRecording}
                  type="button"
                  aria-label="Start voice input"
                  className={`rounded-xl p-2 transition-colors ${isRecording
                    ? 'bg-rose-500/70 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  title="Voice input"
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              {/* Input Row: Text + Send Button */}
              <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/8 p-2 shadow-lg backdrop-blur-xl">
                {isDragActive && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-violet-300/60 bg-violet-500/10 flex items-center justify-center">
                    <span className="text-sm text-violet-100">Drop files to attach</span>
                  </div>
                )}

                {/* Text Input */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2 text-base text-white placeholder-white/40 outline-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit({ text: input })
                    }
                  }}
                />

                {/* Send/Stop Button */}
                {isStreaming ? (
                  <button
                    onClick={stop}
                    type="button"
                    aria-label="Stop generation"
                    className="shrink-0 rounded-xl bg-rose-600 p-2.5 text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-rose-500"
                    title="Stop generation"
                  >
                    <StopCircle className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit({ text: input })}
                    disabled={!input.trim() && attachedFiles.length === 0}
                    aria-label="Send message"
                    className="shrink-0 rounded-xl bg-linear-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] p-2.5 text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  )
}
