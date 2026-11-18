import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { label, useAction } from '../lib/data'
import { Card, Empty, ErrorNote, Field, PageHead } from '../components/ui'
import { download } from '../lib/exporter'

export function Audit() {
  const exportsQ = useQuery(wyndbase.query.audit.listExports())
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const [emp, setEmp] = useState('')
  const { run, busy, error } = useAction()
  const nameOf = (uid: string | null) => dir.data?.find((u) => u.userId === uid)?.name ?? uid ?? '—'

  const sar = async () => {
    const r = await run(() => wyndbase.mutation.audit.subjectAccessExport({ employeeId: emp }))
    if (r) {
      const who = dir.data?.find((d) => d._id === emp)?.employeeNumber ?? 'employee'
      download(new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), data: r }, null, 2)], { type: 'application/json' }), `sar-${who}.json`)
    }
  }

  return (
    <>
      <PageHead title="Audit & GDPR" sub="Every employee and PTO change is versioned with actor and before/after values; every export is logged here." />
      <ErrorNote error={error} />
      <div className="grid side">
        <Card title="Export log" className="flush">
          {exportsQ.data?.length ? (
            <table className="tbl">
              <thead><tr><th>When</th><th>Who</th><th>Report</th><th>Format</th><th className="num">Rows</th><th>Filters</th></tr></thead>
              <tbody>
                {exportsQ.data.map((x) => (
                  <tr key={x._id}>
                    <td className="muted">{x.generatedAt ? new Date(x.generatedAt).toLocaleString() : '—'}</td>
                    <td>{nameOf(x.generatedBy)}</td>
                    <td>{label(x.report)}</td>
                    <td><span className="chip">{x.format?.toUpperCase()}</span></td>
                    <td className="num">{x.rowCount ?? '—'}</td>
                    <td><code className="json">{x.filters ? JSON.stringify(x.filters) : '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No exports yet.</Empty>}
        </Card>
        <div className="stack">
          <Card title="Subject access request">
            <p className="muted">Exports everything held about one person — profile, contact details, employment history with reasons, compensation, PTO ledger and requests — as JSON. The export is logged.</p>
            <Field label="Employee">
              <select value={emp} onChange={(e) => setEmp(e.target.value)}>
                <option value="">Select…</option>
                {dir.data?.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.employeeNumber})</option>)}
              </select>
            </Field>
            <button className="btn primary" disabled={!emp || busy} onClick={sar}>⤓ Download SAR export</button>
          </Card>
          <Card title="Where the audit trail lives">
            <p className="muted">
              Field-by-field history with who/when/before/after is on each employee's <b>Audit trail</b> tab. PTO requests, ledger entries and policies keep every version too.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
