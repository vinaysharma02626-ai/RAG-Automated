import { useState } from 'react'
import {
  FileText,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'
import { Document, api } from '../../utils/api'
import { formatBytes, formatDate, truncate } from '../../utils/format'
import { Button, Badge, StatusDot, Card } from '../ui'
import DocumentChunksModal from './DocumentChunksModal'

interface DocumentListProps {
  documents: Document[]
  onRefresh: () => void
}

const statusColor: Record<string, 'green' | 'yellow' | 'purple' | 'red' | 'default'> = {
  ready: 'green',
  pending: 'yellow',
  indexing: 'purple',
  failed: 'red',
}

export default function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState<string | null>(null)
  const [viewDoc, setViewDoc] = useState<Document | null>(null)

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_name}"? This cannot be undone.`)) return
    setDeleting(doc.id)
    try {
      await api.deleteDocument(doc.id)
      onRefresh()
    } catch (e) {
      alert('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleReindex = async (doc: Document) => {
    setReindexing(doc.id)
    try {
      await api.reindexDocument(doc.id)
      onRefresh()
    } catch (e) {
      alert('Reindex failed')
    } finally {
      setReindexing(null)
    }
  }

  if (documents.length === 0) return null

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {documents.map((doc) => (
          <Card
            key={doc.id}
            style={{ padding: '14px 18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background:
                    doc.file_type === 'pdf' ? 'var(--red-dim)' : 'var(--blue-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText
                  size={18}
                  style={{
                    color: doc.file_type === 'pdf' ? 'var(--red)' : 'var(--blue)',
                  }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 300,
                    }}
                    title={doc.original_name}
                  >
                    {doc.title || doc.original_name}
                  </span>
                  <Badge color={statusColor[doc.status] || 'default'}>
                    <StatusDot status={doc.status} />
                    {doc.status}
                  </Badge>
                  <Badge color="default" style={{ fontFamily: 'var(--font-mono)' }}>
                    {doc.file_type.toUpperCase()}
                  </Badge>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{formatBytes(doc.file_size)}</span>
                  {doc.page_count > 0 && <span>{doc.page_count} pages</span>}
                  {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                  <span>{formatDate(doc.upload_time)}</span>
                </div>

                {doc.error_message && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--red)',
                      padding: '4px 8px',
                      background: 'var(--red-dim)',
                      borderRadius: 4,
                    }}
                  >
                    {truncate(doc.error_message, 120)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {doc.status === 'ready' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Eye size={13} />}
                    onClick={() => setViewDoc(doc)}
                    title="View chunks"
                  >
                    View
                  </Button>
                )}
                {(doc.status === 'ready' || doc.status === 'failed') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={reindexing === doc.id}
                    icon={<RefreshCw size={13} />}
                    onClick={() => handleReindex(doc)}
                    title="Re-index"
                  >
                    Re-index
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleting === doc.id}
                  icon={<Trash2 size={13} />}
                  onClick={() => handleDelete(doc)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {viewDoc && (
        <DocumentChunksModal doc={viewDoc} onClose={() => setViewDoc(null)} />
      )}
    </>
  )
}
