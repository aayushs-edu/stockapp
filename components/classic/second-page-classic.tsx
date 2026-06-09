'use client'

import { useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicSubmit,
} from './primitives'
import { useAccounts, type StockTransaction } from '@/components/providers/accounts-provider'
import { formatDecimal, formatDdMmmYy, parseDDMMYY } from './format'

type SortKey = 'stock' | 'date' | 'action' | 'source' | 'quantity' | 'price' | 'tradeValue' | 'userid'

function getSortValue(s: StockTransaction, key: SortKey): any {
  if (key === 'date') return new Date(s.date).getTime()
  return (s as any)[key]
}

export function SecondPageClassic() {
  const search = useSearchParams()
  const router = useRouter()
  const { stocks, stocksLoading, allAccounts } = useAccounts()

  // Accept both ?stock= (modern) and ?value= (old JSP) for the stock symbol filter.
  // account="" or "all" means no account filter (cross-account view).
  const accountParam = search.get('account') ?? ''
  const showAllAccounts = accountParam === '' || accountParam.toLowerCase() === 'all'
  const dateMode = (search.get('date') ?? 'All') as 'All' | 'Range'
  const fromDateStr = search.get('fromDate') ?? ''
  const toDateStr = search.get('toDate') ?? ''
  const txnFilter = (search.get('transaction') ?? 'All') as 'All' | 'Buy' | 'Sell'
  const valueParam = search.get('value') ?? search.get('stock') ?? ''
  const sort1 = (search.get('sort1') ?? 'stock') as SortKey
  const sort2 = (search.get('sort2') ?? 'date') as SortKey
  const order1 = (search.get('order1') ?? 'ASC') as 'ASC' | 'DESC'
  const order2 = (search.get('order2') ?? 'ASC') as 'ASC' | 'DESC'

  const stockList = useMemo(() => {
    if (!valueParam.trim()) return [] as string[]
    return valueParam.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
  }, [valueParam])

  const rows = useMemo(() => {
    let r = stocks
    if (!showAllAccounts) {
      r = r.filter(s => s.userid === accountParam)
    }
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
    if (txnFilter !== 'All') {
      r = r.filter(s => s.action === txnFilter)
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
    // Old code appends ", id" as the final tie-breaker.
    return [...r].sort((a, b) =>
      cmp(a, b, sort1, order1) ||
      cmp(a, b, sort2, order2) ||
      (a.id - b.id)
    )
  }, [stocks, accountParam, showAllAccounts, dateMode, fromDateStr, toDateStr, txnFilter, stockList, sort1, sort2, order1, order2])

  // Per-row + bottom summary derivation, mirroring SecondPage.jsp.
  const { displayRows, summary } = useMemo(() => {
    let buyQty = 0, sellQty = 0
    let buyTotal = 0, sellTotal = 0, brokerage = 0
    let cumm = 0
    const out: Array<{
      idx: number
      tx: StockTransaction
      netValue: number
      cumulative: number
    }> = []

    rows.forEach((tx, i) => {
      let net: number
      if (tx.action === 'Buy') {
        buyQty += tx.quantity
        net = tx.tradeValue + tx.brokerage
        buyTotal += net
        cumm -= net
      } else {
        sellQty += tx.quantity
        net = tx.tradeValue - tx.brokerage
        sellTotal += net
        cumm += net
      }
      brokerage += tx.brokerage
      out.push({ idx: i + 1, tx, netValue: net, cumulative: cumm })
    })

    // Second pass: FIFO average buy price of shares we still have, matching the old loop.
    let balQty = 0
    let checkQty = sellQty
    let avgBuyPriceAcc = 0
    rows.forEach((tx) => {
      if (tx.action !== 'Buy') return
      balQty += tx.quantity
      if (sellQty > balQty) {
        // entire buy still considered "sold off"
        return
      }
      avgBuyPriceAcc += (balQty - checkQty) * tx.price
      checkQty = balQty
    })
    const remaining = buyQty - sellQty
    const avgBuyPriceRemaining = remaining > 0 ? avgBuyPriceAcc / remaining : 0

    return {
      displayRows: out,
      summary: {
        buyQty, sellQty, buyTotal, sellTotal, brokerage,
        sellMinusBuy: sellTotal - buyTotal,
        avgBuyPriceAcc,
        avgBuyPriceRemaining,
        remaining,
      },
    }
  }, [rows])

  // The account picker form: lets the user switch accounts, preserving all
  // other filters via hidden inputs (matches the old SecondPage submit flow).
  const submitWithAccount = (newAccount: string) => {
    const params = new URLSearchParams()
    if (newAccount) params.set('account', newAccount)
    if (valueParam) params.set('value', valueParam)
    if (dateMode) params.set('date', dateMode)
    if (fromDateStr) params.set('fromDate', fromDateStr)
    if (toDateStr) params.set('toDate', toDateStr)
    if (txnFilter) params.set('transaction', txnFilter)
    params.set('sort1', sort1); params.set('order1', order1)
    params.set('sort2', sort2); params.set('order2', order2)
    router.push(`/summary-book?${params.toString()}`)
  }

  return (
    <>
      <ClassicTitle>Stock Transactions</ClassicTitle>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const sel = (e.currentTarget.elements.namedItem('account') as HTMLSelectElement | null)?.value ?? ''
          submitWithAccount(sel)
        }}
        style={{ textAlign: 'center' }}
      >
        <b>Choose an Account: </b>
        <select name="account" defaultValue={showAllAccounts ? 'all' : accountParam}>
          <option value="all">(All)</option>
          {allAccounts.map(a => (
            <option key={a.userid} value={a.userid}>{a.userid}</option>
          ))}
        </select>
        {' '}
        <ClassicSubmit value="Submit" />
      </form>

      <p style={{ textAlign: 'center' }}>
        Account: {showAllAccounts ? '(All)' : accountParam}{' '}
        {dateMode === 'Range' && fromDateStr && toDateStr && (
          <>, From Date: {fromDateStr}, To Date: {toDateStr}</>
        )}
      </p>

      <ClassicTable>
        <thead>
          <tr>
            <ClassicTh>S.No.</ClassicTh>
            <ClassicTh>Key</ClassicTh>
            {showAllAccounts && <ClassicTh>Account</ClassicTh>}
            <ClassicTh>Date</ClassicTh>
            <ClassicTh>Stock</ClassicTh>
            <ClassicTh>Action</ClassicTh>
            <ClassicTh>Source</ClassicTh>
            <ClassicTh>Quantity</ClassicTh>
            <ClassicTh>Price</ClassicTh>
            <ClassicTh>Trade Value</ClassicTh>
            <ClassicTh>Brokerage</ClassicTh>
            <ClassicTh>Net Value</ClassicTh>
            <ClassicTh>Cummulative Sum</ClassicTh>
            <ClassicTh>Remarks</ClassicTh>
          </tr>
        </thead>
        <tbody>
          {stocksLoading && (
            <tr><ClassicTd colSpan={showAllAccounts ? 14 : 13}>Loading...</ClassicTd></tr>
          )}
          {!stocksLoading && displayRows.length === 0 && (
            <tr><ClassicTd colSpan={showAllAccounts ? 14 : 13}>No records.</ClassicTd></tr>
          )}
          {displayRows.map(({ idx, tx, netValue, cumulative }) => (
            <tr key={tx.id}>
              <ClassicTd>{idx}</ClassicTd>
              <ClassicTd>{tx.id}</ClassicTd>
              {showAllAccounts && <ClassicTd>{tx.userid}</ClassicTd>}
              <ClassicTd>{formatDdMmmYy(new Date(tx.date))}</ClassicTd>
              <ClassicTd>{tx.stock}</ClassicTd>
              <ClassicTd>{tx.action}</ClassicTd>
              <ClassicTd>{tx.source ?? ''}</ClassicTd>
              <ClassicTd>{tx.quantity}</ClassicTd>
              <ClassicTd>{formatDecimal(tx.price)}</ClassicTd>
              <ClassicTd>{formatDecimal(tx.tradeValue)}</ClassicTd>
              <ClassicTd>{tx.brokerage}</ClassicTd>
              <ClassicTd>{formatDecimal(netValue)}</ClassicTd>
              <ClassicTd>{formatDecimal(cumulative)}</ClassicTd>
              <ClassicTd>{tx.remarks ?? ''}</ClassicTd>
            </tr>
          ))}
          {displayRows.length > 0 && (
            <>
              <tr>
                <ClassicTd colSpan={4} style={{ textAlign: 'center', backgroundColor: '#99cccc' }}>
                  Buy(Net Value) : {formatDecimal(summary.buyTotal)}
                </ClassicTd>
                <ClassicTd colSpan={4} style={{ textAlign: 'center', backgroundColor: '#99cccc' }}>
                  Sell(Net Value) :{formatDecimal(summary.sellTotal)}
                </ClassicTd>
                <ClassicTd colSpan={1} style={{ backgroundColor: '#99cccc' }}>
                  {formatDecimal(summary.brokerage)}
                </ClassicTd>
                <ClassicTd colSpan={2} style={{ textAlign: 'center', backgroundColor: '#99cccc' }}>
                  Sell-Buy(Net value): {formatDecimal(summary.sellMinusBuy)}
                </ClassicTd>
                <ClassicTd colSpan={showAllAccounts ? 3 : 2} style={{ textAlign: 'center', backgroundColor: '#ffcccf' }}>
                  Buy Average Price of Shares we still have: {summary.remaining > 0 ? formatDecimal(summary.avgBuyPriceRemaining) : 'NA'}
                </ClassicTd>
              </tr>
              <tr>
                <ClassicTd colSpan={3} style={{ textAlign: 'center', backgroundColor: '#ffcccf' }}>
                  Buy (Quantity): {summary.buyQty}
                </ClassicTd>
                <ClassicTd colSpan={3} style={{ textAlign: 'center', backgroundColor: '#ffcccf' }}>
                  Sell (Quantity): {summary.sellQty}
                </ClassicTd>
                <ClassicTd colSpan={showAllAccounts ? 8 : 7} style={{ textAlign: 'center', backgroundColor: '#ffcccf' }}>
                  Buy-Sell (Quantity of Shares we still have): {summary.remaining}
                </ClassicTd>
              </tr>
              <tr>
                <ClassicTd colSpan={showAllAccounts ? 14 : 13} style={{ textAlign: 'center', backgroundColor: '#ffcccf' }}>
                  Buy Amount of Shares we still have: {formatDecimal(summary.avgBuyPriceAcc)}
                </ClassicTd>
              </tr>
            </>
          )}
        </tbody>
      </ClassicTable>
    </>
  )
}
