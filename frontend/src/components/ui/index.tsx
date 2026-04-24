import { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ---- Button ----
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
  }

  const sizes = {
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '8px 16px', fontSize: 14 },
    lg: { padding: '11px 22px', fontSize: 15 },
  }

  const variants: Record<string, CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: 'white',
    },
    secondary: {
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      background: 'var(--red-dim)',
      color: 'var(--red)',
      border: '1px solid var(--red-dim)',
    },
  }

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ---- Badge ----
interface BadgeProps {
  children: ReactNode
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'default'
  style?: CSSProperties
}

export function Badge({ children, color = 'default', style }: BadgeProps) {
  const colors: Record<string, CSSProperties> = {
    default: { background: 'var(--bg-hover)', color: 'var(--text-secondary)' },
    green: { background: 'var(--green-dim)', color: 'var(--green)' },
    yellow: { background: 'var(--yellow-dim)', color: 'var(--yellow)' },
    red: { background: 'var(--red-dim)', color: 'var(--red)' },
    blue: { background: 'var(--blue-dim)', color: 'var(--blue)' },
    purple: { background: 'var(--accent-dim)', color: 'var(--accent-bright)' },
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.3,
        ...colors[color],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ---- Card ----
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
}

export function Card({ children, style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---- StatusDot ----
export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: 'var(--green)',
    pending: 'var(--yellow)',
    indexing: 'var(--accent)',
    failed: 'var(--red)',
  }
  const color = colors[status] || 'var(--text-muted)'
  const pulse = status === 'indexing'

  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        animation: pulse ? 'pulse 1.5s infinite' : undefined,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  )
}

// ---- Spinner ----
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <Loader2
      size={size}
      style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }}
    />
  )
}

// ---- Empty State ----
interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360 }}>
        {description}
      </div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

// ---- Divider ----
export function Divider({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border)',
        ...style,
      }}
    />
  )
}
