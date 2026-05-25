'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassicTitle, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useToast } from '@/components/ui/use-toast'

function parseDDMMYYYY(s: string): Date | null {
  const parts = s.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  const year = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy)
  const d = new Date(year, Number(mm) - 1, Number(dd))
  return isNaN(d.getTime()) ? null : d
}

export function AddStockClassic() {
  const { allAccounts, refreshStocks } = useAccounts()
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState({
    userid: allAccounts[0]?.userid ?? '',
    date: '',
    stock: '',
    action: 'Buy' as 'Buy' | 'Sell',
    source: '',
    quantity: '',
    price: '',
    brokerage: '',
    orderRef: '',
    remarks: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const qty = Number(form.quantity)
      const price = Number(form.price)
      const brokerage = Number(form.brokerage) || 0
      const date = parseDDMMYYYY(form.date)
      if (!date) {
        toast({ title: 'Invalid date', description: 'Use dd/mm/yyyy', variant: 'destructive' })
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: form.userid,
          date,
          stock: form.stock.toUpperCase(),
          action: form.action,
          source: form.source || undefined,
          quantity: qty,
          price: price,
          tradeValue: qty * price,
          brokerage,
          orderRef: form.orderRef || undefined,
          remarks: form.remarks || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'Stock added' })
      await refreshStocks()
      router.push('/transactions')
    } catch (err: any) {
      toast({ title: 'Failed to add stock', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ClassicTitle>Add Stock Details</ClassicTitle>
      <form onSubmit={handleSubmit}>
        <p>
          <b>Account: </b>
          <select value={form.userid} onChange={(e) => set('userid', e.target.value)} required>
            <option value="">(select)</option>
            {allAccounts.map(a => <option key={a.userid} value={a.userid}>{a.userid}</option>)}
          </select>
        </p>
        <p><b>Date (dd/mm/yyyy): </b><input type="text" size={15} value={form.date} onChange={(e) => set('date', e.target.value)} required /></p>
        <p><b>Stock: </b><input type="text" size={20} value={form.stock} onChange={(e) => set('stock', e.target.value)} required /></p>
        <p>
          <b>Action: </b>
          <label><input type="radio" checked={form.action === 'Buy'} onChange={() => set('action', 'Buy')} /> Buy</label>
          {' '}
          <label><input type="radio" checked={form.action === 'Sell'} onChange={() => set('action', 'Sell')} /> Sell</label>
        </p>
        <p><b>Source: </b><input type="text" size={20} value={form.source} onChange={(e) => set('source', e.target.value)} /></p>
        <p><b>Quantity: </b><input type="text" size={10} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></p>
        <p><b>Price: </b><input type="text" size={10} value={form.price} onChange={(e) => set('price', e.target.value)} required /></p>
        <p><b>Brokerage: </b><input type="text" size={10} value={form.brokerage} onChange={(e) => set('brokerage', e.target.value)} /></p>
        <p><b>Order Ref: </b><input type="text" size={20} value={form.orderRef} onChange={(e) => set('orderRef', e.target.value)} /></p>
        <p><b>Remarks: </b><input type="text" size={40} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} /></p>
        <p>
          <ClassicSubmit value={submitting ? 'Submitting...' : 'Submit'} />{' '}
          <input type="reset" value="Reset" />
        </p>
      </form>
    </>
  )
}
