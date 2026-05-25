'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicSubmit,
  ClassicAccountPicker,
} from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'

type SortKey = 'stock' | 'date' | 'action' | 'source' | 'quantity' | 'price' | 'tradeValue'

function parseDDMMYY(s: string): Date | null {
  if (!s) return null
  const parts = s.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yy] = parts
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy)
  const d = new Date(year, Number(mm) - 1, Number(dd))
  return isNaN(d.getTime()) ? null : d
}

export function TransactionsClassic() {
  const { stocks, stocksLoading, selectedAccount } = useAccounts()

  const [dateMode, setDateMode] = useState<'All' | 'Range'>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [transactionType, setTransactionType] = useState<'All' | 'Buy' | 'Sell'>('All')
  const [stockFilter, setStockFilter] = useState('')
  const [sort1, setSort1] = useState<SortKey>('stock')
  const [order1, setOrder1] = useState<'ASC' | 'DESC'>('ASC')
  const [sort2, setSort2] = useState<SortKey>('date')
  const [order2, setOrder2] = useState<'ASC' | 'DESC'>('ASC')
  const [submitted, setSubmitted] = useState(false)

  const handleReset = () => {
    setDateMode('All'); setFromDate(''); setToDate('')
    setTransactionType('All'); setStockFilter('')
    setSort1('stock'); setOrder1('ASC')
    setSort2('date'); setOrder2('ASC')
    setSubmitted(false)
  }

  const rows = useMemo(() => {
    let r = stocks
    if (selectedAccount && selectedAccount !== 'all-accounts') {
      r = r.filter(s => s.userid === selectedAccount)
    }
    if (dateMode === 'Range') {
      const from = parseDDMMYY(fromDate)
      const to = parseDDMMYY(toDate)
      r = r.filter(s => {
        const d = new Date(s.date)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    }
    if (transactionType !== 'All') r = r.filter(s => s.action === transactionType)
    if (stockFilter.trim()) {
      const syms = stockFilter.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
      r = r.filter(s => syms.includes(s.stock.toLowerCase()))
    }
    const cmp = (a: any, b: any, key: SortKey, dir: 'ASC' | 'DESC') => {
      const av = a[key]; const bv = b[key]
      if (av === bv) return 0
      const less = av < bv ? -1 : 1
      return dir === 'ASC' ? less : -less
    }
    return [...r].sort((a, b) => cmp(a, b, sort1, order1) || cmp(a, b, sort2, order2))
  }, [stocks, selectedAccount, dateMode, fromDate, toDate, transactionType, stockFilter, sort1, order1, sort2, order2])

  const distinctStocks = useMemo(() => {
    const set = new Set(stocks.map(s => s.stock))
    return Array.from(set).sort()
  }, [stocks])

  const exportCsv = () => {
    const headers = ['Id', 'Date', 'Stock', 'Action', 'Source', 'Quantity', 'Price', 'Trade Value', 'Brokerage']
    const csvRows = [headers.join(',')]
    rows.forEach(r => {
      csvRows.push([
        r.id,
        format(new Date(r.date), 'dd/MM/yyyy'),
        r.stock,
        r.action,
        r.source ?? '',
        r.quantity,
        r.price,
        r.tradeValue,
        r.brokerage,
      ].join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tradebook_${format(new Date(), 'dd-MM-yyyy')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <ClassicTitle>View Trade Book</ClassicTitle>

      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
        <p><b>1. </b><ClassicAccountPicker /></p>

        <p>
          <b>2. Date Choice: </b>
          <label><input type="radio" name="date" checked={dateMode === 'All'} onChange={() => setDateMode('All')} /> Show All Dates</label>
          {' '}
          <label><input type="radio" name="date" checked={dateMode === 'Range'} onChange={() => setDateMode('Range')} /> Range</label>
          <br />
          <b>From Date(dd/mm/yy): </b>
          <input type="text" size={15} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          {' '}
          <b>To date: </b>
          <input type="text" size={15} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </p>

        <p>
          <b>3. Select Transaction: </b>
          <select value={transactionType} onChange={(e) => setTransactionType(e.target.value as any)}>
            <option value="All">All</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
        </p>

        <p>
          <b>4. Enter Stock Symbol/s (e.g. banpro,jetair,centex): </b>
          <input type="text" size={60} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} />
        </p>

        <p>
          <b>5. Primary Sort By: </b>
          <select value={sort1} onChange={(e) => setSort1(e.target.value as SortKey)}>
            <option value="stock">Stock Symbol</option>
            <option value="date">Date</option>
            <option value="action">Action(Buy/Sell)</option>
            <option value="source">Source</option>
            <option value="quantity">Quantity</option>
            <option value="price">Price</option>
            <option value="tradeValue">Trade_Value</option>
          </select>
          {' '}
          <label><input type="radio" name="order1" checked={order1 === 'ASC'} onChange={() => setOrder1('ASC')} /><b>ASC</b></label>
          {' '}
          <label><input type="radio" name="order1" checked={order1 === 'DESC'} onChange={() => setOrder1('DESC')} /><b>DESC</b></label>
          <br />
          <b>6. Secondary Sort By: </b>
          <select value={sort2} onChange={(e) => setSort2(e.target.value as SortKey)}>
            <option value="stock">Stock Symbol</option>
            <option value="date">Date</option>
            <option value="action">Action(Buy/Sell)</option>
            <option value="source">Source</option>
            <option value="quantity">Quantity</option>
            <option value="price">Price</option>
            <option value="tradeValue">Trade_Value</option>
          </select>
          {' '}
          <label><input type="radio" name="order2" checked={order2 === 'ASC'} onChange={() => setOrder2('ASC')} /><b>ASC</b></label>
          {' '}
          <label><input type="radio" name="order2" checked={order2 === 'DESC'} onChange={() => setOrder2('DESC')} /><b>DESC</b></label>
        </p>

        <p>
          <ClassicSubmit value="Submit" />{' '}
          <input type="reset" value="Reset" onClick={handleReset} />
        </p>
      </form>

      {submitted && (
        <>
          <p className="classic-toolbar">
            <a href="#" onClick={(e) => { e.preventDefault(); exportCsv() }}>[ Export CSV ]</a>
          </p>
          <ClassicTable>
            <thead>
              <tr>
                <ClassicTh>Id</ClassicTh>
                <ClassicTh>Date</ClassicTh>
                <ClassicTh>Stock</ClassicTh>
                <ClassicTh>Action</ClassicTh>
                <ClassicTh>Source</ClassicTh>
                <ClassicTh>Quantity</ClassicTh>
                <ClassicTh>Price</ClassicTh>
                <ClassicTh>Trade Value</ClassicTh>
                <ClassicTh>Brokerage</ClassicTh>
              </tr>
            </thead>
            <tbody>
              {stocksLoading && <tr><ClassicTd colSpan={9}>Loading...</ClassicTd></tr>}
              {!stocksLoading && rows.length === 0 && <tr><ClassicTd colSpan={9}>No records.</ClassicTd></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <ClassicTd>{r.id}</ClassicTd>
                  <ClassicTd>{format(new Date(r.date), 'dd/MM/yyyy')}</ClassicTd>
                  <ClassicTd><Link href={`/summary?stock=${r.stock}`}>{r.stock}</Link></ClassicTd>
                  <ClassicTd>{r.action}</ClassicTd>
                  <ClassicTd>{r.source ?? ''}</ClassicTd>
                  <ClassicTd>{r.quantity}</ClassicTd>
                  <ClassicTd>{r.price}</ClassicTd>
                  <ClassicTd>{r.tradeValue}</ClassicTd>
                  <ClassicTd>{r.brokerage}</ClassicTd>
                </tr>
              ))}
            </tbody>
          </ClassicTable>
        </>
      )}

      <p style={{ textAlign: 'center', marginTop: 24 }}>
        {/* @ts-ignore */}<font size={4}>Stock Symbol lookup</font>
      </p>
      <ClassicTable>
        <tbody>
          {chunk(distinctStocks, 17).map((row, i) => (
            <tr key={i}>
              {row.map((s) => (
                <ClassicTd key={s}><Link href={`/summary?stock=${s}`}>{s}</Link></ClassicTd>
              ))}
            </tr>
          ))}
        </tbody>
      </ClassicTable>
    </>
  )
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
