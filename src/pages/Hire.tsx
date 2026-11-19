import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { wyndbase } from '../wyndbase'
import { label, today, useAction, params as clean } from '../lib/data'
import { Card, ErrorNote, Field, PageHead } from '../components/ui'

export function Hire() {
  const navigate = useNavigate()
  const deps = useQuery(wyndbase.query.org.listDepartments())
  const teams = useQuery(wyndbase.query.org.listProductTeams())
  const locs = useQuery(wyndbase.query.org.listLocations())
  const ccs = useQuery(wyndbase.query.org.listCostCenters())
  const dir = useQuery(wyndbase.query.hr.directory({}))
  const pols = useQuery(wyndbase.query.pto.listPolicies())
  const { run, busy, error } = useAction()
  const [v, setV] = useState({
    givenName: '', familyName: '', preferredName: '', workEmail: '', personalEmail: '', username: '',
    employeeNumber: `E-${String(Date.now()).slice(-4)}`, hireDate: today(), employmentType: 'permanent', workSchedule: 'full_time', fte: '1',
    jobTitle: '', departmentId: '', productTeamId: '', managerId: '', workLocationId: '', costCenterId: '', salary: '', currency: 'EUR',
  })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  const loc = locs.data?.find((l) => l._id === v.workLocationId)
  const required = ['givenName', 'familyName', 'workEmail', 'employeeNumber', 'hireDate', 'jobTitle', 'departmentId', 'workLocationId', 'costCenterId', 'salary'] as const
  const missing = required.filter((k) => !String(v[k]).trim())

  const submit = async () => {
    const r = await run(async () => {
      const res = (await wyndbase.mutation.hr.hireEmployee(clean({
        username: v.username || v.workEmail.split('@')[0],
        givenName: v.givenName, familyName: v.familyName, preferredName: v.preferredName || null,
        workEmail: v.workEmail, employeeNumber: v.employeeNumber, hireDate: v.hireDate,
        employmentType: v.employmentType, workSchedule: v.workSchedule, fte: parseFloat(v.fte),
        jobTitle: v.jobTitle, legalEntityId: loc?.legalEntityId, workLocationId: v.workLocationId,
        departmentId: v.departmentId, productTeamId: v.productTeamId || null, managerId: v.managerId || null,
        costCenterId: v.costCenterId, salary: parseFloat(v.salary), currency: v.currency,
      }))) as { _id: string | null; userId: string | null }[]
      const hired = res[0]
      if (v.personalEmail && hired?.userId) await wyndbase.mutation.hr.addPersonalEmail({ userId: hired.userId, email: v.personalEmail })
      // Give the new hire every active PTO policy of their country group, from the hire date.
      for (const p of pols.data ?? []) if (p.country === loc?.country && p.active) await wyndbase.mutation.pto.assignPolicyToGroup({ policyId: p._id, from: v.hireDate })
      return hired
    })
    if (r?._id) navigate(`/people/${r._id}`)
  }

  return (
    <>
      <PageHead title="New employee" sub="Fields marked * are required. The record is effective from the hire date." />
      <ErrorNote error={error} />
      <div className="grid two">
        <Card title="Person">
          <div className="row">
            <Field label="Given name *"><input value={v.givenName} onChange={set('givenName')} /></Field>
            <Field label="Family name *"><input value={v.familyName} onChange={set('familyName')} /></Field>
          </div>
          <Field label="Preferred name"><input value={v.preferredName} onChange={set('preferredName')} /></Field>
          <div className="row">
            <Field label="Work email *"><input type="email" value={v.workEmail} onChange={set('workEmail')} /></Field>
            <Field label="Personal email" hint="Visible to HR and the employee only"><input type="email" value={v.personalEmail} onChange={set('personalEmail')} /></Field>
          </div>
          <Field label="Username" hint="Defaults to the part before @ of the work email"><input value={v.username} onChange={set('username')} /></Field>
        </Card>
        <Card title="Job">
          <div className="row">
            <Field label="Employee ID *" hint="Cannot be changed later"><input value={v.employeeNumber} onChange={set('employeeNumber')} /></Field>
            <Field label="Hire date *"><input type="date" value={v.hireDate} onChange={set('hireDate')} /></Field>
          </div>
          <Field label="Job title *"><input value={v.jobTitle} onChange={set('jobTitle')} /></Field>
          <div className="row">
            <Field label="Department *">
              <select value={v.departmentId} onChange={set('departmentId')}><option value="">Select…</option>{deps.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
            </Field>
            <Field label="Product team">
              <select value={v.productTeamId} onChange={set('productTeamId')}><option value="">—</option>{teams.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
            </Field>
          </div>
          <div className="row">
            <Field label="Office *" hint={loc ? `Legal entity: ${loc.legalEntity}` : undefined}>
              <select value={v.workLocationId} onChange={set('workLocationId')}><option value="">Select…</option>{locs.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
            </Field>
            <Field label="Manager">
              <select value={v.managerId} onChange={set('managerId')}><option value="">—</option>{dir.data?.filter((d) => d.status !== 'terminated').map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
            </Field>
          </div>
          <div className="row3">
            <Field label="Type *">
              <select value={v.employmentType} onChange={set('employmentType')}>{['permanent', 'fixed_term', 'contractor', 'intern'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
            </Field>
            <Field label="Schedule *">
              <select value={v.workSchedule} onChange={set('workSchedule')}><option value="full_time">Full time</option><option value="part_time">Part time</option></select>
            </Field>
            <Field label="FTE"><input type="number" step="0.05" value={v.fte} onChange={set('fte')} /></Field>
          </div>
          <div className="row3">
            <Field label="Cost center *">
              <select value={v.costCenterId} onChange={set('costCenterId')}><option value="">Select…</option>{ccs.data?.map((d) => <option key={d._id} value={d._id}>{d.code}</option>)}</select>
            </Field>
            <Field label="Annual salary *"><input type="number" value={v.salary} onChange={set('salary')} /></Field>
            <Field label="Currency"><input value={v.currency} onChange={set('currency')} maxLength={3} /></Field>
          </div>
        </Card>
      </div>
      <div className="page-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        {missing.length > 0 && <span className="muted">Missing: {missing.join(', ')}</span>}
        <button className="btn primary" disabled={busy || missing.length > 0} onClick={submit}>
          {busy ? 'Creating…' : 'Create employee'}
        </button>
      </div>
    </>
  )
}
