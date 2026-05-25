'use client'

import { useState, useMemo } from 'react'
import { ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicAccountPicker, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'

type Row = {
  stock: string
  qty: number
  cost: number
  sale: number
  pl: number
}

export function ProfitLossClassic() {
  const { stocks, selectedAccount } = useAccounts()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<string>(String(currentYear))
  const [stockFilter, setStockFilter] = useState('')
  const [view, setView] = useState<'profit' | 'notSold'>('profit')

  const years = useMemo(() => {
    const ys = new Set<number>()
    stocks.forEach(s => ys.add(new Date(s.date).getFullYear()))
    return Array.from(ys).sort((a, b) => b - a)
  }, [stocks])

  const rows: Row[] = useMemo(() => {
    let scope = stocks
    if (selectedAccount && selectedAccount !== 'all-accounts') {
      scope = scope.filter(s => s.userid === selectedAccount)
    }
    if (stockFilter.trim()) {
      const syms = stockFilter.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
      scope = scope.filter(s => syms.includes(s.stock.toLowerCase()))
    }

    // Group by stock; compute avg-cost-based realized P/L (for sells in the selected year)
    // and "not sold" remaining quantity at end of selected year.
    const byStock = new Map<string, typeof stocks>()
    scope.forEach(s => {
      if (!byStock.has(s.stock)) byStock.set(s.stock, [])
      byStock.get(s.stock)!.push(s)
    })

    const out: Row[] = []
    byStock.forEach((txs, stock) => {
      const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      let buyQty = 0
      let buyCost = 0
      let yearSellQty = 0
      let yearSellValue = 0
      let yearCostBasis = 0
      const yr = year ? Number(year) : null

      for (const t of sorted) {
        const tYear = new Date(t.date).getFullYear()
        if (t.action === 'Buy') {
          buyQty += t.quantity
          buyCost += t.tradeValue + t.brokerage
        } else if (t.action === 'Sell') {
          const avgCost = buyQty > 0 ? buyCost / buyQty : 0
          if (yr === null || tYear === yr) {
            yearSellQty += t.quantity
            yearSellValue += t.tradeValue - t.brokerage
            yearCostBasis += avgCost * t.quantity
          }
          // Reduce buy lot (proportional)
          const consume = Math.min(buyQty, t.quantity)
          if (buyQty > 0) {
            buyCost -= avgCost * consume
            buyQty -= consume
          }
        }
      }

      if (view === 'notSold') {
        if (buyQty > 0) {
          out.push({
            stock,
            qty: buyQty,
            cost: buyCost,
            sale: 0,
            pl: 0,
          })
        }
      } else {
        if (yearSellQty > 0) {
          out.push({
            stock,
            qty: yearSellQty,
            cost: yearCostBasis,
            sale: yearSellValue,
            pl: yearSellValue - yearCostBasis,
          })
        }
      }
    })

    return out.sort((a, b) => a.stock.localeCompare(b.stock))
  }, [stocks, selectedAccount, stockFilter, year, view])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        qty: acc.qty + r.qty,
        cost: acc.cost + r.cost,
        sale: acc.sale + r.sale,
        pl: acc.pl + r.pl,
      }),
      { qty: 0, cost: 0, sale: 0, pl: 0 }
    )
  }, [rows])

  return (
    <>
      <ClassicTitle>{view === 'profit' ? 'Profit/Loss' : 'Not Sold Shares'}</ClassicTitle>

      <form onSubmit={(e) => e.preventDefault()}>
        <p><ClassicAccountPicker /></p>
        <p>
          <b>Year: </b>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {' '}
          <b>Stock: </b>
          <input type="text" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} size={20} />
          {' '}
          <b>View: </b>
          <label><input type="radio" checked={view === 'profit'} onChange={() => setView('profit')} /> Profit/Loss</label>
          {' '}
          <label><input type="radio" checked={view === 'notSold'} onChange={() => setView('notSold')} /> Not Sold</label>
          {' '}<ClassicSubmit value="Submit" />
        </p>
      </form>

      <ClassicTable>
        <thead>
          <tr>
            <ClassicTh>Stock</ClassicTh>
            <ClassicTh>Quantity</ClassicTh>
            <ClassicTh>Cost</ClassicTh>
            {view === 'profit' && <ClassicTh>Sale Value</ClassicTh>}
            {view === 'profit' && <ClassicTh>P/L</ClassicTh>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><ClassicTd colSpan={view === 'profit' ? 5 : 3}>No records.</ClassicTd></tr>}
          {rows.map(r => (
            <tr key={r.stock}>
              <ClassicTd>{r.stock}</ClassicTd>
              <ClassicTd>{r.qty}</ClassicTd>
              <ClassicTd>{r.cost.toFixed(2)}</ClassicTd>
              {view === 'profit' && <ClassicTd>{r.sale.toFixed(2)}</ClassicTd>}
              {view === 'profit' && <ClassicTd>{r.pl.toFixed(2)}</ClassicTd>}
            </tr>
          ))}
          {rows.length > 0 && (
            <tr>
              <ClassicTd><b>Total</b></ClassicTd>
              <ClassicTd><b>{totals.qty}</b></ClassicTd>
              <ClassicTd><b>{totals.cost.toFixed(2)}</b></ClassicTd>
              {view === 'profit' && <ClassicTd><b>{totals.sale.toFixed(2)}</b></ClassicTd>}
              {view === 'profit' && <ClassicTd><b>{totals.pl.toFixed(2)}</b></ClassicTd>}
            </tr>
          )}
        </tbody>
      </ClassicTable>
    </>
  )
}
