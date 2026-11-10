/** CSV writing shared by the session log, the attempts export and the manager exports. */
import type { Res } from './http.ts'

/** RFC 4180: quote fields that need it, double embedded quotes. */
export function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export const row = (values: unknown[]): string => values.map(cell).join(',')

/** Three decimals, or empty for a missing number — keeps the columns readable in a spreadsheet. */
export const f3 = (v: number | null | undefined): string => (v === null || v === undefined ? '' : v.toFixed(3))

export const stamp = (): string => new Date().toISOString().slice(0, 10)

/** `a.b@c.com` → `a_b_c_com`, so the download name is safe on every platform. */
export const safeName = (v: string): string => v.replace(/[^a-z0-9]+/gi, '_')

/** Send `lines` as a CSV download. BOM so Excel reads UTF-8; CRLF line ends per RFC 4180. */
export function sendCsv(res: Res, filename: string, lines: string[]): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')
  res.end('\uFEFF' + lines.join('\r\n') + '\r\n')
}
