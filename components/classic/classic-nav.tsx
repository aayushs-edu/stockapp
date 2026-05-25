'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

const links = [
  { href: '/transactions', label: 'View Trade Book' },
  { href: '/profit-loss', label: 'Profit/Loss' },
  { href: '/add-stock', label: 'Add Stock Details' },
  { href: '/modify', label: 'Modify Stock Details' },
  { href: '/accounts', label: 'Create New Account' },
]

export function ClassicNav() {
  const { data: session } = useSession()
  const username = session?.user?.username ?? ''
  return (
    <div className="classic-nav">
      <div className="right">
        <span>Logged in as <b>{username}</b></span>
        {' | '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            signOut({ callbackUrl: '/login' })
          }}
        >
          [ Log Out ]
        </a>
      </div>
      <div className="left">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
