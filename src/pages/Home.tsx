import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { wyndbase } from '../wyndbase'
import { fmtDate, today, useMe } from '../lib/data'
import { Avatar, Card, Empty, PageHead, Pill } from '../components/ui'
import { Balances, RequestTimeOff } from '../components/pto'

function addDays(d: string, n: number) {
  const x = new Date(d + 'T00:00:00')
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}

export function Home() {
  const { me, isHr } = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const from = today()
  const to = addDays(from, 21)
  const out = useQuery(wyndbase.query.report.availability({ from, to }))
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const pending = useQuery(wyndbase.query.pto.listRequests({ toDecide: true, status: 'pending' }))
  const first = me?.name?.split(' ')[0]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const newHires = (dir.data ?? []).filter((e) => (e.hireDate ?? '') >= addDays(from, -60)).slice(0, 5)
  const people = dir.data ?? []

  return (
    <>
      <div className="hero">
        <div>
          <h1>
            {greet}, {first ?? 'there'}
          </h1>
          <p>
            {people.filter((p) => p.status === 'active').length} active people · {pending.data?.length ?? 0} requests waiting for you
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setOpen(true)}>
            Request time off
          </button>
          {!!pending.data?.length && (
            <button className="btn" onClick={() => navigate('/approvals')}>
              Review approvals
            </button>
          )}
        </div>
      </div>
      <PageHead title="My time off" />
      <Balances />
      <div className="grid side">
        <Card title="Who's out — next 3 weeks" className="flush">
          {out.data?.length ? (
            <table className="tbl">
              <tbody>
                {out.data.map((r, i) => (
                  <tr key={i} className="click" onClick={() => navigate(`/people/${r.employeeId}`)}>
                    <td>
                      <div className="person">
                        <Avatar name={r.employee} />
                        <div>
                          <b>{r.employee}</b>
                          <small>{r.department}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip" style={{ background: (r.color ?? '#888') + '22', color: r.color ?? undefined }}>
                        {r.ptoType}
                      </span>
                    </td>
                    <td>
                      {fmtDate(r.startDate)}
                      {r.endDate !== r.startDate && <> – {fmtDate(r.endDate)}</>}
                    </td>
                    <td>
                      <Pill value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Everyone you can see is in. </Empty>
          )}
        </Card>
        <div className="stack">
          <Card title="New team members">
            {newHires.length ? (
              newHires.map((e) => (
                <Link key={e._id} to={`/people/${e._id}`} className="org-node">
                  <Avatar name={e.name} size={32} />
                  <div>
                    <b>{e.name}</b>
                    <div className="muted">
                      {e.jobTitle} · since {fmtDate(e.hireDate)}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <span className="muted">No recent hires.</span>
            )}
          </Card>
          {isHr && (
            <Card title="HR shortcuts">
              <div className="stack">
                <Link to="/pto-admin">Post accruals & recalculate →</Link>
                <Link to="/reports">Reports & exports →</Link>
                <Link to="/org">Org chart & departments →</Link>
              </div>
            </Card>
          )}
        </div>
      </div>
      {open && <RequestTimeOff onClose={() => setOpen(false)} />}
    </>
  )
}
