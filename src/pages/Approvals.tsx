import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { fmtDate, fmtDays, fmtHours, useAction, useMe } from '../lib/data'
import { Avatar, Card, Empty, ErrorNote, Field, Modal, PageHead, Pill } from '../components/ui'
import { humanize } from '../components/pto'

export function Approvals() {
  const { isHr } = useMe()
  const pending = useQuery(wyndbase.query.pto.listRequests({ toDecide: true, status: 'pending' }))
  const all = useQuery(wyndbase.query.pto.listRequests({}))
  const { run, error } = useAction()
  const [deciding, setDeciding] = useState<{ id: string; decision: 'approved' | 'denied'; name: string | null } | null>(null)
  const [note, setNote] = useState('')
  const [override, setOverride] = useState(false)

  const decided = (all.data ?? []).filter((r) => !r.isMine && r.status !== 'pending').slice(0, 15)

  return (
    <>
      <PageHead title="Approvals" sub="Requests from your direct reports — and, for HR, your office as override." />
      <ErrorNote error={error && humanize(error)} />
      <Card title={`Waiting for you (${pending.data?.length ?? 0})`} className="flush">
        {pending.data?.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>When</th>
                <th className="num">Amount</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.data.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div className="person">
                      <Avatar name={r.employee} />
                      <b>{r.employee}</b>
                    </div>
                  </td>
                  <td>{r.ptoType}</td>
                  <td>
                    {fmtDate(r.startDate)}
                    {r.endDate !== r.startDate && <> – {fmtDate(r.endDate)}</>}
                  </td>
                  <td className="num">
                    {fmtHours(r.hours)}
                    <div className="muted">{fmtDays(r.hours)}</div>
                  </td>
                  <td className="muted">{r.note}</td>
                  <td className="num">
                    <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn sm danger" onClick={() => { setNote(''); setOverride(false); setDeciding({ id: r._id, decision: 'denied', name: r.employee }) }}>
                        Deny
                      </button>
                      <button className="btn sm primary" onClick={() => { setNote(''); setOverride(false); setDeciding({ id: r._id, decision: 'approved', name: r.employee }) }}>
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Nothing waiting. 🎉</Empty>
        )}
      </Card>
      <div style={{ height: 18 }} />
      <Card title="Recently decided" className="flush">
        {decided.length ? (
          <table className="tbl">
            <tbody>
              {decided.map((r) => (
                <tr key={r._id}>
                  <td>{r.employee}</td>
                  <td>{r.ptoType}</td>
                  <td>
                    {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
                  </td>
                  <td className="num">{fmtHours(r.hours)}</td>
                  <td>
                    <Pill value={r.status} />
                    {r.hrOverride && <span className="chip" style={{ marginLeft: 6 }}>HR override</span>}
                  </td>
                  <td className="muted">{r.decidedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No decisions yet.</Empty>
        )}
      </Card>
      {deciding && (
        <Modal
          title={`${deciding.decision === 'approved' ? 'Approve' : 'Deny'} ${deciding.name}'s request`}
          onClose={() => setDeciding(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeciding(null)}>
                Back
              </button>
              <button
                className={`btn ${deciding.decision === 'approved' ? 'primary' : 'danger'}`}
                onClick={async () => {
                  await run(() => wyndbase.mutation.pto.decideRequest({ requestId: deciding.id, decision: deciding.decision, note: note || null, override: isHr ? override : null }))
                  setDeciding(null)
                }}
              >
                {deciding.decision === 'approved' ? 'Approve' : 'Deny'}
              </button>
            </>
          }
        >
          <Field label="Message to the employee (optional)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {isHr && (
            <label className="check">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> HR override (allow beyond balance)
            </label>
          )}
        </Modal>
      )}
    </>
  )
}
