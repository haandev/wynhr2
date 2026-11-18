import type { ReactNode } from 'react'
import { avatarColor, initials, label } from '../lib/data'

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: avatarColor(name) }}>
      {initials(name)}
    </span>
  )
}

const tone: Record<string, string> = {
  active: 'green',
  approved: 'green',
  leave: 'amber',
  pending: 'amber',
  draft: 'amber',
  open: 'amber',
  terminated: 'red',
  denied: 'red',
  failed: 'red',
  canceled: 'gray',
  accrued: 'green',
}
export function Pill({ value }: { value?: string | null }) {
  return <span className={`pill ${tone[value ?? ''] ?? 'gray'}`}>{label(value)}</span>
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || actions) && (
        <header className="card-head">
          <h3>{title}</h3>
          <div className="card-actions">{actions}</div>
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label: l, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{l}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ErrorNote({ error }: { error?: string | null }) {
  return error ? <div className="error-note">{error}</div> : null
}

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  )
}
