import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { wyndbase } from '../wyndbase'
import { fmtDate, fmtHours, fmtMoney, label, thisYear, today, useAction, useMe } from '../lib/data'
import { Avatar, Card, Empty, ErrorNote, Field, Modal, Pill } from '../components/ui'

type Tab = 'job' | 'personal' | 'history' | 'pay' | 'timeoff' | 'audit'

export function Profile() {
  const { id = '' } = useParams()
  const { isHr, isHrAdmin } = useMe()
  const p = useQuery(wyndbase.query.hr.employeeProfile({ employeeId: id }))
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const e = p.data?.[0]
  const [tab, setTab] = useState<Tab>('job')
  const [modal, setModal] = useState<null | 'change' | 'correct' | 'status' | 'terminate' | 'adjust'>(null)
  const reports = (dir.data ?? []).filter((d) => d.managerId === id)

  if (p.isLoading) return <p className="muted">Loading…</p>
  if (!e) return <Empty>Employee not found or not visible to you.</Empty>

  const tabs: { k: Tab; l: string; show: boolean }[] = [
    { k: 'job', l: 'Job', show: true },
    { k: 'personal', l: 'Personal', show: true },
    { k: 'history', l: 'History', show: isHr },
    { k: 'pay', l: 'Compensation', show: isHr },
    { k: 'timeoff', l: 'Time Off', show: isHr || !!e.isSelf },
    { k: 'audit', l: 'Audit trail', show: isHrAdmin },
  ]

  return (
    <>
      <div className="profile-hero">
        <div className="profile-band" />
        <div className="profile-main">
          <Avatar name={e.name} size={96} />
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1>
              {e.name} {e.preferredName && e.preferredName !== e.givenName && <span className="muted" style={{ fontSize: 16 }}>“{e.preferredName}”</span>}
            </h1>
            <div className="profile-meta">
              <span>{e.jobTitle}</span>
              <span>· {e.department}</span>
              <span>· {e.workLocation}</span>
              <Pill value={e.status} />
            </div>
          </div>
          {e.canEdit && (
            <div className="page-actions" style={{ paddingBottom: 6 }}>
              <button className="btn primary sm" onClick={() => setModal('change')}>
                Record change
              </button>
              <button className="btn sm" onClick={() => setModal('correct')}>
                Correct
              </button>
              <button className="btn sm" onClick={() => setModal('status')}>
                Leave / return
              </button>
              {e.status !== 'terminated' && (
                <button className="btn sm danger" onClick={() => setModal('terminate')}>
                  Terminate
                </button>
              )}
            </div>
          )}
        </div>
        <div className="tabs">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>
                {t.l}
              </button>
            ))}
        </div>
      </div>

      {tab === 'job' && (
        <div className="grid side">
          <Card title="Job & organization">
            <dl className="kv">
              <dt>Employee ID</dt>
              <dd>{e.employeeNumber}</dd>
              <dt>Job title</dt>
              <dd>{e.jobTitle}</dd>
              <dt>Department</dt>
              <dd>{e.department}</dd>
              <dt>Product team</dt>
              <dd>{e.productTeam ?? '—'}</dd>
              <dt>Manager</dt>
              <dd>{e.managerId ? <Link to={`/people/${e.managerId}`}>{e.manager}</Link> : '—'}</dd>
              <dt>Office</dt>
              <dd>{e.workLocation}</dd>
              <dt>Legal entity</dt>
              <dd>{e.legalEntity}</dd>
              <dt>Cost center</dt>
              <dd>{e.costCenter}</dd>
              <dt>Employment</dt>
              <dd>
                {label(e.employmentType)} · {label(e.workSchedule)} · FTE {e.fte}
              </dd>
              <dt>Hire date</dt>
              <dd>{fmtDate(e.hireDate)}</dd>
              {e.terminationDate && (
                <>
                  <dt>Termination</dt>
                  <dd>
                    Last day {fmtDate(e.terminationDate)}
                    {e.terminationReason ? <> · {label(e.terminationReason)}</> : <span className="lock"> · reason visible to HR only</span>}
                    {e.terminationNote && <div className="muted">{e.terminationNote}</div>}
                  </dd>
                </>
              )}
            </dl>
          </Card>
          <Card title={`Direct reports (${reports.length})`}>
            {reports.length ? (
              reports.map((r) => (
                <Link key={r._id} to={`/people/${r._id}`} className="org-node">
                  <Avatar name={r.name} size={30} />
                  <div>
                    <b>{r.name}</b>
                    <div className="muted">{r.jobTitle}</div>
                  </div>
                </Link>
              ))
            ) : (
              <span className="muted">None</span>
            )}
          </Card>
        </div>
      )}

      {tab === 'personal' && (
        <div className="grid two">
          <Card title="Basic information">
            <dl className="kv">
              <dt>Legal name</dt>
              <dd>
                {e.givenName} {e.familyName}
              </dd>
              <dt>Preferred name</dt>
              <dd>{e.preferredName ?? '—'}</dd>
              <dt>Pronouns</dt>
              <dd>{e.pronouns ?? '—'}</dd>
            </dl>
            {e.isSelf && <p className="muted">You edit your own name, phones and addresses in your Wyndbase account settings; HR sees them here.</p>}
          </Card>
          <Card title="Contact">
            <dl className="kv">
              {(e.emails as { email: string; label: string | null; primary: boolean | null }[] | null)?.map((m) => (
                <Frag key={m.email}>
                  <dt>{label(m.label ?? 'email')}</dt>
                  <dd>{m.email}</dd>
                </Frag>
              ))}
              {(e.phones as { phone: string; label: string | null }[] | null)?.map((m) => (
                <Frag key={m.phone}>
                  <dt>{label(m.label ?? 'phone')}</dt>
                  <dd>{m.phone}</dd>
                </Frag>
              ))}
              {(e.addresses as { label: string | null; formatted: string | null; streetAddress: string | null; locality: string | null; postalCode: string | null; country: string | null }[] | null)?.map((a, i) => (
                <Frag key={i}>
                  <dt>{label(a.label ?? 'address')}</dt>
                  <dd>{a.formatted ?? [a.streetAddress, a.postalCode, a.locality, a.country].filter(Boolean).join(', ')}</dd>
                </Frag>
              ))}
            </dl>
            {!isHr && !e.isSelf && <p className="lock">🔒 Personal email, phone and address are visible to HR and the employee only.</p>}
          </Card>
        </div>
      )}

      {tab === 'history' && <History id={id} />}
      {tab === 'pay' && <Pay id={id} current={e.salary as { amount: number; currency: string; frequency: string; reason: string; _effectiveFrom: string }[] | null} />}
      {tab === 'timeoff' && <EmployeeTimeOff id={id} employeeNumber={e.employeeNumber} canAdjust={isHr && !e.isSelf} onAdjust={() => setModal('adjust')} />}
      {tab === 'audit' && <AuditTrail id={id} />}

      {(modal === 'change' || modal === 'correct') && <ChangeModal mode={modal} e={e} onClose={() => setModal(null)} />}
      {modal === 'status' && <StatusModal id={id} status={e.status} onClose={() => setModal(null)} />}
      {modal === 'terminate' && <TerminateModal id={id} name={e.name} onClose={() => setModal(null)} />}
      {modal === 'adjust' && <AdjustModal id={id} onClose={() => setModal(null)} />}
    </>
  )
}

const Frag = ({ children }: { children: React.ReactNode }) => <>{children}</>

type Period = { value: unknown; reason: string | null; _effectiveFrom: string; _effectiveTo: string | null }
function History({ id }: { id: string }) {
  const h = useQuery(wyndbase.query.hr.employeeHistory({ employeeId: id }))
  const row = h.data?.[0] as Record<string, unknown> | undefined
  if (h.error) return <ErrorNote error={String((h.error as Error).message)} />
  if (!row) return <p className="muted">Loading…</p>
  const fields: [string, string][] = [
    ['status', 'Status'],
    ['jobTitle', 'Job title'],
    ['department', 'Department'],
    ['productTeam', 'Product team'],
    ['manager', 'Manager'],
    ['workLocation', 'Office'],
    ['legalEntity', 'Legal entity'],
    ['costCenter', 'Cost center'],
    ['employmentType', 'Employment type'],
    ['workSchedule', 'Schedule'],
    ['fte', 'FTE'],
  ]
  return (
    <div className="grid two">
      {fields.map(([k, l]) => {
        const periods = ((row[k] as Period[] | null) ?? []).slice().sort((a, b) => (a._effectiveFrom < b._effectiveFrom ? 1 : -1))
        return (
          <Card key={k} title={l}>
            {periods.length ? (
              <ul className="timeline">
                {periods.map((p, i) => (
                  <li key={i}>
                    <span className="when">
                      {fmtDate(p._effectiveFrom)} → {p._effectiveTo ? fmtDate(p._effectiveTo) : 'now'}
                    </span>
                    <span>
                      <b>{label(String(p.value ?? '—'))}</b>
                      {p.reason && <div className="reason">{p.reason}</div>}
                      {p._effectiveFrom > today() && <span className="chip">scheduled</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="muted">—</span>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function Pay({ id, current }: { id: string; current: { amount: number; currency: string; frequency: string; reason: string; _effectiveFrom: string }[] | null }) {
  const h = useQuery(wyndbase.query.hr.compensationHistory({ employeeId: id }))
  const rows = h.data ?? []
  if (!current?.length && !rows.length) return <Card title="Compensation"><p className="lock">🔒 Visible to HR only.</p></Card>
  return (
    <Card title="Compensation history" className="flush">
      <table className="tbl">
        <thead>
          <tr>
            <th>Effective</th>
            <th className="num">Amount</th>
            <th>Frequency</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .slice()
            .reverse()
            .map((r, i) => (
              <tr key={i}>
                <td>
                  {fmtDate(r._effectiveFrom)} → {r._effectiveTo ? fmtDate(r._effectiveTo) : 'now'}
                </td>
                <td className="num">{fmtMoney(r.amount, r.currency)}</td>
                <td>{label(r.frequency)}</td>
                <td className="muted">{r.reason}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </Card>
  )
}

function EmployeeTimeOff({ id, employeeNumber, canAdjust, onAdjust }: { id: string; employeeNumber: string | null; canAdjust: boolean; onAdjust: () => void }) {
  const year = thisYear()
  const bal = useQuery(wyndbase.query.report.ptoBalances({ year }))
  const ledger = useQuery(wyndbase.query.pto.ledgerFor({ employeeId: id, year }))
  const mine = (bal.data ?? []).filter((b) => b.employeeNumber === employeeNumber)
  return (
    <div className="stack">
      <Card title={`Balances ${year}`} actions={canAdjust && <button className="btn sm" onClick={onAdjust}>Adjust balance</button>} className="flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Type</th>
              <th className="num">Accrued</th>
              <th className="num">Adjusted</th>
              <th className="num">Used</th>
              <th className="num">Pending</th>
              <th className="num">Remaining</th>
              <th className="num">Projected</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((b, i) => (
              <tr key={i}>
                <td>{b.ptoType}</td>
                <td className="num">{fmtHours(b.accrued)}</td>
                <td className="num">{fmtHours(b.adjusted)}</td>
                <td className="num">{fmtHours(b.used)}</td>
                <td className="num">{fmtHours(b.pending)}</td>
                <td className="num"><b>{fmtHours(b.remaining)}</b></td>
                <td className="num">{fmtHours(b.projected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Ledger" className="flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Kind</th>
              <th>Period</th>
              <th className="num">Hours</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {ledger.data?.map((l) => (
              <tr key={l._id}>
                <td>{fmtDate(l.entryDate)}</td>
                <td>{l.ptoType}</td>
                <td>
                  <span className="chip">{label(l.kind)}</span>
                </td>
                <td className="muted">{l.payPeriod ?? '—'}</td>
                <td className="num">{fmtHours(l.hours)}</td>
                <td className="muted">{l.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AuditTrail({ id }: { id: string }) {
  const a = useQuery(wyndbase.query.hr.auditTrail({ employeeId: id }))
  const users = useQuery(wyndbase.query.hr.directory({}))
  const nameOf = (uid: string | null) => users.data?.find((u) => u.userId === uid)?.name ?? (uid?.startsWith('00000000') ? 'System / designer' : uid ?? 'system')
  return (
    <Card title="Who changed what" className="flush">
      <table className="tbl">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Op</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          {a.data?.map((r, i) => {
            const o = (r.oldValues ?? {}) as Record<string, unknown>
            const n = (r.newValues ?? {}) as Record<string, unknown>
            const show = (v: Record<string, unknown>) =>
              'value' in v ? `${String(v.value)}${v.reason ? ` (${v.reason})` : ''} [${v._effectiveFrom ?? ''}→${v._effectiveTo ?? '∞'}]` : Object.keys(v).length ? 'record' : '—'
            return (
              <tr key={i}>
                <td className="muted">{new Date(r.timestamp ?? '').toLocaleString()}</td>
                <td>{nameOf(r.user as string | null)}</td>
                <td>
                  <span className="chip">{r.operation}</span>
                </td>
                <td className="muted">{show(o)}</td>
                <td>{show(n)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

type Emp = NonNullable<ReturnType<typeof useEmp>>
function useEmp() {
  return null as null | { _id: string; jobTitle: string | null; departmentId: string | null; productTeamId: string | null; managerId: string | null; workLocationId: string | null; legalEntityId: string | null; costCenterId: string | null; employmentType: string | null; workSchedule: string | null; fte: string | null }
}

function ChangeModal({ mode, e, onClose }: { mode: 'change' | 'correct'; e: Emp; onClose: () => void }) {
  const deps = useQuery(wyndbase.query.org.listDepartments())
  const teams = useQuery(wyndbase.query.org.listProductTeams())
  const locs = useQuery(wyndbase.query.org.listLocations())
  const les = useQuery(wyndbase.query.org.listLegalEntities())
  const ccs = useQuery(wyndbase.query.org.listCostCenters())
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const initial = useMemo(
    () => ({
      jobTitle: e.jobTitle ?? '',
      departmentId: e.departmentId ?? '',
      productTeamId: e.productTeamId ?? '',
      managerId: e.managerId ?? '',
      workLocationId: e.workLocationId ?? '',
      legalEntityId: e.legalEntityId ?? '',
      costCenterId: e.costCenterId ?? '',
      employmentType: e.employmentType ?? '',
      workSchedule: e.workSchedule ?? '',
      fte: e.fte ?? '',
    }),
    [e],
  )
  const [v, setV] = useState(initial)
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('')
  const { run, busy, error } = useAction()
  const set = (k: keyof typeof v) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: ev.target.value })
  const changed = Object.fromEntries(Object.entries(v).filter(([k, val]) => val !== initial[k as keyof typeof v] && val !== ''))

  const save = async () => {
    const fte = changed.fte !== undefined ? parseFloat(changed.fte) : null
    const params = { employeeId: e._id, reason, ...changed, fte }
    const r =
      mode === 'change'
        ? await run(() => wyndbase.mutation.hr.recordChange({ effectiveDate: date, ...params }))
        : await run(() => wyndbase.mutation.hr.correctRecord({ periodDate: date, ...params }))
    if (r) onClose()
  }

  return (
    <Modal
      title={mode === 'change' ? 'Record a change' : 'Correct a recorded value'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy || !reason.trim() || !Object.keys(changed).length} onClick={save}>
            Save {Object.keys(changed).length ? `(${Object.keys(changed).length})` : ''}
          </button>
        </>
      }
    >
      <div className="info-note">
        {mode === 'change'
          ? 'A change opens a new effective-dated period from the date below. History is kept.'
          : 'A correction fixes the value of the period that covers the date below, in place. The old value stays in the audit trail.'}
      </div>
      <ErrorNote error={error} />
      <div className="row">
        <Field label={mode === 'change' ? 'Effective from' : 'Period covering'}>
          <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
        </Field>
        <Field label="Reason (required)">
          <input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder={mode === 'change' ? 'Promotion, transfer…' : 'Typo, wrong team…'} />
        </Field>
      </div>
      <Field label="Job title">
        <input value={v.jobTitle} onChange={set('jobTitle')} />
      </Field>
      <div className="row">
        <Field label="Department">
          <select value={v.departmentId} onChange={set('departmentId')}>
            {deps.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Product team">
          <select value={v.productTeamId} onChange={set('productTeamId')}>
            <option value="">—</option>
            {teams.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="Manager">
          <select value={v.managerId} onChange={set('managerId')}>
            <option value="">—</option>
            {dir.data?.filter((d) => d._id !== e._id).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Office">
          <select value={v.workLocationId} onChange={set('workLocationId')}>
            {locs.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="Legal entity">
          <select value={v.legalEntityId} onChange={set('legalEntityId')}>
            {les.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Cost center">
          <select value={v.costCenterId} onChange={set('costCenterId')}>
            {ccs.data?.map((d) => <option key={d._id} value={d._id}>{d.code} {d.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="row3">
        <Field label="Employment type">
          <select value={v.employmentType} onChange={set('employmentType')}>
            {['permanent', 'fixed_term', 'contractor', 'intern'].map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        <Field label="Schedule">
          <select value={v.workSchedule} onChange={set('workSchedule')}>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
          </select>
        </Field>
        <Field label="FTE">
          <input type="number" step="0.05" min="0.1" max="1" value={v.fte} onChange={set('fte')} />
        </Field>
      </div>
    </Modal>
  )
}

function StatusModal({ id, status, onClose }: { id: string; status: string | null; onClose: () => void }) {
  const next = status === 'leave' ? 'active' : 'leave'
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('')
  const { run, busy, error } = useAction()
  return (
    <Modal
      title={next === 'leave' ? 'Start leave of absence' : 'Return from leave'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !reason.trim()} onClick={async () => { if (await run(() => wyndbase.mutation.hr.changeStatus({ employeeId: id, status: next, effectiveDate: date, reason }))) onClose() }}>
            Save
          </button>
        </>
      }
    >
      <ErrorNote error={error} />
      <div className="info-note">PTO accrual follows the country policy: accrual pauses during leave unless the policy accrues during leave.</div>
      <div className="row">
        <Field label="Effective date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Parental leave, sabbatical…" /></Field>
      </div>
    </Modal>
  )
}

function TerminateModal({ id, name, onClose }: { id: string; name: string | null; onClose: () => void }) {
  const [date, setDate] = useState(today())
  const [reason, setReason] = useState('resignation')
  const [note, setNote] = useState('')
  const { run, busy, error } = useAction()
  return (
    <Modal
      title={`Terminate ${name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy} onClick={async () => { if (await run(() => wyndbase.mutation.hr.terminateEmployee({ employeeId: id, terminationDate: date, terminationReason: reason, note: note || null }))) onClose() }}>
            Terminate
          </button>
        </>
      }
    >
      <ErrorNote error={error && (error.includes('satisfy its rule') ? 'Only an active employee can be terminated. End the leave first.' : error)} />
      <div className="row">
        <Field label="Last working day"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason (HR only)">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {['resignation', 'dismissal', 'layoff', 'end_of_contract', 'retirement', 'mutual', 'other'].map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Note (HR only)"><textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  )
}

function AdjustModal({ id, onClose }: { id: string; onClose: () => void }) {
  const types = useQuery(wyndbase.query.pto.listTypes())
  const [typeId, setTypeId] = useState('')
  const [hours, setHours] = useState(8)
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(today())
  const { run, busy, error } = useAction()
  const t = typeId || types.data?.[0]?._id
  return (
    <Modal
      title="Manual balance adjustment"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !reason.trim()} onClick={async () => { if (await run(() => wyndbase.mutation.pto.adjustBalance({ employeeId: id, ptoTypeId: t, hours, reason, entryDate: date }))) onClose() }}>
            Add adjustment
          </button>
        </>
      }
    >
      <ErrorNote error={error} />
      <div className="row">
        <Field label="Type">
          <select value={t ?? ''} onChange={(e) => setTypeId(e.target.value)}>
            {types.data?.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Hours (negative to deduct)"><input type="number" step="0.5" value={hours} onChange={(e) => setHours(parseFloat(e.target.value))} /></Field>
      </div>
      <div className="row">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
