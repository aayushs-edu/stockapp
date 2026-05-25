'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassicTitle, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useToast } from '@/components/ui/use-toast'

export function ModifyClassic() {
  const { refreshStocks } = useAccounts()
  const { toast } = useToast()
  const router = useRouter()
  const [idInput, setIdInput] = useState('')
  const [record, setRecord] = useState<any | null>(null)
  const [form, setForm] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idInput) return
    setBusy(true)
    try {
      const res = await fetch(`/api/stocks/${idInput}`)
      if (!res.ok) {
        toast({ title: 'Not found', description: `No record with id ${idInput}`, variant: 'destructive' })
        return
      }
      const found = await res.json()
      setRecord(found)
      setForm({
        ...found,
        date: new Date(found.date).toISOString().slice(0, 10),
      })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const update = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/stocks/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        toast({ title: 'Update failed', description: await res.text(), variant: 'destructive' })
        return
      }
      toast({ title: 'Updated' })
      await refreshStocks()
      router.push('/transactions')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete record ${record.id}?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/stocks/${record.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast({ title: 'Delete failed', description: await res.text(), variant: 'destructive' })
        return
      }
      toast({ title: 'Deleted' })
      await refreshStocks()
      router.push('/transactions')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ClassicTitle>Modify Stock Details</ClassicTitle>
      {!record && (
        <form onSubmit={lookup}>
          <p>
            <b>Record Id: </b>
            <input type="text" size={10} value={idInput} onChange={(e) => setIdInput(e.target.value)} required />
            {' '}<ClassicSubmit value={busy ? 'Fetching...' : 'Fetch'} />
          </p>
          <p style={{ textAlign: 'center', color: '#555' }}>
            Tip: Record IDs are visible on the View Trade Book page.
          </p>
        </form>
      )}
      {record && form && (
        <form onSubmit={(e) => { e.preventDefault(); update() }}>
          <p><b>Id:</b> {record.id}</p>
          <p><b>Account:</b> {record.userid}</p>
          <p><b>Date: </b><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></p>
          <p><b>Stock: </b><input type="text" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></p>
          <p>
            <b>Action: </b>
            <label><input type="radio" checked={form.action === 'Buy'} onChange={() => set('action', 'Buy')} /> Buy</label>
            {' '}<label><input type="radio" checked={form.action === 'Sell'} onChange={() => set('action', 'Sell')} /> Sell</label>
          </p>
          <p><b>Source: </b><input type="text" value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} /></p>
          <p><b>Quantity: </b><input type="number" value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} /></p>
          <p><b>Price: </b><input type="number" value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></p>
          <p><b>Brokerage: </b><input type="number" value={form.brokerage} onChange={(e) => set('brokerage', Number(e.target.value))} /></p>
          <p><b>Order Ref: </b><input type="text" value={form.orderRef ?? ''} onChange={(e) => set('orderRef', e.target.value)} /></p>
          <p><b>Remarks: </b><input type="text" value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} /></p>
          <p>
            <ClassicSubmit value={busy ? 'Updating...' : 'Update'} />{' '}
            <input type="button" value="Delete" onClick={remove} disabled={busy} />{' '}
            <input type="button" value="Cancel" onClick={() => { setRecord(null); setForm(null); setIdInput('') }} />
          </p>
        </form>
      )}
    </>
  )
}
