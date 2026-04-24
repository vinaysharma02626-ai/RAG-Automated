import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
import { Document, api } from '../../utils/api'
import { Badge, Spinner } from '../ui'

interface Props {
  doc: Document
  onClose: () => void
}

export default function DocumentChunksModal({ doc, onClose }: Props) {
  const [chunks, setChunks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    api.getChunks(doc.id, 50, 0).then((c) => {
      setChunks(c)
      setLoading(false)
    })
  }, [doc.id])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 700,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {doc.title || doc.original_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {doc.chunk_count} chunks indexed
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Chunks */}
        <div style={{ overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size={24} />
            </div>
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
                onClick={() => setExpanded(expanded === chunk.id ? null : chunk.id)}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <Badge color="purple" style={{ fontSize: 10 }}>
                    #{chunk.chunk_index + 1}
                  </Badge>
                  {chunk.chunk_type !== 'text' && (
                    <Badge color="blue" style={{ fontSize: 10 }}>
                      {chunk.chunk_type}
                    </Badge>
                  )}
                  {chunk.page_start && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      p.{chunk.page_start}
                    </span>
                  )}
                  {chunk.heading && (
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
                      §{chunk.heading}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                    {chunk.token_count} tok
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: expanded === chunk.id ? undefined : 2,
                    lineHeight: 1.6,
                  }}
                >
                  {chunk.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
