import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Send,
  RefreshCw,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Zap,
  AlignLeft,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api, Document, Chunk } from '../../utils/api'
import { Button, Badge, Spinner } from '../ui'
import { formatLatency } from '../../utils/format'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Chunk[]
  queryLogId?: string
  latencyMs?: number
  isStreaming?: boolean
  feedback?: 1 | -1
}

interface ChatInterfaceProps {
  documents: Document[]
}

export default function ChatInterface({ documents }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [answerMode, setAnswerMode] = useState<'concise' | 'detailed'>('concise')
  const [streaming, setStreaming] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState<string | null>(null)
  const sessionId = useRef(uuidv4())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const readyDocs = documents.filter((d) => d.status === 'ready')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')

    const userMsg: Message = { id: uuidv4(), role: 'user', content: q }
    const assistantId = uuidv4()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      let content = ''
      let sources: Chunk[] = []
      let queryLogId: string | undefined
      let latencyMs: number | undefined

      const docFilter = selectedDocs.length > 0 ? selectedDocs : null

      for await (const event of api.streamQuery(
        q,
        docFilter,
        sessionId.current,
        answerMode,
        history
      )) {
        if (event.type === 'sources') {
          sources = event.sources || []
          queryLogId = event.query_log_id
        } else if (event.type === 'token') {
          content += event.content || ''
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content, isStreaming: true } : m
            )
          )
        } else if (event.type === 'done') {
          latencyMs = event.latency_ms
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content, sources, queryLogId, latencyMs, isStreaming: false }
                : m
            )
          )
        } else if (event.type === 'error') {
          content = `**Error:** ${event.content}`
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content, isStreaming: false } : m
            )
          )
        }
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `**Error:** ${e.message}`, isStreaming: false }
            : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, messages, selectedDocs, answerMode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFeedback = async (msg: Message, rating: 1 | -1) => {
    if (!msg.queryLogId) return
    try {
      await api.submitFeedback(msg.queryLogId, rating)
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, feedback: rating } : m))
      )
    } catch {}
  }

  const clearChat = () => {
    setMessages([])
    sessionId.current = uuidv4()
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar: doc selector */}
      <aside
        style={{
          width: 220,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '14px 14px 10px',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Search Scope
        </div>

        <div style={{ padding: '8px 8px', flex: 1, overflow: 'auto' }}>
          <button
            onClick={() => setSelectedDocs([])}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 'var(--radius-md)',
              background: selectedDocs.length === 0 ? 'var(--bg-active)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color:
                selectedDocs.length === 0 ? 'var(--accent-bright)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            <BookOpen size={13} />
            All Documents
            <Badge color="default" style={{ marginLeft: 'auto', fontSize: 10 }}>
              {readyDocs.length}
            </Badge>
          </button>

          {readyDocs.map((doc) => {
            const selected = selectedDocs.includes(doc.id)
            return (
              <button
                key={doc.id}
                onClick={() =>
                  setSelectedDocs((prev) =>
                    prev.includes(doc.id)
                      ? prev.filter((id) => id !== doc.id)
                      : [...prev, doc.id]
                  )
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: selected ? 'var(--bg-active)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: selected ? 'var(--accent-bright)' : 'var(--text-secondary)',
                  fontSize: 12,
                  textAlign: 'left',
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-bright)'}`,
                    background: selected ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {doc.title || doc.original_name}
                </span>
              </button>
            )
          })}

          {readyDocs.length === 0 && (
            <div
              style={{ padding: '12px 10px', fontSize: 12, color: 'var(--text-muted)' }}
            >
              No documents ready. Upload and index documents first.
            </div>
          )}
        </div>

        {/* Answer mode toggle */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            Answer Mode
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['concise', 'detailed'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAnswerMode(mode)}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  background:
                    answerMode === mode ? 'var(--accent)' : 'var(--bg-hover)',
                  color: answerMode === mode ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                {mode === 'concise' ? <Zap size={10} /> : <AlignLeft size={10} />}
                {mode}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 12,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              <BookOpen size={40} />
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Ask anything about your documents
              </div>
              <div style={{ fontSize: 14, maxWidth: 400 }}>
                {readyDocs.length === 0
                  ? 'Upload and index documents first to start querying.'
                  : `${readyDocs.length} document${readyDocs.length > 1 ? 's' : ''} ready. Type a question below.`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{ animation: 'fadeIn 0.25s ease' }}
                >
                  {msg.role === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          background: 'var(--accent)',
                          color: 'white',
                          padding: '10px 16px',
                          borderRadius: '16px 16px 4px 16px',
                          maxWidth: '75%',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px 16px 16px 16px',
                          padding: '14px 18px',
                        }}
                      >
                        <div
                          className={`markdown-content ${msg.isStreaming ? 'streaming-cursor' : ''}`}
                          style={{ fontSize: 14 }}
                        >
                          <ReactMarkdown>{msg.content || ' '}</ReactMarkdown>
                        </div>

                        {/* Sources */}
                        {!msg.isStreaming && msg.sources && msg.sources.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <button
                              onClick={() =>
                                setSourcesOpen(
                                  sourcesOpen === msg.id ? null : msg.id
                                )
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--accent-bright)',
                                fontSize: 12,
                                fontWeight: 600,
                                padding: 0,
                              }}
                            >
                              {sourcesOpen === msg.id ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                              {msg.sources.length} Sources Used
                            </button>

                            {sourcesOpen === msg.id && (
                              <div
                                style={{
                                  marginTop: 10,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                }}
                              >
                                {msg.sources.map((src, i) => (
                                  <SourceCard key={src.chunk_id} src={src} index={i + 1} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer: latency + feedback */}
                        {!msg.isStreaming && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 12,
                              paddingTop: 10,
                              borderTop: '1px solid var(--border)',
                            }}
                          >
                            {msg.latencyMs && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {formatLatency(msg.latencyMs)}
                              </span>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => handleFeedback(msg, 1)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 4,
                                  color:
                                    msg.feedback === 1
                                      ? 'var(--green)'
                                      : 'var(--text-muted)',
                                }}
                                title="Helpful"
                              >
                                <ThumbsUp size={13} />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg, -1)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 4,
                                  color:
                                    msg.feedback === -1
                                      ? 'var(--red)'
                                      : 'var(--text-muted)',
                                }}
                                title="Not helpful"
                              >
                                <ThumbsDown size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 10,
              maxWidth: 800,
              margin: '0 auto',
              alignItems: 'flex-end',
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents…"
              disabled={streaming}
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                resize: 'none',
                outline: 'none',
                maxHeight: 120,
                lineHeight: 1.5,
              }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="md"
                  icon={<RefreshCw size={15} />}
                  onClick={clearChat}
                  disabled={streaming}
                  title="Clear conversation"
                />
              )}
              <Button
                size="md"
                loading={streaming}
                icon={<Send size={15} />}
                onClick={sendMessage}
                disabled={!input.trim() || readyDocs.length === 0}
              >
                Send
              </Button>
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 6,
            }}
          >
            Press Enter to send · Shift+Enter for new line · Answers based strictly on indexed documents
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceCard({ src, index }: { src: Chunk; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <Badge color="purple" style={{ fontSize: 10 }}>
          [{index}]
        </Badge>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {src.document_name}
        </span>
        {src.page_start && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            p.{src.page_start}
          </span>
        )}
        {src.heading && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 200,
            }}
          >
            §{src.heading}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: expanded ? undefined : 2,
        }}
      >
        {src.text}
      </div>
    </div>
  )
}
