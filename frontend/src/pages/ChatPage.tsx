import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Upload } from 'lucide-react'
import { api, Document } from '../utils/api'
import ChatInterface from '../components/chat/ChatInterface'
import { Button, EmptyState, Spinner } from '../components/ui'

export default function ChatPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.listDocuments().then((docs) => {
      setDocuments(docs)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner size={32} />
      </div>
    )
  }

  const readyDocs = documents.filter((d) => d.status === 'ready')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-surface)', flexShrink: 0,
      }}>
        <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Ask Questions</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10 }}>
            {readyDocs.length} document{readyDocs.length !== 1 ? 's' : ''} ready
          </span>
        </div>
        {readyDocs.length === 0 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<Upload size={12} />}
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate('/documents')}
          >
            Upload Documents
          </Button>
        )}
      </div>

      {readyDocs.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="No documents indexed yet"
            description="Upload and index documents first to start asking questions. The RAG pipeline will retrieve relevant chunks for every query."
            action={
              <Button icon={<Upload size={14} />} onClick={() => navigate('/documents')}>
                Go to Documents
              </Button>
            }
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface documents={documents} />
        </div>
      )}
    </div>
  )
}
