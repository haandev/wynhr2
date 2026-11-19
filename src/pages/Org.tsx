import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { wyndbase } from '../wyndbase'
import { fmtDate, today, useAction, useMe, params as clean } from '../lib/data'
import { Avatar, Card, ErrorNote, Field, Modal, PageHead } from '../components/ui'

type Person = { _id: string; name: string | null; jobTitle: string | null; managerId: string | null; department: string | null; status: string | null; userId: string | null }

function Node({ p, all }: { p: Person; all: Person[] }) {
  const kids = all.filter((x) => x.managerId === p._id)
  return (
    <div>
      <Link to={`/people/${p._id}`} className="org-node">
        <Avatar name={p.name} size={34} />
        <div>
          <b>{p.name}</b>
          <div className="muted">
            {p.jobTitle} · {p.department}
          </div>
        </div>
        {kids.length > 0 && <span className="chip">{kids.length}</span>}
      </Link>
      {kids.length > 0 && (
        <div className="org-children">
          {kids.map((k) => (
            <Node key={k._id} p={k} all={all} />
          ))}
        </div>
      )}
    </div>
  )
}

type Period = { value: string | boolean | null; _effectiveFrom: string; _effectiveTo: string | null }

export function Org() {
  const { isHr } = useMe()
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const deps = useQuery(wyndbase.query.org.listDepartments())
  const teams = useQuery(wyndbase.query.org.listProductTeams())
  const hist = useQuery(wyndbase.query.org.orgHistory())
  const [edit, setEdit] = useState<{ _id: string; name: string | null } | null>(null)
  const people = (dir.data ?? []).filter((p) => p.status !== 'terminated') as Person[]
  const ids = new Set(people.map((p) => p._id))
  const roots = people.filter((p) => !p.managerId || !ids.has(p.managerId))
  const count = (depId: string) => people.filter((p) => (dir.data ?? []).find((d) => d._id === p._id)?.departmentId === depId).length

  return (
    <>
      <PageHead title="Org chart" sub="Reporting lines as of today. Changes are effective-dated and keep their history." />
      <div className="grid side">
        <Card title="Reporting lines">
          <div className="org-tree">
            {roots.map((r) => (
              <Node key={r._id} p={r} all={people} />
            ))}
          </div>
        </Card>
        <div className="stack">
          <Card title="Departments" className="flush">
            <table className="tbl">
              <tbody>
                {deps.data?.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <b>{d.name}</b>
                      <div className="muted">
                        {d.code} · head {d.head ?? '—'}
                        {d.parent && <> · under {d.parent}</>}
                        {d.active === false && <> · inactive</>}
                      </div>
                    </td>
                    <td className="num">{count(d._id)}</td>
                    <td className="num">
                      {isHr && (
                        <button className="btn sm" onClick={() => setEdit({ _id: d._id, name: d.name })}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Product teams" className="flush">
            <table className="tbl">
              <tbody>
                {teams.data?.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <b>{t.name}</b>
                      <div className="muted">
                        {t.department} · head {t.head ?? '—'}
                      </div>
                    </td>
                    <td className="num">{(dir.data ?? []).filter((p) => p.productTeamId === t._id && p.status !== 'terminated').length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Department history">
            {hist.data?.map((d) => (
              <div key={d._id} style={{ marginBottom: 12 }}>
                <b>{d.code}</b>
                {((d.name as Period[] | null) ?? []).map((p, i) => (
                  <div key={`n${i}`} className="muted">
                    Name “{String(p.value)}”: {fmtDate(p._effectiveFrom)} → {p._effectiveTo ? fmtDate(p._effectiveTo) : 'now'}
                  </div>
                ))}
                {((d.head as Period[] | null) ?? []).map((p, i) => (
                  <div key={`h${i}`} className="muted">
                    Head {String(p.value ?? '—')}: {fmtDate(p._effectiveFrom)} → {p._effectiveTo ? fmtDate(p._effectiveTo) : 'now'}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
      </div>
      {edit && <DeptModal dep={edit} people={people} onClose={() => setEdit(null)} />}
    </>
  )
}

function DeptModal({ dep, people, onClose }: { dep: { _id: string; name: string | null }; people: Person[]; onClose: () => void }) {
  const [name, setName] = useState(dep.name ?? '')
  const [head, setHead] = useState('')
  const [active, setActive] = useState('')
  const [date, setDate] = useState(today())
  const { run, busy, error } = useAction()
  return (
    <Modal
      title={`Change ${dep.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              const r = await run(() =>
                wyndbase.mutation.org.changeDepartment(clean({
                  departmentId: dep._id,
                  effectiveDate: date,
                  name: name !== dep.name ? name : null,
                  headUserId: head || null,
                  active: active === '' ? null : active === 'yes',
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
      <div className="info-note">Changes take effect from the date below; the previous values stay in the department history.</div>
      <Field label="Effective from">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="New head">
        <select value={head} onChange={(e) => setHead(e.target.value)}>
          <option value="">(unchanged)</option>
          {people.map((p) => (
            <option key={p._id} value={p.userId ?? ''}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Active">
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">(unchanged)</option>
          <option value="yes">Active</option>
          <option value="no">Deactivate</option>
        </select>
      </Field>
    </Modal>
  )
}
