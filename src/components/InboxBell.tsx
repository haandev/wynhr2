import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { InboxItem } from '@wyndbase/sdk/plugins/inbox'
import { wyndbase } from '../wyndbase'

type Toast = { key: string; title: string; description?: string; target?: InboxItem['target'] }

/** Where a notification opens: PTO request notifications go to the approvals or time-off screen. */
function routeFor(item: { title: string; target?: InboxItem['target'] }) {
  if (item.target?.kind === 'row' && item.target.tablePath === 'pto.requests') {
    return item.title.startsWith('Your ') ? '/time-off' : '/approvals'
  }
  if (item.target?.kind === 'row' && item.target.tablePath === 'hr.employees') return `/people/${item.target.rowId}`
  return '/'
}

/**
 * The built-in inbox: unread count, a dropdown of items, and a toast for every new item.
 * A new item also refreshes the cached reads (approvals, my requests, balances), so the
 * screens follow without any live query of their own.
 */
export function InboxBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const unread = useQuery(wyndbase.inbox.unread.options())
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { unsubscribe } = wyndbase.inbox.subscribe({
      onNew: (items) => {
        setToasts((t) => [...t, ...items.map((i) => ({ key: i.id + Math.random(), title: i.title, description: i.description, target: i.target }))].slice(-4))
        qc.invalidateQueries()
      },
    })
    return unsubscribe
  }, [qc])

  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => setToasts((x) => x.slice(1)), 6000)
    return () => clearTimeout(t)
  }, [toasts])

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const data = unread.data
  const total = data?.total ?? 0
  const items = Object.values(data?.list ?? {})
    .flat()
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

  const openItem = async (i: InboxItem) => {
    setOpen(false)
    await wyndbase.inbox.markSeen(i.channelId as never, [i.id])
    navigate(routeFor(i))
  }

  return (
    <>
      <div className="inbox" ref={box}>
        <button className="bell" onClick={() => setOpen((o) => !o)} aria-label={`Inbox, ${total} unread`}>
          <span aria-hidden>🔔</span>
          {total > 0 && <span className="bell-count">{total > 99 ? '99+' : total}</span>}
        </button>
        {open && (
          <div className="inbox-panel">
            <div className="inbox-head">
              <b>Inbox</b>
              {total > 0 && (
                <button className="btn ghost sm" onClick={() => wyndbase.inbox.markAllSeen()}>
                  Mark all read
                </button>
              )}
            </div>
            {items.length ? (
              items.map((i) => (
                <button key={i.channelId + i.id} className="inbox-item" onClick={() => openItem(i)}>
                  <span className="dot" />
                  <span>
                    <b>{i.title}</b>
                    {i.description && <small>{i.description}</small>}
                    <em>{new Date(i.occurredAt).toLocaleString()}</em>
                  </span>
                </button>
              ))
            ) : (
              <div className="empty">You're all caught up.</div>
            )}
          </div>
        )}
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <button key={t.key} className="toast" onClick={() => { setToasts((x) => x.filter((y) => y.key !== t.key)); navigate(routeFor(t)) }}>
            <b>{t.title}</b>
            {t.description && <small>{t.description}</small>}
          </button>
        ))}
      </div>
    </>
  )
}
