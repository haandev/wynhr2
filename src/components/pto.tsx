import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { fmtDate, fmtDays, fmtHours, thisYear, today, useAction, workingHours } from '../lib/data'
import { ErrorNote, Field, Modal, Pill } from './ui'

export function Balances({ year = thisYear() }: { year?: number }) {
  const q = useQuery(wyndbase.query.pto.myOverview({ year }))
  const rows = q.data ?? []
  if (!rows.length) return <div className="info-note">No time-off balances yet for {year}.</div>
  return (
    <div className="balances">
      {rows.map((b) => {
        const accrued = parseFloat(b.accrued ?? '0') + parseFloat(b.adjusted ?? '0')
        const remaining = parseFloat(b.remaining ?? '0')
        const pct = accrued > 0 ? Math.max(0, Math.min(100, (remaining / accrued) * 100)) : 0
        return (
          <div className="bal" key={b._id} style={{ ['--c' as string]: b.color ?? 'var(--green)' }}>
            <h4>
              {b.ptoType} <span className="muted">{b.paid ? 'Paid' : 'Unpaid'}</span>
            </h4>
            <div className="big">
              {fmtDays(b.remaining)} <small>available</small>
            </div>
            <div className="muted">{fmtHours(b.remaining)}</div>
            <div className="bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="meta">
              <span>Accrued {fmtHours(accrued)}</span>
              <span>Used {fmtHours(b.used)}</span>
              <span>Pending {fmtHours(b.pending)}</span>
              <span>Year-end {fmtHours(b.projected)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RequestTimeOff({ onClose, country }: { onClose: () => void; country?: string | null }) {
  const types = useQuery(wyndbase.query.pto.listTypes())
  const year = thisYear()
  const hol = useQuery(wyndbase.query.pto.listHolidays({ year, country: country ?? null }))
  const holNext = useQuery(wyndbase.query.pto.listHolidays({ year: year + 1, country: country ?? null }))
  const [typeId, setTypeId] = useState('')
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState(today())
  const [partial, setPartial] = useState(false)
  const [partialHours, setPartialHours] = useState(4)
  const [note, setNote] = useState('')
  const { run, busy, error } = useAction()

  const activeHolidays = useMemo(
    () => [...(hol.data ?? []), ...(holNext.data ?? [])].filter((h) => h.status === 'active'),
    [hol.data, holNext.data],
  )
  const hours = partial ? partialHours : workingHours(start, end, activeHolidays)
  const holidaysInRange = activeHolidays.filter((h) => h.date && h.date >= start && h.date <= (partial ? start : end))
  const type = types.data?.find((t) => t._id === typeId) ?? types.data?.[0]

  const submit = async () => {
    const r = await run(() =>
      wyndbase.mutation.pto.submitRequest({
        ptoTypeId: type?._id,
        startDate: start,
        endDate: partial ? start : end,
        hours,
        partialDay: partial,
        note: note || null,
      }),
    )
    if (r) onClose()
  }

  return (
    <Modal
      title="Request time off"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy || hours < 2 || !type} onClick={submit}>
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </>
      }
    >
      <ErrorNote error={error && humanize(error)} />
      <Field label="Time off category">
        <select value={type?._id ?? ''} onChange={(e) => setTypeId(e.target.value)}>
          {types.data?.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} {t.paid ? '' : '(unpaid)'}
            </option>
          ))}
        </select>
      </Field>
      <label className="check">
        <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} /> Partial day
      </label>
      {partial ? (
        <div className="row">
          <Field label="Date">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Hours" hint="Minimum 2 hours">
            <input type="number" min={2} max={7.5} step={0.5} value={partialHours} onChange={(e) => setPartialHours(parseFloat(e.target.value))} />
          </Field>
        </div>
      ) : (
        <div className="row">
          <Field label="From">
            <input type="date" value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value) }} />
          </Field>
          <Field label="To">
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      )}
      <div className="info-note">
        <b>{fmtHours(hours)}</b> ({fmtDays(hours)}) requested
        {holidaysInRange.length > 0 && (
          <> · excludes {holidaysInRange.map((h) => h.name).join(', ')}</>
        )}
      </div>
      <Field label="Note (optional)">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything your manager should know" />
      </Field>
    </Modal>
  )
}

export function humanize(e: string) {
  if (e.includes('balance_not_exceeded')) return 'Not enough balance for this request.'
  if (e.includes('min_two_hours')) return 'A request is at least 2 hours.'
  if (e.includes('invalid FSM transition')) return 'This request can no longer be changed that way.'
  return e
}

export function RequestRow({ r, onCancel, showPerson }: {
  r: { _id: string; employee: string | null; ptoType: string | null; color: string | null; startDate: string | null; endDate: string | null; hours: string | null; status: string | null; decisionNote: string | null; note: string | null }
  onCancel?: () => void
  showPerson?: boolean
}) {
  return (
    <tr>
      {showPerson && <td>{r.employee}</td>}
      <td>
        <span className="chip" style={{ background: (r.color ?? '#888') + '22', color: r.color ?? undefined }}>
          {r.ptoType}
        </span>
      </td>
      <td>
        {fmtDate(r.startDate)}
        {r.endDate !== r.startDate && <> – {fmtDate(r.endDate)}</>}
      </td>
      <td className="num">{fmtHours(r.hours)}</td>
      <td>
        <Pill value={r.status} />
      </td>
      <td className="muted">{r.decisionNote ?? r.note ?? ''}</td>
      <td className="num">
        {onCancel && (r.status === 'pending' || (r.status === 'approved' && (r.startDate ?? '') > today())) && (
          <button className="btn sm danger" onClick={onCancel}>
            Cancel
          </button>
        )}
      </td>
    </tr>
  )
}
