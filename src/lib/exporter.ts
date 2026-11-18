import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { wyndbase } from '../wyndbase'

type ReportKey = 'directory' | 'pto_balances' | 'pto_usage' | 'leave_summary' | 'availability' | 'sar'
export type Format = 'csv' | 'xlsx' | 'pdf'

/**
 * Logs the export first (audit.exports: generated_by, generated_at, filters), then writes
 * the file with that metadata printed at the top. Rows come from the same rule-filtered
 * named query the screen shows, so an export can never hold more than the caller may read.
 */
export async function exportRows(opts: {
  report: ReportKey
  title: string
  format: Format
  filters: Record<string, unknown>
  columns: { key: string; label: string }[]
  rows: Record<string, unknown>[]
  generatedByName?: string | null
}) {
  const logged = (await wyndbase.mutation.audit.logExport({
    report: opts.report,
    format: opts.format,
    filters: opts.filters,
    rowCount: opts.rows.length,
  })) as { _id: string; generatedAt: string | null }[]
  const meta = [
    ['Report', opts.title],
    ['generated_by', opts.generatedByName ?? ''],
    ['generated_at', logged?.[0]?.generatedAt ?? new Date().toISOString()],
    ['filters', JSON.stringify(opts.filters)],
    ['export_id', logged?.[0]?._id ?? ''],
  ]
  const header = opts.columns.map((c) => c.label)
  const body = opts.rows.map((r) => opts.columns.map((c) => fmt(r[c.key])))
  const name = `${opts.report}-${new Date().toISOString().slice(0, 10)}`

  if (opts.format === 'csv') {
    const lines = [...meta.map((m) => m.map(csv).join(',')), '', header.map(csv).join(','), ...body.map((r) => r.map(csv).join(','))]
    download(new Blob([lines.join('\n')], { type: 'text/csv' }), `${name}.csv`)
  } else if (opts.format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([...meta, [], header, ...body])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${name}.xlsx`)
  } else {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text(opts.title, 14, 16)
    doc.setFontSize(9)
    meta.slice(1).forEach((m, i) => doc.text(`${m[0]}: ${m[1]}`, 14, 23 + i * 5))
    autoTable(doc, { head: [header], body, startY: 46, styles: { fontSize: 8 }, headStyles: { fillColor: [92, 154, 42] } })
    doc.save(`${name}.pdf`)
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
const csv = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function download(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
