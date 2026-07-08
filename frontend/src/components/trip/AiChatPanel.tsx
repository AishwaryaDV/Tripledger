import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'summary'
  content: string
  createdAt?: string
}

interface Props {
  tripId: string
  onActionPerformed?: () => void
}

// Render basic markdown: **bold**, *italic*, bullet lists, line breaks
function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <span className="leading-relaxed">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j}>{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={j}>{part.slice(1, -1)}</em>
          return <span key={j}>{part}</span>
        })
        return (
          <span key={i}>
            {rendered}
            {i < lines.length - 1 && <br />}
          </span>
        )
      })}
    </span>
  )
}

const AiChatPanel = ({ tripId, onActionPerformed }: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && !hasFetched) fetchHistory()
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await api.get<Message[]>(`/trips/${tripId}/ai-chat`)
      setMessages(res.data)
      setHasFetched(true)
    } catch {
      // silent — retries on next open
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isSending) return

    const userMsg: Message = { id: `temp-${Date.now()}`, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      const res = await api.post<{ message: string; action_type: string | null; action_result: string | null }>(
        `/trips/${tripId}/ai-chat`,
        { message: text },
        { timeout: 45_000 },
      )
      setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: res.data.message }])
      if (res.data.action_type) onActionPerformed?.()
    } catch (err: any) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      let errorMsg = 'Something went wrong'
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = 'AI took too long to respond — try a simpler question'
      } else if (status === 503) {
        errorMsg = 'AI assistant is not available right now'
      } else if (status === 504) {
        errorMsg = 'AI timed out — try again'
      } else if (status === 401) {
        errorMsg = 'Session expired — please log in again'
      } else if (detail) {
        errorMsg = detail
      }
      setMessages(prev => [
        ...prev.filter(m => m.id !== userMsg.id),
        { id: `err-${Date.now()}`, role: 'assistant', content: `⚠️ ${errorMsg}` },
      ])
    } finally {
      setIsSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const clearHistory = async () => {
    try {
      await api.delete(`/trips/${tripId}/ai-chat`)
      setMessages([])
    } catch {
      toast.error('Failed to clear history')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const displayMessages = messages.filter(m => m.role !== 'summary')

  return (
    <>
      {/* Floating bot button */}
      <div className="group" style={{ position: 'fixed', bottom: 76, right: 16, zIndex: 30 }}>
        {/* Hover tooltip */}
        <div className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="bg-popover text-popover-foreground border rounded-xl shadow-lg px-3 py-2 w-44 text-right">
            <p className="text-xs font-semibold">Trip Assistant</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Ask about expenses or say "add lunch €12"</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 flex items-center justify-center focus:outline-none transition-opacity"
          aria-label="Open AI chat"
        >
          <Bot size={22} />
        </button>
      </div>


      {/* Side panel */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50 bg-background border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col w-full sm:w-[360px] h-[85vh] sm:h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Trip Assistant</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {displayMessages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {isLoadingHistory && (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingHistory && displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot size={22} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Trip Assistant</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Ask about spending, balances, or say something like "add dinner ₹800 split equally".
                  </p>
                </div>
              </div>
            )}

            {displayMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Bot size={12} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <MessageContent text={msg.content} />
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t shrink-0 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything or say 'add lunch €12'…"
              rows={1}
              className="flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground max-h-28"
              style={{ lineHeight: '1.4' }}
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity focus:outline-none"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default AiChatPanel
