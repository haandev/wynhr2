import { useQuery } from '@tanstack/react-query'
import { wyndbase } from '../wyndbase'

export type OrgFilter = { departmentId: string | null; locationId: string | null; status: string | null }

export function OrgFilters({ value, onChange }: { value: OrgFilter; onChange: (v: OrgFilter) => void }) {
  const deps = useQuery(wyndbase.query.org.listDepartments())
  const locs = useQuery(wyndbase.query.org.listLocations())
  return (
    <>
      <select value={value.departmentId ?? ''} onChange={(e) => onChange({ ...value, departmentId: e.target.value || null })}>
        <option value="">All departments</option>
        {deps.data?.map((d) => (
          <option key={d._id} value={d._id}>
            {d.name}
          </option>
        ))}
      </select>
      <select value={value.locationId ?? ''} onChange={(e) => onChange({ ...value, locationId: e.target.value || null })}>
        <option value="">All offices</option>
        {locs.data?.map((l) => (
          <option key={l._id} value={l._id}>
            {l.name}
          </option>
        ))}
      </select>
      <select value={value.status ?? ''} onChange={(e) => onChange({ ...value, status: e.target.value || null })}>
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="leave">On leave</option>
        <option value="terminated">Terminated</option>
      </select>
    </>
  )
}

export function ExportButtons({ onExport, disabled }: { onExport: (f: 'csv' | 'xlsx' | 'pdf') => void; disabled?: boolean }) {
  return (
    <>
      {(['csv', 'xlsx', 'pdf'] as const).map((f) => (
        <button key={f} className="btn sm" disabled={disabled} onClick={() => onExport(f)}>
          ⤓ {f.toUpperCase()}
        </button>
      ))}
    </>
  )
}
