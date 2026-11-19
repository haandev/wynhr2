import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { wyndbase } from '../wyndbase'

export function useMe() {
  const q = useQuery(wyndbase.query.hr.me())
  const me = q.data?.[0]
  const roles = me?.roles ?? []
  return {
    me,
    loading: q.isLoading,
    isHrAdmin: roles.includes('hr_admin'),
    isHrManager: roles.includes('hr_manager'),
    isHr: roles.includes('hr_admin') || roles.includes('hr_manager'),
  }
}

/** Runs a mutation, refreshes every cached read, and keeps the last error for display. */
export function useAction() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true)
      setError(null)
      try {
        const r = await fn()
        await qc.invalidateQueries()
        return r
      } catch (e) {
        setError(errorText(e))
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [qc],
  )
  return { run, busy, error, setError }
}

export function errorText(e: unknown): string {
  const any = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
  return any?.response?.data?.error?.message ?? any?.message ?? String(e)
}

export const today = () => new Date().toISOString().slice(0, 10)
export const thisYear = () => new Date().getFullYear()

export function fmtDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtHours(h?: string | number | null) {
  if (h === null || h === undefined) return '—'
  const n = typeof h === 'string' ? parseFloat(h) : h
  return `${(Math.round(n * 100) / 100).toLocaleString()} h`
}

export function fmtDays(h?: string | number | null, perDay = 8) {
  if (h === null || h === undefined) return '—'
  const n = typeof h === 'string' ? parseFloat(h) : h
  return `${(Math.round((n / perDay) * 10) / 10).toLocaleString()} days`
}

export function fmtMoney(amount?: string | number | null, currency?: string | null) {
  if (amount === null || amount === undefined) return '—'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 })
  } catch {
    return `${n} ${currency ?? ''}`
  }
}

export function initials(name?: string | null) {
  return (name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const palette = ['#5b8c2a', '#2f7d6d', '#3b6aa0', '#8a5cb8', '#c06a2b', '#b8476a', '#4a7f3c', '#2a6f97']
export function avatarColor(seed?: string | null) {
  let h = 0
  for (const c of seed ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

export const label = (s?: string | null) =>
  (s ?? '—').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

/** Working hours between two dates (Mon–Fri) minus active public holidays of the country. */
export function workingHours(start: string, end: string, holidays: { date: string | null; halfDay: boolean | null }[], perDay = 8) {
  if (!start || !end || end < start) return 0
  const hol = new Map(holidays.filter((h) => h.date).map((h) => [h.date!, h.halfDay]))
  let hours = 0
  for (let d = new Date(start + 'T00:00:00'); d <= new Date(end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue
    const key = d.toISOString().slice(0, 10)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const h = hol.get(k) ?? hol.get(key)
    if (h === undefined) hours += perDay
    else if (h) hours += perDay / 2
  }
  return hours
}

/**
 * Drops null/undefined keys from named-query parameters. A typed parameter without a
 * default is refused when sent as null ("expected boolean, received null"), although the
 * generated type allows null — leaving the key out is what "not given" means.
 */
export function params<T extends Record<string, unknown>>(p: T): T {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null && v !== undefined)) as T
}
