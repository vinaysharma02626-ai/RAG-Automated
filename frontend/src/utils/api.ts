const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface Document {
  id: string
  filename: string
  original_name: string
  file_type: string
  file_size: number
  upload_time: string
  status: 'pending' | 'indexing' | 'ready' | 'failed'
  error_message: string | null
  chunk_count: number
  page_count: number
  title: string | null
}

export interface Chunk {
  chunk_id: string
  document_id: string
  document_name: string
  text: string
  heading: string | null
  section_path: string | null
  page_start: number | null
  page_end: number | null
  chunk_type: string
}

export interface StreamEvent {
  type: 'sources' | 'token' | 'error' | 'done'
  content?: string
  sources?: Chunk[]
  query_log_id?: string
  latency_ms?: number
}

export interface AdminStats {
  documents: { total: number; ready: number }
  queries: { total: number; avg_latency_ms: number; avg_chunks_used: number }
  feedback: { positive: number; negative: number }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, options)
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API Error ${resp.status}: ${text}`)
  }
  return resp.json()
}

export const api = {
  // Documents
  listDocuments: () => request<Document[]>('/documents/'),
  getDocument: (id: string) => request<Document>(`/documents/${id}`),
  getChunks: (id: string, limit = 20, offset = 0) =>
    request<any[]>(`/documents/${id}/chunks?limit=${limit}&offset=${offset}`),
  deleteDocument: (id: string) =>
    request<any>(`/documents/${id}`, { method: 'DELETE' }),
  reindexDocument: (id: string) =>
    request<any>(`/documents/${id}/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  uploadDocuments: async (
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<any> => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/documents/upload`)
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress((e.loaded / e.total) * 100)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  },

  // Query streaming
  streamQuery: async function* (
    query: string,
    docIds: string[] | null,
    sessionId: string,
    answerMode: string,
    conversationHistory: any[]
  ): AsyncGenerator<StreamEvent> {
    const resp = await fetch(`${API_BASE}/query/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        doc_ids: docIds && docIds.length > 0 ? docIds : null,
        session_id: sessionId,
        answer_mode: answerMode,
        conversation_history: conversationHistory,
      }),
    })

    if (!resp.ok) throw new Error(`Query failed: ${resp.status}`)

    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: StreamEvent = JSON.parse(line.slice(6))
            yield event
          } catch {
            // skip malformed
          }
        }
      }
    }
  },

  submitFeedback: (queryLogId: string, rating: number, comment?: string) =>
    request<any>('/query/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_log_id: queryLogId, rating, comment }),
    }),

  // Admin
  getStats: () => request<AdminStats>('/admin/stats'),
  getLogs: (limit = 20) => request<any[]>(`/admin/logs?limit=${limit}`),
}
