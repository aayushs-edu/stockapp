'use client'

import React from 'react'
import './classic.css'
import { useAccounts } from '@/components/providers/accounts-provider'

export function ClassicShell({ children }: { children: React.ReactNode }) {
  return <div className="classic-root">{children}</div>
}

export function ClassicTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="classic-title">
      <b>
        {/* @ts-ignore */}
        <font size={6} color="#800000">
          <u>{children}</u>
        {/* @ts-ignore */}
        </font>
      </b>
    </p>
  )
}

export function ClassicTable(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`classic-table ${props.className ?? ''}`} />
}
export const ClassicTr = (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...p} />
export const ClassicTh = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => <th {...p} />
export const ClassicTd = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} />

export function ClassicLink(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>
) {
  return <a {...props} />
}

export function ClassicSubmit({ value }: { value: string }) {
  return <input type="submit" value={value} />
}

export function ClassicAccountPicker() {
  const { allAccounts, selectedAccount, setSelectedAccount } = useAccounts()
  return (
    <span>
      <b>Choose an Account: </b>
      <select
        value={selectedAccount}
        onChange={(e) => setSelectedAccount(e.target.value)}
      >
        <option value="">(all)</option>
        {allAccounts.map((a) => (
          <option key={a.userid} value={a.userid}>
            {a.userid}
          </option>
        ))}
      </select>
    </span>
  )
}
