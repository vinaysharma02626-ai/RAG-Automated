import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import { formatBytes } from '../../utils/format'
import { Button } from '../ui'

interface FileItem {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface DocumentUploadProps {
  onUploaded?: () => void
}

export default function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    const newItems = accepted.map((f) => ({
      file: f,
      progress: 0,
      status: 'pending' as const,
    }))
    setFiles((prev) => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        const err = r.errors[0]?.message || 'File rejected'
        alert(`${r.file.name}: ${err}`)
      })
    },
  })

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading', progress: 0 } : f
        )
      )

      try {
        await api.uploadDocuments([files[i].file], (progress) => {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
          )
        })
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'done', progress: 100 } : f
          )
        )
      } catch (e: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: e.message } : f
          )
        )
      }
    }

    setUploading(false)
    onUploaded?.()
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <div>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: isDragActive ? 'var(--accent-glow)' : 'var(--bg-surface)',
        }}
      >
        <input {...getInputProps()} />
        <Upload
          size={36}
          style={{
            color: isDragActive ? 'var(--accent)' : 'var(--text-muted)',
            marginBottom: 12,
          }}
        />
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
          {isDragActive ? 'Drop files here…' : 'Drag & drop PDF or DOCX files'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          or click to browse · Max 50MB per file
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.file.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatBytes(item.file.size)}
                </div>
                {item.status === 'uploading' && (
                  <div
                    style={{
                      height: 3,
                      background: 'var(--bg-hover)',
                      borderRadius: 2,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${item.progress}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.2s',
                      }}
                    />
                  </div>
                )}
                {item.error && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                    {item.error}
                  </div>
                )}
              </div>
              {item.status === 'pending' && (
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
              {item.status === 'uploading' && (
                <Loader2
                  size={16}
                  style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }}
                />
              )}
              {item.status === 'done' && (
                <CheckCircle size={16} style={{ color: 'var(--green)' }} />
              )}
              {item.status === 'error' && (
                <AlertCircle size={16} style={{ color: 'var(--red)' }} />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button
              onClick={uploadAll}
              loading={uploading}
              disabled={pendingCount === 0}
              icon={<Upload size={14} />}
            >
              Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : 'Files'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
