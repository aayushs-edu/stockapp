'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClassicTitle, ClassicSubmit,
  ClassicAccountPicker,
} from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'

type SortKey = 'stock' | 'date' | 'action' | 'source' | 'quantity' | 'price' | 'tradeValue' | 'userid'

export function TransactionsClassic() {
  const router = useRouter()
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

  const handleReset = () => {
    setDateMode('All'); setFromDate(''); setToDate('')
    setTransactionType('All'); setStockFilter('')
    setSort1('stock'); setOrder1('ASC')
    setSort2('date'); setOrder2('ASC')
  }

  // FirstPage.jsp submits the form to SecondPage.jsp with all filters as query
  // params. We mirror that exactly: build the URL and navigate to /summary-book,
  // which renders SecondPageClassic.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (selectedAccount && selectedAccount !== 'all-accounts') {
      params.set('account', selectedAccount)
    }
    params.set('date', dateMode)
    if (dateMode === 'Range') {
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
    }
    params.set('transaction', transactionType)
    const trimmed = stockFilter.trim()
    if (trimmed) params.set('value', trimmed)
    params.set('sort1', sort1); params.set('order1', order1)
    params.set('sort2', sort2); params.set('order2', order2)
    router.push(`/summary-book?${params.toString()}`)
  }

  const distinctStocks = useMemo(() => {
    const set = new Set(stocks.map(s => s.stock))
    return Array.from(set).sort()
  }, [stocks])

  return (
    <>
      <ClassicTitle>View Trade Book</ClassicTitle>

      <form onSubmit={handleSubmit}>
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
            <option value="userid">Account</option>
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
            <option value="userid">Account</option>
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

      <p style={{ textAlign: 'center', marginTop: 24 }}>
        {/* @ts-ignore */}<font size={4}>Stock Symbol lookup</font>
      </p>
      <div className="classic-lookup">
        {stocksLoading && distinctStocks.length === 0
          ? Array.from({ length: 84 }).map((_, i) => (
              <span key={`sk-${i}`} className="classic-lookup-cell">
                <span className="classic-skeleton" />
              </span>
            ))
          : distinctStocks.map((s) => (
              <Link key={s} href={`/summary?value=${s}`} className="classic-lookup-cell" title={s}>
                {s}
              </Link>
            ))}
      </div>
    </>
  )
}
