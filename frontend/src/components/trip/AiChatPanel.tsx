import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface Props {
  tripId: string
  onActionPerformed?: () => void
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
    if (isOpen && !hasFetched) {
      fetchHistory()
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await api.get<Message[]>(`/trips/${tripId}/ai-chat`)
      setMessages(res.data)
      setHasFetched(true)
    } catch {
      // hasFetched stays false so next open retries
      // silent — will retry next open
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isSending) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsSending(true)

    try {
      const res = await api.post<{ message: string; action_type: string | null; action_result: string | null }>(
        `/trips/${tripId}/ai-chat`,
        { message: text },
      )
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.data.message,
      }
      setMessages(prev => [...prev, assistantMsg])
      if (res.data.action_type) {
        onActionPerformed?.()
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? 'Something went wrong'
      toast.error(detail)
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      setInput(text)
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button — above calculator (bottom: 80 calc + 48 btn + 8 gap = 136) */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ position: 'fixed', bottom: 136, right: 16 }}
        className="z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 flex items-center justify-center focus:outline-none transition-opacity"
        title="Trip Assistant"
        aria-label="Open AI chat"
      >
        <Bot size={22} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat panel — bottom sheet */}
      {isOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl flex flex-col"
          style={{ height: '72vh', maxHeight: 640 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-primary" />
              <span className="font-semibold text-sm">Trip Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {isLoadingHistory && (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingHistory && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <Bot size={32} className="text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Ask anything about this trip — spending totals, who owes who, or ask me to add/edit/delete an expense.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t shrink-0 flex gap-2 items-end">
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
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity focus:outline-none"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default AiChatPanel
