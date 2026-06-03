// Helpers that match the formatting used by the old JSP app.

function formatTwoDecimals(value: number): string {
  return value.toFixed(2)
}

// Emulates the old DecimalFormat("##,##,000.00") indianNumberFormat:
//   value < 1000      -> "###.00"   (no grouping, two decimals, no leading zeros)
//   value >= 1000     -> ",## ',' 000.00"  (lakh/crore grouping)
export function formatIndianNumber(value: number): string {
  if (!isFinite(value)) return 'NaN'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs < 1000) {
    return sign + formatTwoDecimals(abs)
  }
  const hundreds = abs % 1000
  const other = Math.floor(abs / 1000)
  // Group "other" with the Indian system: groups of 2 after the rightmost
  // e.g. 123456 -> "1,23,456"; 12345 -> "12,345"; 1234 -> "1,234"
  const otherStr = other.toString()
  let grouped: string
  if (otherStr.length <= 3) {
    grouped = otherStr
  } else {
    const last3 = otherStr.slice(-3)
    const rest = otherStr.slice(0, -3)
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    grouped = `${restGrouped},${last3}`
  }
  const hundredsStr = hundreds.toFixed(2).padStart(6, '0') // ensure 000.00 pattern
  return `${sign}${grouped},${hundredsStr}`
}

export function formatRs(value: number): string {
  return `Rs ${formatIndianNumber(value)}`
}

// Emulates DecimalFormat("###,###.##") — at most 2 decimals, US-style grouping.
export function formatDecimal(value: number): string {
  if (!isFinite(value)) return ''
  const fixed = Math.abs(value).toFixed(2)
  const [intPart, dec] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = value < 0 ? '-' : ''
  const decClean = dec.replace(/0+$/, '')
  return decClean ? `${sign}${grouped}.${decClean}` : `${sign}${grouped}`
}

// dd-MMM-yy format used by old JSP via SimpleDateFormat("dd-MMM-yy")
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatDdMmmYy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = MONTHS[d.getMonth()]
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  return `${dd}-${mmm}-${yy}`
}

// dd/MM/yy parser used by the old form
export function parseDDMMYY(s: string): Date | null {
  if (!s) return null
  const parts = s.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yy] = parts
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy)
  const d = new Date(year, Number(mm) - 1, Number(dd))
  return isNaN(d.getTime()) ? null : d
}
