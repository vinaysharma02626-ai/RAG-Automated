import { useEffect, useState } from 'react'
import { BarChart2, RefreshCw, Clock, Layers, ThumbsUp, ThumbsDown, FileText } from 'lucide-react'
import { api, AdminStats } from '../utils/api'
import { Button, Card, Spinner, Badge } from '../components/ui'
import { formatDate, formatLatency } from '../utils/format'

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([api.getStats(), api.getLogs(20)])
      setStats(s)
      setLogs(l)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>System stats and recent query logs</div>
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={load}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner size={28} />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                {[
                  {
                    icon: <FileText size={18} />,
                    label: 'Documents',
                    value: `${stats.documents.ready} / ${stats.documents.total}`,
                    sub: 'ready / total',
                    color: 'var(--green)',
                  },
                  {
                    icon: <BarChart2 size={18} />,
                    label: 'Total Queries',
                    value: stats.queries.total.toLocaleString(),
                    sub: 'all time',
                    color: 'var(--accent)',
                  },
                  {
                    icon: <Clock size={18} />,
                    label: 'Avg Latency',
                    value: formatLatency(stats.queries.avg_latency_ms),
                    sub: 'per query',
                    color: 'var(--yellow)',
                  },
                  {
                    icon: <Layers size={18} />,
                    label: 'Avg Chunks',
                    value: stats.queries.avg_chunks_used.toFixed(1),
                    sub: 'used per answer',
                    color: 'var(--blue)',
                  },
                  {
                    icon: <ThumbsUp size={18} />,
                    label: 'Positive Feedback',
                    value: stats.feedback.positive,
                    sub: 'thumbs up',
                    color: 'var(--green)',
                  },
                  {
                    icon: <ThumbsDown size={18} />,
                    label: 'Negative Feedback',
                    value: stats.feedback.negative,
                    sub: 'thumbs down',
                    color: 'var(--red)',
                  },
                ].map((card, i) => (
                  <Card key={i} style={{ padding: '16px' }}>
                    <div style={{ color: card.color, marginBottom: 10 }}>{card.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.sub}</div>
                  </Card>
                ))}
              </div>
            )}

            {/* Recent query logs */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Recent Queries</h2>
              {logs.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  No queries yet. Start asking questions in the Chat tab.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {logs.map((log) => (
                    <Card key={log.id} style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-primary)' }}>
                            {log.query_text}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>{formatDate(log.created_at)}</span>
                            {log.chunks_used > 0 && <span>{log.chunks_used} chunks</span>}
                            {log.latency_ms && <span>{formatLatency(log.latency_ms)}</span>}
                          </div>
                        </div>
                        <Badge
                          color={log.status === 'success' ? 'green' : 'red'}
                          style={{ flexShrink: 0 }}
                        >
                          {log.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
