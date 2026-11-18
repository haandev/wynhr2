import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { fmtDate, fmtHours, label, thisYear, today, useAction, useMe } from '../lib/data'
import { Card, Empty, ErrorNote, PageHead, Pill } from '../components/ui'
import { ExportButtons, OrgFilters, type OrgFilter } from '../components/Filters'
import { exportRows, type Format } from '../lib/exporter'

type Tab = 'balances' | 'usage' | 'summary' | 'calendar'

const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00')
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}

export function Reports() {
  const { me } = useMe()
  const [tab, setTab] = useState<Tab>('balances')
  const [f, setF] = useState<OrgFilter>({ departmentId: null, locationId: null, status: null })
  const [year, setYear] = useState(thisYear())
  const [from, setFrom] = useState(`${thisYear()}-01-01`)
  const [to, setTo] = useState(`${thisYear()}-12-31`)
  const [byTeam, setByTeam] = useState(false)
  const { run, error } = useAction()

  const balances = useQuery({ ...wyndbase.query.report.ptoBalances({ year, ...f }), enabled: tab === 'balances' })
  const usage = useQuery({ ...wyndbase.query.report.ptoUsage({ from, to, ...f, includePending: true }), enabled: tab === 'usage' })
  const byDept = useQuery({ ...wyndbase.query.report.leaveSummary({ from, to }), enabled: tab === 'summary' && !byTeam })
  const byTeamQ = useQuery({ ...wyndbase.query.report.leaveSummaryByTeam({ from, to }), enabled: tab === 'summary' && byTeam })

  const ex = (format: Format) => {
    const filters = { ...f, year, from, to, byTeam }
    const common = { format, filters, generatedByName: me?.name }
    if (tab === 'balances')
      return run(() => exportRows({ ...common, report: 'pto_balances', title: `PTO balances ${year}`, rows: balances.data ?? [], columns: [
        { key: 'employeeNumber', label: 'ID' }, { key: 'employee', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'office', label: 'Office' },
        { key: 'ptoType', label: 'Type' }, { key: 'accrued', label: 'Accrued h' }, { key: 'adjusted', label: 'Adjusted h' }, { key: 'used', label: 'Used h' },
        { key: 'pending', label: 'Pending h' }, { key: 'remaining', label: 'Remaining h' }, { key: 'projected', label: 'Projected h' }] }))
    if (tab === 'usage')
      return run(() => exportRows({ ...common, report: 'pto_usage', title: `PTO usage ${from} – ${to}`, rows: usage.data ?? [], columns: [
        { key: 'employee', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'office', label: 'Office' }, { key: 'ptoType', label: 'Type' },
        { key: 'startDate', label: 'From' }, { key: 'endDate', label: 'To' }, { key: 'hours', label: 'Hours' }, { key: 'status', label: 'Status' }, { key: 'decidedBy', label: 'Decided by' }] }))
    if (tab === 'summary')
      return run(() => exportRows({ ...common, report: 'leave_summary', title: `Leave summary by ${byTeam ? 'product team' : 'department'}`, rows: (byTeam ? byTeamQ.data : byDept.data) ?? [], columns: [
        { key: byTeam ? 'team' : 'department', label: byTeam ? 'Product team' : 'Department' }, { key: 'ptoType', label: 'Type' }, { key: 'hours', label: 'Hours' }, { key: 'requests', label: 'Requests' }, { key: 'people', label: 'People' }] }))
  }

  return (
    <>
      <PageHead title="Reports" sub="Every report runs under your access rules — you only ever see and export what you may read." actions={tab !== 'calendar' && <ExportButtons onExport={ex} />} />
      <ErrorNote error={error} />
      <div className="profile-hero" style={{ marginBottom: 18 }}>
        <div className="tabs" style={{ borderTop: 0 }}>
          {([['balances', 'PTO balances'], ['usage', 'PTO usage history'], ['summary', 'Leave summary'], ['calendar', 'Availability calendar']] as const).map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="filters">
        {tab === 'balances' ? (
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>{[thisYear() - 1, thisYear(), thisYear() + 1].map((y) => <option key={y}>{y}</option>)}</select>
        ) : tab !== 'calendar' ? (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : null}
        {(tab === 'balances' || tab === 'usage' || tab === 'calendar') && <OrgFilters value={f} onChange={setF} />}
        {tab === 'summary' && (
          <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={byTeam} onChange={(e) => setByTeam(e.target.checked)} /> By product team</label>
        )}
      </div>

      {tab === 'balances' && (
        <Card className="flush">
          {balances.data?.length ? (
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Type</th><th className="num">Accrued</th><th className="num">Adjusted</th><th className="num">Used</th><th className="num">Pending</th><th className="num">Remaining</th><th className="num">Projected</th></tr></thead>
              <tbody>
                {balances.data.map((b, i) => (
                  <tr key={i}>
                    <td><b>{b.employee}</b><div className="muted">{b.department} · {b.office}</div></td>
                    <td>{b.ptoType}</td>
                    <td className="num">{fmtHours(b.accrued)}</td><td className="num">{fmtHours(b.adjusted)}</td><td className="num">{fmtHours(b.used)}</td>
                    <td className="num">{fmtHours(b.pending)}</td><td className="num"><b>{fmtHours(b.remaining)}</b></td><td className="num">{fmtHours(b.projected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>{balances.isLoading ? 'Loading…' : 'No balances in scope.'}</Empty>}
        </Card>
      )}

      {tab === 'usage' && (
        <Card className="flush">
          {usage.data?.length ? (
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Type</th><th>When</th><th className="num">Hours</th><th>Status</th><th>Decided by</th></tr></thead>
              <tbody>
                {usage.data.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.employee}</b><div className="muted">{r.department}</div></td>
                    <td>{r.ptoType}</td>
                    <td>{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</td>
                    <td className="num">{fmtHours(r.hours)}</td>
                    <td><Pill value={r.status} /></td>
                    <td className="muted">{r.decidedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>{usage.isLoading ? 'Loading…' : 'No time off in this range.'}</Empty>}
        </Card>
      )}

      {tab === 'summary' && (
        <Card className="flush">
          {((byTeam ? byTeamQ.data : byDept.data) ?? []).length ? (
            <table className="tbl">
              <thead><tr><th>{byTeam ? 'Product team' : 'Department'}</th><th>Type</th><th className="num">Hours</th><th className="num">Requests</th><th className="num">People</th></tr></thead>
              <tbody>
                {((byTeam ? byTeamQ.data : byDept.data) ?? []).map((r, i) => (
                  <tr key={i}>
                    <td><b>{(r as { team?: string | null; department?: string | null }).team ?? (r as { department?: string | null }).department ?? '(none)'}</b></td>
                    <td>{r.ptoType}</td>
                    <td className="num">{fmtHours(r.hours)}</td>
                    <td className="num">{r.requests}</td>
                    <td className="num">{r.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No approved time off in this range.</Empty>}
        </Card>
      )}

      {tab === 'calendar' && <Calendar f={f} />}
    </>
  )
}

function Calendar({ f }: { f: OrgFilter }) {
  const [start, setStart] = useState(today().slice(0, 8) + '01')
  const days = useMemo(() => {
    const out: string[] = []
    const d = new Date(start + 'T00:00:00')
    const m = d.getMonth()
    while (d.getMonth() === m) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [start])
  const end = days[days.length - 1]
  const out = useQuery(wyndbase.query.report.availability({ from: start, to: end, ...f }))
  const dir = useQuery(wyndbase.query.hr.directory({ departmentId: f.departmentId, locationId: f.locationId, status: f.status }))
  const locs = useQuery(wyndbase.query.org.listLocations())
  const year = parseInt(start.slice(0, 4))
  const holTR = useQuery(wyndbase.query.pto.listHolidays({ year, country: 'TR' }))
  const holDE = useQuery(wyndbase.query.pto.listHolidays({ year, country: 'DE' }))
  const hol = [...(holTR.data ?? []), ...(holDE.data ?? [])].filter((h) => h.status === 'active')
  const people = (dir.data ?? []).filter((p) => p.status !== 'terminated')
  const isWe = (d: string) => [0, 6].includes(new Date(d + 'T00:00:00').getDay())
  const monthName = new Date(start + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <Card
      title={monthName}
      actions={
        <>
          <button className="btn sm" onClick={() => setStart(addDays(start, -1).slice(0, 8) + '01')}>‹</button>
          <button className="btn sm" onClick={() => setStart(today().slice(0, 8) + '01')}>Today</button>
          <button className="btn sm" onClick={() => setStart(addDays(end, 1))}>›</button>
        </>
      }
    >
      <div className="cal" style={{ ['--days' as string]: days.length }}>
        <div className="h" />
        {days.map((d) => <div key={d} className={`h ${isWe(d) ? 'we' : ''}`}>{parseInt(d.slice(8))}</div>)}
        {people.map((p) => {
          const country = locs.data?.find((l) => l._id === p.workLocationId)?.country
          return (
            <Row key={p._id} name={p.name} days={days} isWe={isWe}
              hol={(d) => hol.some((h) => h.date === d && h.country === country)}
              off={(d) => out.data?.find((r) => r.employeeId === p._id && (r.startDate ?? '') <= d && (r.endDate ?? '') >= d)}
            />
          )
        })}
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        <span className="chip" style={{ background: '#fff6dc' }}>Public holiday</span>
        <span className="chip" style={{ background: '#3b82f655' }}>Pending (faded)</span>
        <span className="chip">{label('approved')} = solid colour</span>
      </div>
    </Card>
  )
}

function Row({ name, days, isWe, hol, off }: { name: string | null; days: string[]; isWe: (d: string) => boolean; hol: (d: string) => boolean; off: (d: string) => { color: string | null; status: string | null; ptoType: string | null } | undefined }) {
  return (
    <>
      <div className="n">{name}</div>
      {days.map((d) => {
        const o = !isWe(d) ? off(d) : undefined
        const cls = o ? `off ${o.status === 'pending' ? 'pend' : ''}` : hol(d) ? 'hol' : isWe(d) ? 'we' : ''
        return <div key={d} className={`c ${cls}`} style={o ? { ['--c' as string]: o.color ?? '#5c9a2a' } : undefined} title={o ? `${o.ptoType} (${o.status})` : hol(d) ? 'Public holiday' : ''} />
      })}
    </>
  )
}
