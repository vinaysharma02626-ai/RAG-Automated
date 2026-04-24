import { useNavigate } from 'react-router-dom'
import { Brain, Upload, MessageSquare, Zap, Shield, GitBranch } from 'lucide-react'
import { Button } from '../components/ui'

const features = [
  {
    icon: <Upload size={20} />,
    title: 'Upload PDF & DOCX',
    desc: 'Drag-and-drop large documents. Automatic parsing, structure detection, and semantic chunking.',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'Hybrid Retrieval',
    desc: 'Vector similarity + BM25 lexical search fused with Reciprocal Rank Fusion for maximum recall.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Cited Answers',
    desc: 'Every answer references exact source chunks — page numbers, section headings, and snippets.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Streaming Responses',
    desc: 'Answers stream token-by-token for a smooth, responsive experience even on long queries.',
  },
  {
    icon: <Shield size={20} />,
    title: '100% Free Stack',
    desc: 'Groq, OpenRouter, or Ollama for LLM. Local sentence-transformers for embeddings. No paid APIs required.',
  },
  {
    icon: <Brain size={20} />,
    title: 'Self-Hostable',
    desc: 'Single Docker container. SQLite + FAISS — no external databases. Deploy on any free tier.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64, animation: 'fadeIn 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(124,106,255,0.3)',
            }}>
              <Brain size={36} color="white" />
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: -1,
            marginBottom: 16,
            background: 'linear-gradient(135deg, var(--text-primary) 60%, var(--accent-bright))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            RAG Automation
          </h1>

          <p style={{
            fontSize: 18, color: 'var(--text-secondary)',
            maxWidth: 520, margin: '0 auto 12px',
            lineHeight: 1.7,
          }}>
            Turn your documents into a question-answering engine.
            Upload PDFs and DOCX files, then ask deep questions with cited answers.
          </p>

          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 36 }}>
            Powered by hybrid RAG · 100% open-source · No paid APIs required
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button size="lg" icon={<Upload size={16} />} onClick={() => navigate('/documents')}>
              Upload Documents
            </Button>
            <Button size="lg" variant="secondary" icon={<MessageSquare size={16} />} onClick={() => navigate('/chat')}>
              Ask Questions
            </Button>
          </div>
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 56,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              animation: `fadeIn 0.4s ease ${i * 0.07}s both`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-bright)', marginBottom: 12,
              }}>
                {f.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
            How It Works
          </h2>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { step: '01', label: 'Upload', desc: 'Drop PDF or DOCX files' },
              { step: '02', label: 'Index', desc: 'Parsed, chunked & embedded automatically' },
              { step: '03', label: 'Query', desc: 'Ask questions in plain English' },
              { step: '04', label: 'Answer', desc: 'Get cited answers from your documents' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: '0 20px' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--accent)', marginBottom: 6,
                  }}>{s.step}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120 }}>{s.desc}</div>
                </div>
                {i < 3 && (
                  <div style={{
                    fontSize: 20, color: 'var(--border-bright)',
                    padding: '0 4px', display: 'flex', alignItems: 'center',
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
