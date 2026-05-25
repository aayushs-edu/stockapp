'use client'

import { useState } from 'react'
import { ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useToast } from '@/components/ui/use-toast'

export function AccountsClassic() {
  const { allAccounts, refreshAccounts } = useAccounts()
  const { toast } = useToast()
  const [userid, setUserid] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, name, active: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Create failed', description: data.error || 'Unknown error', variant: 'destructive' })
        return
      }
      toast({ title: 'Account created' })
      setUserid(''); setName('')
      await refreshAccounts()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ClassicTitle>Create New Account</ClassicTitle>

      <ClassicTable>
        <thead>
          <tr><ClassicTh>User Id</ClassicTh><ClassicTh>Name</ClassicTh><ClassicTh>Active</ClassicTh></tr>
        </thead>
        <tbody>
          {allAccounts.length === 0 && <tr><ClassicTd colSpan={3}>No accounts.</ClassicTd></tr>}
          {allAccounts.map(a => (
            <tr key={a.userid}>
              <ClassicTd>{a.userid}</ClassicTd>
              <ClassicTd>{a.name}</ClassicTd>
              <ClassicTd>{a.active ? 'Yes' : 'No'}</ClassicTd>
            </tr>
          ))}
        </tbody>
      </ClassicTable>

      <form onSubmit={create}>
        <p><b>New User Id: </b><input type="text" value={userid} onChange={(e) => setUserid(e.target.value)} required /></p>
        <p><b>Name: </b><input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></p>
        <p><ClassicSubmit value={busy ? 'Creating...' : 'Create'} /></p>
      </form>
    </>
  )
}
