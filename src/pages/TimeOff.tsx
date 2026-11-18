import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'
import { thisYear, useAction, useMe } from '../lib/data'
import { Card, Empty, ErrorNote, PageHead } from '../components/ui'
import { Balances, RequestRow, RequestTimeOff } from '../components/pto'

export function TimeOff() {
  const { me } = useMe()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(thisYear())
  const reqs = useQuery(wyndbase.query.pto.listRequests({ mine: true }))
  const profile = useQuery({ ...wyndbase.query.hr.employeeProfile({ employeeId: me?.employeeId ?? '' }), enabled: !!me?.employeeId })
  const country = useQuery(wyndbase.query.org.listLocations()).data?.find((l) => l._id === profile.data?.[0]?.workLocationId)?.country
  const { run, error } = useAction()

  return (
    <>
      <PageHead
        title="My Time Off"
        sub="Balances accrue every pay period by your country policy."
        actions={
          <>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[thisYear() - 1, thisYear(), thisYear() + 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <button className="btn primary" onClick={() => setOpen(true)}>
              + Request time off
            </button>
          </>
        }
      />
      <Balances year={year} />
      <ErrorNote error={error} />
      <Card title="My requests" className="flush">
        {reqs.data?.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Type</th>
                <th>When</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reqs.data.map((r) => (
                <RequestRow key={r._id} r={r} onCancel={() => run(() => wyndbase.mutation.pto.cancelRequest({ requestId: r._id }))} />
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No requests yet.</Empty>
        )}
      </Card>
      {open && <RequestTimeOff country={country} onClose={() => setOpen(false)} />}
    </>
  )
}
