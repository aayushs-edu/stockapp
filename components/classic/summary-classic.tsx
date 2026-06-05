'use client'

import { useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicSubmit,
} from './primitives'
import { useAccounts, type StockTransaction } from '@/components/providers/accounts-provider'
import { formatRs, formatIndianNumber, parseDDMMYY } from './format'

type SortKey = 'stock' | 'date' | 'action' | 'source' | 'quantity' | 'price' | 'tradeValue' | 'userid'

function getSortValue(s: StockTransaction, key: SortKey): any {
  if (key === 'date') return new Date(s.date).getTime()
  return (s as any)[key]
}

export function SummaryClassic() {
  const search = useSearchParams()
  const router = useRouter()
  const { stocks, allAccounts } = useAccounts()

  // SummaryPage runs across all accounts; date and transaction filters are
  // forced to "All" in the old JSP. Only the stock filter is honored.
  const valueParam = search.get('value') ?? search.get('stock') ?? ''
  const dateMode = (search.get('date') ?? 'All') as 'All' | 'Range'
  const fromDateStr = search.get('fromDate') ?? ''
  const toDateStr = search.get('toDate') ?? ''
  const sort1: SortKey = 'userid'
  const sort2: SortKey = 'date'
  const order1: 'ASC' | 'DESC' = 'ASC'
  const order2: 'ASC' | 'DESC' = 'ASC'

  const stockList = useMemo(() => {
    if (!valueParam.trim()) return [] as string[]
    return valueParam.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
  }, [valueParam])

  const rows = useMemo(() => {
    let r = stocks
    if (dateMode === 'Range') {
      const from = parseDDMMYY(fromDateStr)
      const to = parseDDMMYY(toDateStr)
      r = r.filter(s => {
        const d = new Date(s.date)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    }
    if (stockList.length > 0) {
      const set = new Set(stockList)
      r = r.filter(s => set.has(s.stock.toUpperCase()))
    }
    const cmp = (a: StockTransaction, b: StockTransaction, key: SortKey, dir: 'ASC' | 'DESC') => {
      const av = getSortValue(a, key); const bv = getSortValue(b, key)
      if (av === bv) return 0
      const less = av < bv ? -1 : 1
      return dir === 'ASC' ? less : -less
    }
    return [...r].sort((a, b) =>
      cmp(a, b, sort1, order1) ||
      cmp(a, b, sort2, order2) ||
      (a.id - b.id)
    )
  }, [stocks, dateMode, fromDateStr, toDateStr, stockList])

  // Per-account "Total Net" across the whole stockdata table (all stocks, not
  // just the filtered ones). Matches the JSP subquery.
  const totalNetByAccount = useMemo(() => {
    const map = new Map<string, number>()
    const buyByUser = new Map<string, { qty: number; net: number }>()
    const sellByUser = new Map<string, { qty: number; net: number }>()
    stocks.forEach(s => {
      if (s.action === 'Buy') {
        const cur = buyByUser.get(s.userid) ?? { qty: 0, net: 0 }
        cur.qty += s.quantity
        cur.net += s.tradeValue + s.brokerage
        buyByUser.set(s.userid, cur)
      } else {
        const cur = sellByUser.get(s.userid) ?? { qty: 0, net: 0 }
        cur.qty += s.quantity
        cur.net += s.tradeValue - s.brokerage
        sellByUser.set(s.userid, cur)
      }
    })
    // Inner join on userid present in both buy and sell.
    buyByUser.forEach((b, userid) => {
      const s = sellByUser.get(userid)
      if (!s) return
      map.set(userid, s.net - b.net)
    })
    return map
  }, [stocks])

  // Aggregate group-by-userid rendering, mirroring the old SummaryPage loop.
  // Note: `net` in the old code accumulates across users (not reset). We
  // replicate that behavior exactly, even though it looks like a bug.
  const summaryRows = useMemo(() => {
    let id = 0
    let buyQty = 0, sellQty = 0
    let net = 0
    let currUserId = ''
    let totalRemaining = 0
    const out: Array<{
      idx: number
      userid: string
      sharesRemaining: number
      netProfitInvestment: number
      totalNet: number
      pct: string
    }> = []

    const emit = () => {
      const totalNetCurrentUser = totalNetByAccount.get(currUserId) ?? 0
      out.push({
        idx: ++id,
        userid: currUserId,
        sharesRemaining: buyQty - sellQty,
        netProfitInvestment: net,
        totalNet: totalNetCurrentUser,
        pct: net < 0
          ? `${formatIndianNumber((net * 100) / totalNetCurrentUser)}%`
          : 'NA',
      })
      totalRemaining += (buyQty - sellQty)
      buyQty = 0; sellQty = 0
    }

    rows.forEach(tx => {
      if (currUserId !== '' && currUserId !== tx.userid) {
        emit()
      }
      if (tx.action === 'Buy') {
        buyQty += tx.quantity
        net -= (tx.tradeValue + tx.brokerage)
      } else {
        sellQty += tx.quantity
        net += (tx.tradeValue - tx.brokerage)
      }
      currUserId = tx.userid
    })

    if (buyQty > 0) {
      emit()
    }

    return { rows: out, totalRemaining }
  }, [rows, totalNetByAccount])

  // The form below mirrors SummaryPage.jsp's hidden-field passthrough — its
  // submit posts to SecondPage.jsp (i.e. /summary-book) with the selected
  // account and all the inherited filters.
  const submitToSecondPage = (account: string) => {
    const params = new URLSearchParams()
    if (account && account.toLowerCase() !== 'all') params.set('account', account)
    if (valueParam) params.set('value', valueParam)
    params.set('date', dateMode)
    if (fromDateStr) params.set('fromDate', fromDateStr)
    if (toDateStr) params.set('toDate', toDateStr)
    params.set('transaction', search.get('transaction') ?? 'All')
    params.set('sort1', search.get('sort1') ?? 'stock')
    params.set('order1', search.get('order1') ?? 'ASC')
    params.set('sort2', search.get('sort2') ?? 'date')
    params.set('order2', search.get('order2') ?? 'ASC')
    router.push(`/summary-book?${params.toString()}`)
  }

  return (
    <>
      <ClassicTitle>Stock Summary</ClassicTitle>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const sel = (e.currentTarget.elements.namedItem('account') as HTMLSelectElement | null)?.value ?? ''
          submitToSecondPage(sel)
        }}
        style={{ textAlign: 'center' }}
      >
        <b>Choose an Account: </b>
        <select name="account" defaultValue="all">
          <option value="all">(All)</option>
          {allAccounts.map(a => (
            <option key={a.userid} value={a.userid}>{a.userid}</option>
          ))}
        </select>
        {' '}
        <ClassicSubmit value="View Transactions" />
      </form>

      <p style={{ textAlign: 'center' }}>
        Stock: {valueParam || '(all)'}
      </p>

      <ClassicTable>
        <thead>
          <tr>
            <ClassicTh>S.No.</ClassicTh>
            <ClassicTh>Account</ClassicTh>
            <ClassicTh>Shares Remaining</ClassicTh>
            <ClassicTh>Net Profit/Investment</ClassicTh>
            <ClassicTh>Total Net</ClassicTh>
            <ClassicTh>%</ClassicTh>
          </tr>
        </thead>
        <tbody>
          {summaryRows.rows.length === 0 && (
            <tr><ClassicTd colSpan={6}>No records.</ClassicTd></tr>
          )}
          {summaryRows.rows.map(r => (
            <tr key={r.userid}>
              <ClassicTd>{r.idx}</ClassicTd>
              <ClassicTd>{r.userid}</ClassicTd>
              <ClassicTd>{r.sharesRemaining}</ClassicTd>
              <ClassicTd>{formatRs(r.netProfitInvestment)}</ClassicTd>
              <ClassicTd>{formatRs(r.totalNet)}</ClassicTd>
              <ClassicTd>{r.pct}</ClassicTd>
            </tr>
          ))}
        </tbody>
      </ClassicTable>
      <p style={{ textAlign: 'center' }}>Total: {summaryRows.totalRemaining}</p>
    </>
  )
}
