import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { fmtDate, fmtHours, label, thisYear, today, useAction, useMe, params as clean } from '../lib/data'
import { Card, Empty, ErrorNote, Field, Modal, PageHead, Pill } from '../components/ui'

type Tab = 'policies' | 'periods' | 'holidays'

export function PtoAdmin() {
  const [tab, setTab] = useState<Tab>('policies')
  return (
    <>
      <PageHead title="Time Off Settings" sub="Policies by country and employment type, pay-period accruals with retroactive recalculation, public holidays." />
      <div className="profile-hero" style={{ marginBottom: 18 }}>
        <div className="tabs" style={{ borderTop: 0 }}>
          {(
            [
              ['policies', 'Policies'],
              ['periods', 'Pay periods & accruals'],
              ['holidays', 'Public holidays'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'policies' && <Policies />}
      {tab === 'periods' && <Periods />}
      {tab === 'holidays' && <Holidays />}
    </>
  )
}

type Policy = { _id: string; name: string | null; code: string | null; accrualHoursPerPeriod: string | null; annualCapHours: string | null; maxCarryoverHours: string | null; accrueDuringLeave: boolean | null }

function Policies() {
  const { isHrAdmin } = useMe()
  const pols = useQuery(wyndbase.query.pto.listPolicies())
  const { run, error, busy } = useAction()
  const [edit, setEdit] = useState<Policy | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <>
      <ErrorNote error={error} />
      {msg && <div className="info-note">{msg}</div>}
      <Card className="flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Group</th>
              <th className="num">Accrual / period</th>
              <th className="num">Annual cap</th>
              <th className="num">Max carryover</th>
              <th>On leave</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pols.data?.map((p) => (
              <tr key={p._id}>
                <td>
                  <b>{p.name}</b>
                  <div className="muted">
                    {p.code} · {p.ptoType} · {label(p.payFrequency)}
                  </div>
                </td>
                <td>
                  <span className="chip">{p.country}</span>{' '}
                  {/* typegen types this multi-select as a single key; the server returns an array */}
                  {((p.employmentTypes as unknown as string[] | null) ?? []).map((t) => (
                    <span key={t} className="chip" style={{ marginLeft: 4 }}>
                      {label(t)}
                    </span>
                  ))}
                </td>
                <td className="num">{fmtHours(p.accrualHoursPerPeriod)}</td>
                <td className="num">{fmtHours(p.annualCapHours)}</td>
                <td className="num">{fmtHours(p.maxCarryoverHours)}</td>
                <td>{p.accrueDuringLeave ? 'Accrues' : 'Paused'}</td>
                <td className="num">
                  {isHrAdmin && (
                    <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn sm"
                        disabled={busy}
                        onClick={async () => {
                          const r = (await run(() => wyndbase.mutation.pto.assignPolicyToGroup({ policyId: p._id, from: today() }))) as unknown[] | undefined
                          if (r) setMsg(`${p.name}: assigned to ${r.length} new employee(s) of the group.`)
                        }}
                      >
                        Assign to group
                      </button>
                      <button className="btn sm primary" onClick={() => setEdit(p)}>
                        Change
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {edit && <PolicyModal p={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function PolicyModal({ p, onClose }: { p: Policy; onClose: () => void }) {
  const hist = useQuery(wyndbase.query.pto.policyHistory({ policyId: p._id }))
  const [date, setDate] = useState(today())
  const [rate, setRate] = useState(p.accrualHoursPerPeriod ?? '')
  const [cap, setCap] = useState(p.annualCapHours ?? '')
  const [carry, setCarry] = useState(p.maxCarryoverHours ?? '')
  const [leave, setLeave] = useState(!!p.accrueDuringLeave)
  const { run, busy, error } = useAction()
  const rates = (hist.data?.[0]?.rate as { value: number; _effectiveFrom: string; _effectiveTo: string | null }[] | undefined) ?? []
  const num = (s: string, old: string | null) => (s !== '' && s !== old ? parseFloat(s) : null)

  return (
    <Modal
      title={`Change ${p.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              const r = await run(() =>
                wyndbase.mutation.pto.changePolicy(clean({
                  policyId: p._id,
                  effectiveDate: date,
                  accrualHoursPerPeriod: num(String(rate), p.accrualHoursPerPeriod),
                  annualCapHours: num(String(cap), p.annualCapHours),
                  maxCarryoverHours: num(String(carry), p.maxCarryoverHours),
                  accrueDuringLeave: leave !== !!p.accrueDuringLeave ? leave : null,
                })),
              )
              if (r) onClose()
            }}
          >
            Save
          </button>
        </>
      }
    >
      <ErrorNote error={error} />
      <div className="info-note">
        A change applies from the date below. If that date is in the past, use <b>Pay periods → Preview recalculation</b> to post the difference for periods already accrued.
      </div>
      <Field label="Effective from"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="row3">
        <Field label="Hours / period"><input type="number" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Annual cap (h)"><input type="number" value={cap} onChange={(e) => setCap(e.target.value)} /></Field>
        <Field label="Max carryover (h)"><input type="number" value={carry} onChange={(e) => setCarry(e.target.value)} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={leave} onChange={(e) => setLeave(e.target.checked)} /> Keep accruing during leave</label>
      <Field label="Rate history">
        <ul className="timeline">
          {rates.slice().sort((a, b) => (a._effectiveFrom < b._effectiveFrom ? 1 : -1)).map((r, i) => (
            <li key={i}>
              <span className="when">{fmtDate(r._effectiveFrom)} → {r._effectiveTo ? fmtDate(r._effectiveTo) : 'now'}</span>
              <span>{fmtHours(r.value)} per period</span>
            </li>
          ))}
        </ul>
      </Field>
    </Modal>
  )
}

function Periods() {
  const { isHrAdmin } = useMe()
  const [year, setYear] = useState(thisYear())
  const periods = useQuery(wyndbase.query.pto.listPayPeriods({ year }))
  const { run, busy, error } = useAction()
  const [preview, setPreview] = useState<{ id: string; label: string | null } | null>(null)

  return (
    <>
      <ErrorNote error={error} />
      <div className="filters">
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
          {[thisYear() - 1, thisYear(), thisYear() + 1].map((y) => <option key={y}>{y}</option>)}
        </select>
        <span className="muted">Accruals post automatically every night for periods that have ended; you can also post or recalculate by hand.</span>
      </div>
      <Card className="flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Period</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Posted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {periods.data?.map((p) => (
              <tr key={p._id}>
                <td><b>{p.label}</b></td>
                <td>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</td>
                <td><Pill value={p.accrualStatus} /></td>
                <td className="muted">{p.accruedAt ? new Date(p.accruedAt).toLocaleString() : '—'}</td>
                <td className="num">
                  {isHrAdmin && (
                    <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
                      {p.accrualStatus === 'open' && (
                        <button className="btn sm primary" disabled={busy || (p.endDate ?? '') > today()} title={(p.endDate ?? '') > today() ? 'Period has not ended yet' : ''} onClick={() => run(() => wyndbase.mutation.pto.postAccruals({ payPeriodId: p._id }))}>
                          Post accruals
                        </button>
                      )}
                      {p.accrualStatus === 'accrued' && (
                        <button className="btn sm" onClick={() => setPreview({ id: p._id, label: p.label })}>
                          Preview recalculation
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {preview && <RecalcModal period={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

function RecalcModal({ period, onClose }: { period: { id: string; label: string | null }; onClose: () => void }) {
  const pv = useQuery(wyndbase.query.pto.previewRecalculation({ payPeriodId: period.id }))
  const [reason, setReason] = useState('')
  const { run, busy, error } = useAction()
  const rows = pv.data ?? []
  return (
    <Modal
      title={`Recalculation preview — ${period.label}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" disabled={busy || !rows.length || !reason.trim()} onClick={async () => { if (await run(() => wyndbase.mutation.pto.applyRecalculation({ payPeriodId: period.id, reason }))) onClose() }}>
            Apply {rows.length} change(s)
          </button>
        </>
      }
    >
      <ErrorNote error={error} />
      <p className="muted">Compares what was posted with what the policy rate, employee status and FTE effective on the period end say it should be.</p>
      {rows.length ? (
        <table className="tbl">
          <thead><tr><th>Employee</th><th>Policy</th><th className="num">Posted</th><th className="num">Should be</th><th className="num">Δ</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.employee}</td>
                <td className="muted">{r.policyName}</td>
                <td className="num">{fmtHours(r.current)}</td>
                <td className="num">{fmtHours(r.expected)}</td>
                <td className="num" style={{ color: parseFloat(String(r.delta)) < 0 ? 'var(--red)' : 'var(--green-dark)' }}>{fmtHours(r.delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>{pv.isLoading ? 'Calculating…' : 'Nothing to change — this period is up to date.'}</Empty>
      )}
      {rows.length > 0 && <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Policy rate changed retroactively…" /></Field>}
    </Modal>
  )
}

function Holidays() {
  const { isHr } = useMe()
  const [year, setYear] = useState(thisYear())
  const [country, setCountry] = useState('TR')
  const hol = useQuery(wyndbase.query.pto.listHolidays({ year, country }))
  const { run, busy, error } = useAction()
  const drafts = (hol.data ?? []).filter((h) => h.status === 'draft').length
  return (
    <>
      <ErrorNote error={error} />
      <div className="filters">
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="TR">Türkiye</option>
          <option value="DE">Germany</option>
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
          {[thisYear() - 1, thisYear(), thisYear() + 1].map((y) => <option key={y}>{y}</option>)}
        </select>
        {isHr && (
          <>
            <button className="btn sm" disabled={busy} onClick={() => run(() => wyndbase.mutation.pto.copyHolidays({ country, fromYear: year }))}>
              Copy to {year + 1} as drafts
            </button>
            {drafts > 0 && (
              <button className="btn sm primary" disabled={busy} onClick={() => run(() => wyndbase.mutation.pto.activateHolidays({ country, year }))}>
                Activate {drafts} draft(s)
              </button>
            )}
          </>
        )}
      </div>
      <Card className="flush">
        {hol.data?.length ? (
          <table className="tbl">
            <tbody>
              {hol.data.map((h) => (
                <tr key={h._id}>
                  <td>{fmtDate(h.date)}</td>
                  <td><b>{h.name}</b>{h.halfDay && <span className="chip" style={{ marginLeft: 6 }}>half day</span>}</td>
                  <td><Pill value={h.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No holidays for {country} {year}. Copy the previous year to start.</Empty>
        )}
      </Card>
    </>
  )
}
