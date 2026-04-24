import { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Brain,
  FileText,
  MessageSquare,
  BarChart2,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Zap, label: 'Home', exact: true },
  { to: '/documents', icon: FileText, label: 'Documents', exact: false },
  { to: '/chat', icon: MessageSquare, label: 'Ask Questions', exact: false },
  { to: '/admin', icon: BarChart2, label: 'Analytics', exact: false },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Brain size={18} color="white" />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: 0.5,
              }}
            >
              RAG
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              Automation
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact
              ? location.pathname === to
              : location.pathname.startsWith(to) && to !== '/'
                ? true
                : location.pathname === to

            return (
              <NavLink
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
                  borderLeft: active
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                }}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)' }}>v1.0.0</div>
          <div>Open Source · Free Tier</div>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>
    </div>
  )
}
