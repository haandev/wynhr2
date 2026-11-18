import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { wyndbase } from '../wyndbase'
import { fmtDate, label, useAction, useMe } from '../lib/data'
import { Avatar, Card, Empty, ErrorNote, PageHead, Pill } from '../components/ui'
import { ExportButtons, OrgFilters, type OrgFilter } from '../components/Filters'
import { exportRows } from '../lib/exporter'

export function People() {
  const navigate = useNavigate()
  const { me, isHrAdmin } = useMe()
  const [f, setF] = useState<OrgFilter>({ departmentId: null, locationId: null, status: null })
  const [search, setSearch] = useState('')
  const q = useQuery(wyndbase.query.hr.directory({ ...f, search: search || null }))
  const rows = q.data ?? []
  const { run, error } = useAction()

  const doExport = (format: 'csv' | 'xlsx' | 'pdf') =>
    run(() =>
      exportRows({
        report: 'directory',
        title: 'Employee directory',
        format,
        filters: { ...f, search },
        generatedByName: me?.name,
        columns: [
          { key: 'employeeNumber', label: 'Employee ID' },
          { key: 'name', label: 'Name' },
          { key: 'jobTitle', label: 'Job title' },
          { key: 'department', label: 'Department' },
          { key: 'productTeam', label: 'Product team' },
          { key: 'workLocation', label: 'Office' },
          { key: 'manager', label: 'Manager' },
          { key: 'status', label: 'Status' },
          { key: 'workEmail', label: 'Work email' },
          { key: 'hireDate', label: 'Hire date' },
        ],
        rows,
      }),
    )

  return (
    <>
      <PageHead
        title="People"
        sub={`${rows.length} people`}
        actions={
          <>
            <ExportButtons onExport={doExport} />
            {isHrAdmin && (
              <button className="btn primary" onClick={() => navigate('/hire')}>
                + New employee
              </button>
            )}
          </>
        }
      />
      <ErrorNote error={error} />
      <div className="filters">
        <input placeholder="Search name or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <OrgFilters value={f} onChange={setF} />
      </div>
      <Card className="flush">
        {rows.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Office</th>
                <th>Manager</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e._id} className="click" onClick={() => navigate(`/people/${e._id}`)}>
                  <td>
                    <div className="person">
                      <Avatar name={e.name} />
                      <div>
                        <b>{e.name}</b>
                        <small>{e.jobTitle}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {e.department}
                    {e.productTeam && <div className="muted">{e.productTeam}</div>}
                  </td>
                  <td>{e.workLocation}</td>
                  <td>{e.manager ?? '—'}</td>
                  <td>
                    {label(e.employmentType)}
                    <div className="muted">
                      {label(e.workSchedule)} · since {fmtDate(e.hireDate)}
                    </div>
                  </td>
                  <td>
                    <Pill value={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No one matches.</Empty>
        )}
      </Card>
    </>
  )
}
