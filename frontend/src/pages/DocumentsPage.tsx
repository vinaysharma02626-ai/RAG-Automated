import { useEffect, useState, useCallback } from 'react'
import { FileText, RefreshCw, Settings } from 'lucide-react'
import { api, Document } from '../utils/api'
import DocumentUpload from '../components/documents/DocumentUpload'
import DocumentList from '../components/documents/DocumentList'
import { Button, EmptyState, Spinner, Badge } from '../components/ui'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showUpload, setShowUpload] = useState(true)

  const fetchDocs = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const docs = await api.listDocuments()
      setDocuments(docs)
    } catch (e) {
      console.error('Failed to load documents', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
    // Poll while any doc is indexing
    const interval = setInterval(() => {
      const hasIndexing = documents.some(
        (d) => d.status === 'pending' || d.status === 'indexing'
      )
      if (hasIndexing) fetchDocs(true)
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchDocs, documents])

  const stats = {
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready').length,
    indexing: documents.filter((d) => d.status === 'indexing' || d.status === 'pending').length,
    failed: documents.filter((d) => d.status === 'failed').length,
    chunks: documents.reduce((s, d) => s + d.chunk_count, 0),
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Documents</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Upload, manage, and index your knowledge base
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchDocs()}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText size={13} />}
              onClick={() => setShowUpload((v) => !v)}
            >
              {showUpload ? 'Hide Upload' : 'Upload Files'}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        {documents.length > 0 && (
          <div style={{
            display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Total', value: stats.total, color: 'default' as const },
              { label: 'Ready', value: stats.ready, color: 'green' as const },
              { label: 'Indexing', value: stats.indexing, color: 'yellow' as const },
              { label: 'Failed', value: stats.failed, color: 'red' as const },
              { label: 'Chunks', value: stats.chunks.toLocaleString(), color: 'purple' as const },
            ].map((s) => (
              <div key={s.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</span>
                <Badge color={s.color} style={{ fontSize: 13, padding: '2px 0' }}>
                  {s.value}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Upload */}
        {showUpload && (
          <div style={{ marginBottom: 28 }}>
            <DocumentUpload onUploaded={() => fetchDocs(true)} />
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner size={28} />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="No documents yet"
            description="Upload PDF or DOCX files above to build your knowledge base. Ingestion and indexing happen automatically."
          />
        ) : (
          <DocumentList documents={documents} onRefresh={() => fetchDocs(true)} />
        )}

      </div>
    </div>
  )
}
