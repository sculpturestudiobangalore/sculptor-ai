'use client'


import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
// CodeBlock not used when rendering ToolCard; keeping JSON fallback via ToolCard
import ToolCard from '@/components/tool-card'
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


export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)


  const { messages, sendMessage, status, error, stop } = useChat()
  const isStreaming = status === 'submitted' || status === 'streaming'


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
      },
    })
    setInput('')
    setAttachedFiles([])
  }


  // Remove attached file
  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }


  const currentModel = MODELS.find(m => m.id === selectedModel)


  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-linear-to-br from-[#0b0120] via-[#1a0b3d] to-[#04010f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
      <div className="relative z-10 flex h-screen flex-col">

        {/* Header */}
        <div className="border-b border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="rounded-2xl bg-linear-to-br from-[#a855f7] via-[#7c3aed] to-[#6366f1] p-3 shadow-[0_20px_40px_rgba(124,58,237,0.35)]">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-semibold text-white sm:text-2xl">Sculpture AI</h1>
                <p className="text-sm text-white/70">Your conversation-first studio operations partner</p>
              </div>
            </div>


            {/* Model Selector */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                aria-haspopup="listbox"
                aria-expanded={showModelSelector}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-left text-white shadow-[0_12px_35px_rgba(88,28,135,0.25)] backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/15 sm:w-auto"
              >
                <span className="text-lg">{currentModel?.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{currentModel?.name}</div>
                  <div className="text-xs text-white/70">{currentModel?.description}</div>
                </div>
                <Settings className="h-4 w-4 text-white/60" />
              </button>


              {showModelSelector && (
                <div
                  className="absolute top-full left-0 z-20 mt-3 w-full rounded-2xl border border-white/10 bg-[#140724]/95 py-2 shadow-[0_30px_60px_rgba(8,0,32,0.45)] backdrop-blur-xl sm:left-auto sm:w-80"
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
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${selectedModel === model.id
                        ? 'bg-white/15 text-white shadow-inner shadow-white/10'
                        : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                      <span className="text-xl">{model.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{model.name}</div>
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


        {/* Main Content */}
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Messages Area */}
          <div className="flex-1 min-h-0 overflow-hidden px-3 py-6 sm:px-6">

            <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-[34px] border border-white/10 bg-white/8 backdrop-blur-[60px] shadow-[0_45px_120px_rgba(9,0,33,0.55)]">
              {/* <-- make this child the only scrollable area */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
                {messages.length === 0 ? (
                  // Empty State
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-10 rounded-[28px] border border-white/15 bg-white/10 p-8 shadow-[0_25px_80px_rgba(90,54,197,0.45)]">
                      <Sparkles className="h-16 w-16 text-violet-300 sm:h-20 sm:w-20" />
                    </div>
                    <h2 className="mb-4 text-3xl font-semibold text-white sm:text-4xl">
                      Welcome to Sculpture AI
                    </h2>
                    <p className="mb-12 max-w-xl text-base text-white/70 sm:text-lg">
                      Ask anything about your clients, projects, finances, or production schedule and get instantly actionable answers.
                    </p>


                    {/* Quick Actions */}
                    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        {
                          text: 'Show me all active projects',
                          icon: '📊',
                          label: 'Review active projects',
                          hotspot: 'Delivery timeline'
                        },
                        {
                          text: 'Generate an invoice',
                          icon: '💰',
                          label: 'Create invoice from quotation',
                          hotspot: 'Finance'
                        },
                        {
                          text: 'Check material inventory',
                          icon: '📦',
                          label: 'Verify stock & reorder alerts',
                          hotspot: 'Supply chain'
                        },
                        {
                          text: 'List pending tasks',
                          icon: '✅',
                          label: 'See today’s production priorities',
                          hotspot: 'Daily execution'
                        },
                      ].map((btn, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(btn.text)}
                          className="group rounded-3xl border border-white/15 bg-white/10 p-5 text-left text-white/90 shadow-[0_18px_60px_rgba(91,33,182,0.3)] transition-all duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/15"
                        >
                          <span className="mb-3 flex items-center gap-3 text-2xl">
                            <span>{btn.icon}</span>
                            <span className="text-xs uppercase tracking-[0.35em] text-white/50">{btn.hotspot}</span>
                          </span>
                          <span className="block text-lg font-semibold text-white">{btn.label}</span>
                          <span className="mt-2 block text-sm text-white/60">{btn.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Messages List
                  <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:space-y-7 sm:px-8">
                    {messages.map((message: UIMessage) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* AI Avatar */}
                        {message.role === 'assistant' && (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-[0_16px_40px_rgba(60,13,153,0.35)]">
                            <Bot className="h-5 w-5" />
                          </div>
                        )}


                        {/* Message Bubble */}
                        <div className={`${message.role === 'user' ? 'order-first' : ''} max-w-[92%] sm:max-w-[72%]`}>
                          <div
                            className={`rounded-3xl px-5 py-4 shadow-[0_25px_70px_rgba(20,0,50,0.45)] transition-transform ${message.role === 'user'
                              ? 'bg-linear-to-r from-[#8b5cf6] via-[#d946ef] to-[#ec4899] text-white hover:translate-x-0.5'
                              : 'border border-white/15 bg-white/8 text-white/90 hover:translate-x-0.5'
                              }`}
                          >
                            {message.parts.map((part, i) => {
                              if (part.type === 'text') {
                                return (
                                  <div key={i} className="prose prose-invert prose-sm max-w-none text-white/90">
                                    {part.text}
                                  </div>
                                )
                              }


                              if (part.type.startsWith('tool-')) {
                                const toolPart = part as ToolMessagePart
                                const toolName = part.type.replace('tool-', '')


                                if (toolPart.state === 'output-available' && toolPart.output !== undefined) {
                                  return (
                                    <div key={i} className="mt-4">
                                      <ToolCard toolName={toolName} input={toolPart.input} output={toolPart.output} />
                                    </div>
                                  )
                                }


                                if (toolPart.state === 'output-error') {
                                  return (
                                    <div
                                      key={i}
                                      className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/15 p-4 text-sm text-rose-100 backdrop-blur-xl"
                                    >
                                      {toolName} encountered an error. Please try again.
                                    </div>
                                  )
                                }


                                if (toolPart.state === 'input-streaming' || toolPart.state === 'input-available') {
                                  return (
                                    <div
                                      key={i}
                                      className="mt-4 rounded-2xl border border-white/15 bg-white/6 p-4 text-xs uppercase tracking-[0.35em] text-white/55 backdrop-blur-xl"
                                    >
                                      <span className="flex items-center gap-2">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-violet-300" />
                                        {toolName} in progress
                                      </span>
                                    </div>
                                  )
                                }
                              }


                              return null;
                            })}


                            {/* Timestamp */}
                            <div
                              className={`mt-3 text-xs ${message.role === 'user' ? 'text-white/70' : 'text-white/55'
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
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_16px_40px_rgba(91,33,182,0.35)]">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    ))}


                    {/* Typing Indicator */}
                    {isStreaming && (
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-[0_16px_40px_rgba(60,13,153,0.35)]">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="rounded-3xl border border-white/12 bg-white/8 px-6 py-4 shadow-[0_20px_60px_rgba(30,0,60,0.4)] backdrop-blur-xl">
                          <div className="flex gap-2">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" style={{ animationDelay: '120ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: '240ms' }} />
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
              </div> {/* <-- end scrollable wrapper */}
            </div>
          </div>


          {/* Input Area */}
          <div className="border-t border-white/10 bg-white/5 px-3 py-6 backdrop-blur-2xl sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-xl"
                    >
                      <FileText className="h-4 w-4 text-violet-200" />
                      <span className="font-medium">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-white/60 transition-colors hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}


              {/* Input Container */}
              <div
                {...getRootProps({
                  className: `rounded-[28px] border ${isDragActive ? 'border-violet-300/80 bg-violet-500/15' : 'border-white/15 bg-white/8'} p-4 shadow-[0_25px_80px_rgba(22,0,60,0.45)] transition-colors backdrop-blur-xl sm:p-6`,
                })}
              >
                <input
                  {...getInputProps({
                    className: 'hidden',
                    'aria-label': 'Add files by dragging or choosing from your device',
                  })}
                />
                <div aria-live="polite">
                  {isDragActive && (
                    <div className="mb-4 rounded-2xl border border-dashed border-violet-300/60 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                      Drop files to attach them instantly
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  {/* Left Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openFileDialog}
                      aria-label="Attach file"
                      className="rounded-2xl p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      title="Attach file"
                      type="button"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      aria-label="Take photo"
                      className="rounded-2xl p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                  </div>


                  {/* Text Input */}
                  <div className="flex-1">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full max-h-56 min-h-14 resize-none rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-white placeholder-white/40 outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30 sm:min-h-[72px]"
                      rows={3}
                      disabled={isStreaming}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit({ text: input })
                        }
                      }}
                    />
                  </div>


                  {/* Right Controls */}
                  <div className="flex gap-2 sm:flex-col">
                    <button
                      onClick={startRecording}
                      disabled={isStreaming || isRecording}
                      type="button"
                      aria-label="Start voice input"
                      aria-pressed={isRecording}
                      className={`rounded-2xl p-3 transition-colors ${isRecording
                        ? 'bg-rose-500/70 text-white shadow-[0_12px_40px_rgba(244,63,94,0.45)]'
                        : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
                        }`}
                      title="Voice input"
                    >
                      <Mic className="h-5 w-5" />
                    </button>


                    {isStreaming ? (
                      <button
                        onClick={stop}
                        type="button"
                        aria-label="Stop generation"
                        className="rounded-2xl bg-rose-600 px-3 py-3 text-white shadow-[0_12px_40px_rgba(244,63,94,0.45)] transition-transform hover:-translate-y-0.5 hover:bg-rose-500"
                        title="Stop generation"
                      >
                        <StopCircle className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubmit({ text: input })}
                        disabled={!input.trim() && attachedFiles.length === 0}
                        aria-label="Send message"
                        className="rounded-2xl bg-linear-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] px-3 py-3 text-white shadow-[0_16px_50px_rgba(97,32,211,0.45)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </div>
  )
} 