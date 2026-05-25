'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicAccountPicker, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'

export function SummaryClassic() {
  const params = useSearchParams()
  const router = useRouter()
  const { stocks, selectedAccount } = useAccounts()
  const initialStock = params.get('stock') ?? ''
  const [stockInput, setStockInput] = useState(initialStock)
  const [activeStock, setActiveStock] = useState(initialStock)

  useEffect(() => {
    setStockInput(initialStock)
    setActiveStock(initialStock)
  }, [initialStock])

  const rows = useMemo(() => {
    let r = stocks.filter(s => s.stock.toLowerCase() === activeStock.toLowerCase())
    if (selectedAccount && selectedAccount !== 'all-accounts') {
      r = r.filter(s => s.userid === selectedAccount)
    }
    return [...r].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [stocks, activeStock, selectedAccount])

  let buyQty = 0, sellQty = 0, buyCost = 0, sellRevenue = 0
  const tableRows = rows.map(r => {
    if (r.action === 'Buy') { buyQty += r.quantity; buyCost += r.tradeValue + r.brokerage }
    else { sellQty += r.quantity; sellRevenue += r.tradeValue - r.brokerage }
    return { ...r, runningBalance: buyQty - sellQty }
  })
  const balance = buyQty - sellQty
  const avgCost = buyQty > 0 ? buyCost / buyQty : 0
  const realized = sellRevenue - (sellQty * avgCost)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveStock(stockInput)
    router.replace(`/summary?stock=${encodeURIComponent(stockInput)}`)
  }

  return (
    <>
      <ClassicTitle>Stock Summary</ClassicTitle>

      <form onSubmit={handleSubmit}>
        <p><ClassicAccountPicker /></p>
        <p>
          <b>Stock: </b>
          <input type="text" value={stockInput} onChange={(e) => setStockInput(e.target.value)} size={20} />
          {' '}<ClassicSubmit value="Submit" />
        </p>
      </form>

      {activeStock && (
        <>
          <p style={{ textAlign: 'center' }}>
            <b>Stock: </b>{activeStock}{' | '}
            <b>Balance: </b>{balance}{' | '}
            <b>Avg Cost: </b>{avgCost.toFixed(2)}{' | '}
            <b>Realized P/L: </b>{realized.toFixed(2)}
          </p>
          <ClassicTable>
            <thead>
              <tr>
                <ClassicTh>Date</ClassicTh>
                <ClassicTh>Account</ClassicTh>
                <ClassicTh>Action</ClassicTh>
                <ClassicTh>Source</ClassicTh>
                <ClassicTh>Quantity</ClassicTh>
                <ClassicTh>Price</ClassicTh>
                <ClassicTh>Trade Value</ClassicTh>
                <ClassicTh>Brokerage</ClassicTh>
                <ClassicTh>Running Balance</ClassicTh>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 && <tr><ClassicTd colSpan={9}>No records.</ClassicTd></tr>}
              {tableRows.map(r => (
                <tr key={r.id}>
                  <ClassicTd>{format(new Date(r.date), 'dd/MM/yyyy')}</ClassicTd>
                  <ClassicTd>{r.userid}</ClassicTd>
                  <ClassicTd>{r.action}</ClassicTd>
                  <ClassicTd>{r.source ?? ''}</ClassicTd>
                  <ClassicTd>{r.quantity}</ClassicTd>
                  <ClassicTd>{r.price}</ClassicTd>
                  <ClassicTd>{r.tradeValue}</ClassicTd>
                  <ClassicTd>{r.brokerage}</ClassicTd>
                  <ClassicTd>{r.runningBalance}</ClassicTd>
                </tr>
              ))}
            </tbody>
          </ClassicTable>
        </>
      )}
    </>
  )
}
