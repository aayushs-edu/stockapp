# Classic UI Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login-driven UI mode. `GRS` user sees a retro JSP-style UI; `LKS` user sees the existing V2 UI. Shared password. Same routes, branched render.

**Architecture:** Extend NextAuth session with `uiMode`. Dashboard layout branches on `uiMode` to render either the modern `<MainNav>` shell or a new `<ClassicShell>`. Each affected page (`transactions`, `summary`, `profit-loss`, `add-stock`, `modify`, `accounts`) gets a `useSession()` check at the top that returns a classic sibling component when `uiMode === 'classic'`. Non-JSP pages (`/`, `/holdings`, `/summary-book`) redirect classic users to `/transactions`. All classic components reuse the existing `useAccounts()` hook + react-query/fetch data layer — only the JSX/CSS differs.

**Tech Stack:** Next.js 14 App Router, next-auth v4 (JWT), React 18, TypeScript, Tailwind (for modern only — classic uses scoped raw CSS), Prisma.

**Spec:** `docs/superpowers/specs/2026-05-25-classic-ui-mode-design.md`

**Note on testing:** This repo has no test framework. Verification is `npx tsc --noEmit` (type check) + `npm run build` + manual browser walkthroughs documented in each task.

---

## File Map

**Created**
- `types/next-auth.d.ts` — session/JWT type augmentation
- `components/classic/classic.css` — scoped retro styles
- `components/classic/primitives.tsx` — `ClassicShell`, `ClassicTitle`, `ClassicTable`/`Th`/`Td`/`Tr`, `ClassicLink`, `ClassicSelect`, `ClassicInput`, `ClassicRadio`, `ClassicSubmit`, `ClassicAccountPicker`
- `components/classic/classic-nav.tsx` — top link bar + right-side logout
- `components/classic/transactions-classic.tsx`
- `components/classic/summary-classic.tsx`
- `components/classic/profit-loss-classic.tsx`
- `components/classic/add-stock-classic.tsx`
- `components/classic/modify-classic.tsx`
- `components/classic/accounts-classic.tsx`

**Modified**
- `lib/auth.ts` — replace single-admin check with username allow-list + uiMode callbacks
- `.env` — add `APP_PASSWORD=jaipur`; remove `ADMIN_USERNAME`/`ADMIN_PASSWORD` references (keep `NEXTAUTH_SECRET`, `DATABASE_URL`)
- `app/(dashboard)/layout.tsx` — branch on `session.user.uiMode`
- `app/(dashboard)/page.tsx` — redirect classic → `/transactions`
- `app/(dashboard)/holdings/page.tsx` — redirect classic → `/transactions`
- `app/(dashboard)/summary-book/page.tsx` — redirect classic → `/transactions`
- `app/(dashboard)/transactions/page.tsx` — top-of-file classic branch
- `app/(dashboard)/summary/page.tsx` — top-of-file classic branch
- `app/(dashboard)/profit-loss/page.tsx` — top-of-file classic branch
- `app/(dashboard)/add-stock/page.tsx` — top-of-file classic branch
- `app/(dashboard)/modify/page.tsx` — top-of-file classic branch
- `app/(dashboard)/accounts/page.tsx` — top-of-file classic branch
- `components/layout/user-nav.tsx` — show real username instead of hardcoded "Admin"

---

## Task 1: Auth — multi-user + uiMode session

**Files:**
- Create: `types/next-auth.d.ts`
- Modify: `lib/auth.ts`
- Modify: `.env`

- [ ] **Step 1: Update `.env`**

Add the following line (and remove the existing `ADMIN_USERNAME` / `ADMIN_PASSWORD` lines if present):

```
APP_PASSWORD=jaipur
```

`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL` stay as-is.

- [ ] **Step 2: Create `types/next-auth.d.ts`**

```ts
import 'next-auth'
import 'next-auth/jwt'

export type UiMode = 'classic' | 'modern'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email?: string | null
      username: string
      uiMode: UiMode
    }
  }
  interface User {
    id: string
    name: string
    username: string
    uiMode: UiMode
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username: string
    uiMode: UiMode
  }
}
```

- [ ] **Step 3: Rewrite `lib/auth.ts`**

Replace the entire file:

```ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

type UiMode = 'classic' | 'modern'

const USER_UI_MODE: Record<string, UiMode> = {
  GRS: 'classic',
  LKS: 'modern',
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const username = credentials.username.trim()
        const mode = USER_UI_MODE[username]
        if (!mode) return null
        if (credentials.password !== process.env.APP_PASSWORD) return null
        return {
          id: username,
          name: username,
          email: `${username.toLowerCase()}@stockapp.local`,
          username,
          uiMode: mode,
        }
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as any).username
        token.uiMode = (user as any).uiMode
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).username = token.username
        ;(session.user as any).uiMode = token.uiMode
        ;(session.user as any).id = token.username
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors. If `types/next-auth.d.ts` isn't picked up, ensure `tsconfig.json` `include` covers `types/**/*.ts` (it likely does via `**/*.ts`).

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev` and open `http://localhost:3000`.

1. Visit `/login`. Sign in with `username=GRS, password=jaipur` — should reach `/`.
2. Sign out (via existing modern user-nav dropdown).
3. Sign in with `username=LKS, password=jaipur` — should reach `/`.
4. Sign out. Try `username=GRS, password=wrong` — should fail with toast.
5. Try `username=foo, password=jaipur` — should fail.

- [ ] **Step 6: Commit**

```bash
git add types/next-auth.d.ts lib/auth.ts .env
git commit -m "auth: support GRS/LKS users with uiMode session field"
```

---

## Task 2: Classic primitives (CSS + components)

**Files:**
- Create: `components/classic/classic.css`
- Create: `components/classic/primitives.tsx`

- [ ] **Step 1: Create `components/classic/classic.css`**

```css
.classic-root {
  font-family: "Times New Roman", Times, serif;
  background: #ffffff;
  color: #000000;
  font-size: 14px;
  padding: 8px;
  min-height: 100vh;
}
.classic-root a {
  color: #0000A0;
  text-decoration: underline;
}
.classic-root a:visited { color: #0000A0; }
.classic-root h1, .classic-root h2, .classic-root .classic-title {
  color: #800000;
  text-align: center;
}
.classic-root table.classic-table {
  border-collapse: collapse;
  background: #FFFFCC;
  margin: 8px auto;
}
.classic-root table.classic-table th,
.classic-root table.classic-table td {
  border: 1px solid #000000;
  padding: 2px 6px;
  color: #0000A0;
  font-weight: normal;
  vertical-align: top;
}
.classic-root table.classic-table th {
  background: #FFFFCC;
  font-weight: bold;
}
.classic-root form { text-align: center; }
.classic-root input[type=text],
.classic-root input[type=number],
.classic-root input[type=date],
.classic-root select {
  font-family: inherit;
  font-size: inherit;
}
.classic-root .classic-nav { margin-bottom: 12px; }
.classic-root .classic-nav .left a { display: block; margin: 2px 0; }
.classic-root .classic-nav .right { float: right; text-align: right; }
.classic-root .classic-nav::after { content: ""; display: block; clear: both; }
.classic-root .classic-section { margin-top: 16px; }
.classic-root .classic-toolbar { text-align: center; margin: 8px 0; }
.classic-root .classic-toolbar a { margin: 0 8px; }
```

- [ ] **Step 2: Create `components/classic/primitives.tsx`**

```tsx
'use client'

import React from 'react'
import './classic.css'
import { useAccounts } from '@/components/providers/accounts-provider'

export function ClassicShell({ children }: { children: React.ReactNode }) {
  return <div className="classic-root">{children}</div>
}

export function ClassicTitle({ children }: { children: React.ReactNode }) {
  // Matches old JSP: <CENTER><B><FONT SIZE=6 COLOR="#800000"><U>...</U></FONT></B>
  return (
    <p className="classic-title">
      <b>
        {/* @ts-ignore – <font> is intentional retro markup */}
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
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/classic/classic.css components/classic/primitives.tsx
git commit -m "classic: add shared retro primitives and scoped CSS"
```

---

## Task 3: Classic nav bar with logout

**Files:**
- Create: `components/classic/classic-nav.tsx`

- [ ] **Step 1: Create file**

```tsx
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
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/classic/classic-nav.tsx
git commit -m "classic: add nav bar with username + logout link"
```

---

## Task 4: Dashboard layout branches on uiMode

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { MainNav } from '@/components/layout/main-nav'
import { UserNav } from '@/components/layout/user-nav'
import { ClassicShell } from '@/components/classic/primitives'
import { ClassicNav } from '@/components/classic/classic-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div>Loading...</div>
  if (!session) redirect('/login')

  if (session.user?.uiMode === 'classic') {
    return (
      <ClassicShell>
        <ClassicNav />
        <main>{children}</main>
      </ClassicShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between">
          <MainNav />
          <div className="flex items-center">
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Update `components/layout/user-nav.tsx` to show real username**

Replace the hardcoded `Admin`/`admin@stockapp.com` block. Read at the top of the function:

```tsx
import { signOut, useSession } from 'next-auth/react'
```

And replace the `DropdownMenuLabel` block with:

```tsx
const { data: session } = useSession()
const username = session?.user?.username ?? 'User'
const email = session?.user?.email ?? ''
// …
<DropdownMenuLabel className="font-normal p-2">
  <div className="flex flex-col space-y-1">
    <p className="text-xs font-medium leading-none">{username}</p>
    <p className="text-[10px] leading-none text-muted-foreground">{email}</p>
  </div>
</DropdownMenuLabel>
```

- [ ] **Step 3: Type check + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Manual test**

Run: `npm run dev`.
1. Sign in as `LKS / jaipur`. Confirm modern header + nav still renders. UserNav dropdown shows `LKS` and email.
2. Sign out. Sign in as `GRS / jaipur`. Confirm `/` now renders inside the classic shell — white background, Times New Roman, stacked classic nav links on left, "Logged in as GRS | [ Log Out ]" on the right.
3. Click `[ Log Out ]` — should return to `/login`.

(`/` will look broken for GRS at this point because the dashboard home isn't classic. That's expected — Task 5 redirects it.)

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/layout.tsx components/layout/user-nav.tsx
git commit -m "layout: branch dashboard on uiMode; render classic shell for GRS"
```

---

## Task 5: Redirect classic users away from non-JSP pages

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `app/(dashboard)/holdings/page.tsx`
- Modify: `app/(dashboard)/summary-book/page.tsx`

- [ ] **Step 1: Create a tiny helper hook**

Create `components/classic/use-redirect-classic.ts`:

```ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useRedirectClassic(to: string = '/transactions') {
  const { data: session, status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.uiMode === 'classic') {
      router.replace(to)
    }
  }, [status, session, router, to])
  return session?.user?.uiMode === 'classic'
}
```

- [ ] **Step 2: Modify `app/(dashboard)/page.tsx`**

Read the current file first to see its structure. Then at the very top of the component body (before the existing logic), add:

```tsx
const redirecting = useRedirectClassic('/transactions')
if (redirecting) return null
```

Import: `import { useRedirectClassic } from '@/components/classic/use-redirect-classic'`.

If the page is currently a server component (no `'use client'`), wrap the existing body in a new client component or add `'use client'` at the top. Given the file is 17 lines, the simplest fix:

```tsx
'use client'

import { useRedirectClassic } from '@/components/classic/use-redirect-classic'
// …existing imports

export default function Page() {
  const redirecting = useRedirectClassic('/transactions')
  if (redirecting) return null
  // …existing JSX
}
```

- [ ] **Step 3: Modify `app/(dashboard)/holdings/page.tsx`**

Add the same two lines at the top of the component (the file already starts with `'use client'`):

```tsx
const redirecting = useRedirectClassic('/transactions')
if (redirecting) return null
```

And the import.

- [ ] **Step 4: Modify `app/(dashboard)/summary-book/page.tsx`**

Same pattern: add import and the two-line redirect at the top of the component.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Manual test**

Sign in as `GRS`. Visit `/`, `/holdings`, `/summary-book` directly via URL. Each should redirect to `/transactions` (which currently renders broken inside the classic shell — fixed next task).

Sign in as `LKS`. Same three URLs render normally.

- [ ] **Step 7: Commit**

```bash
git add components/classic/use-redirect-classic.ts app/\(dashboard\)/page.tsx app/\(dashboard\)/holdings/page.tsx app/\(dashboard\)/summary-book/page.tsx
git commit -m "classic: redirect non-JSP pages to /transactions for GRS"
```

---

## Task 6: Transactions classic page

**Goal:** Recreate `FirstPage.jsp` (filter form + Stock Symbol lookup table) and `SecondPage.jsp` (results table). Reuse the existing transactions page's data hooks and CSV export.

**Reference:** `/tmp/stockapp_old/FirstPage.jsp`, `/tmp/stockapp_old/SecondPage.jsp` (extract zip if needed: `unzip -o /Users/aayushs/Downloads/STOCKAPP.zip -d /tmp/stockapp_old`).

**Files:**
- Create: `components/classic/transactions-classic.tsx`
- Modify: `app/(dashboard)/transactions/page.tsx`

- [ ] **Step 1: Inventory the modern transactions page's data layer**

Open `app/(dashboard)/transactions/page.tsx`. Identify (write a short comment at the top of the new classic file with the answers):
- Which hooks/fetches it calls (e.g. `useAccounts()`, any `fetch('/api/stocks?...')`).
- The shape of the row data it renders.
- The CSV export function/handler.

You will reuse these — do NOT duplicate the data fetching logic; if it's defined locally in `page.tsx`, extract it into a small shared hook file `components/classic/use-transactions-data.ts` and use it from both modern and classic. If it's already a hook/util, just import it.

- [ ] **Step 2: Create `components/classic/transactions-classic.tsx`**

Build the component matching `FirstPage.jsp`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicSubmit,
  ClassicAccountPicker,
} from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'

export function TransactionsClassic() {
  const { stocks, stocksLoading, allAccounts, selectedAccount, setSelectedAccount } = useAccounts()

  // Filter state mirroring FirstPage.jsp form
  const [dateMode, setDateMode] = useState<'All' | 'Range'>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [transactionType, setTransactionType] = useState<'All' | 'Buy' | 'Sell'>('All')
  const [stockFilter, setStockFilter] = useState('')
  const [sort1, setSort1] = useState<'stock'|'date'|'action'|'source'|'quantity'|'price'|'tradeValue'>('stock')
  const [order1, setOrder1] = useState<'ASC'|'DESC'>('ASC')
  const [sort2, setSort2] = useState<'stock'|'date'|'action'|'source'|'quantity'|'price'|'tradeValue'>('date')
  const [order2, setOrder2] = useState<'ASC'|'DESC'>('ASC')
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
    if (selectedAccount) r = r.filter(s => s.userid === selectedAccount)
    if (dateMode === 'Range') {
      const from = fromDate ? new Date(fromDate.split('/').reverse().join('-')) : null
      const to = toDate ? new Date(toDate.split('/').reverse().join('-')) : null
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
    const cmp = (a: any, b: any, key: string, dir: 'ASC'|'DESC') => {
      const av = a[key]; const bv = b[key]
      if (av === bv) return 0
      const less = av < bv ? -1 : 1
      return dir === 'ASC' ? less : -less
    }
    r = [...r].sort((a, b) => cmp(a, b, sort1, order1) || cmp(a, b, sort2, order2))
    return r
  }, [stocks, selectedAccount, dateMode, fromDate, toDate, transactionType, stockFilter, sort1, order1, sort2, order2])

  const distinctStocks = useMemo(() => {
    const set = new Set(stocks.map(s => s.stock))
    return Array.from(set).sort()
  }, [stocks])

  return (
    <>
      <ClassicTitle>View Trade Book</ClassicTitle>

      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
        // @ts-ignore – retro alignment attribute
        align="center"
      >
        <p><b>1. </b><ClassicAccountPicker /></p>

        <p>
          <b>2. Date Choice:</b>{' '}
          <label><input type="radio" name="date" checked={dateMode==='All'} onChange={() => setDateMode('All')} /> Show All Dates</label>
          {' '}
          <label><input type="radio" name="date" checked={dateMode==='Range'} onChange={() => setDateMode('Range')} /> Range</label>
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
            <option value="All">All</option><option value="Buy">Buy</option><option value="Sell">Sell</option>
          </select>
        </p>

        <p>
          <b>4. Enter Stock Symbol/s (e.g. banpro,jetair,centex):</b>{' '}
          <input type="text" size={60} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} />
        </p>

        <p>
          <b>5. Primary Sort By: </b>
          <select value={sort1} onChange={(e) => setSort1(e.target.value as any)}>
            <option value="stock">Stock Symbol</option>
            <option value="date">Date</option>
            <option value="action">Action(Buy/Sell)</option>
            <option value="source">Source</option>
            <option value="quantity">Quantity</option>
            <option value="price">Price</option>
            <option value="tradeValue">Trade_Value</option>
          </select>
          {' '}
          <label><input type="radio" name="order1" checked={order1==='ASC'} onChange={() => setOrder1('ASC')} /><b>ASC</b></label>
          {' '}
          <label><input type="radio" name="order1" checked={order1==='DESC'} onChange={() => setOrder1('DESC')} /><b>DESC</b></label>
          <br />
          <b>6. Secondary Sort By: </b>
          <select value={sort2} onChange={(e) => setSort2(e.target.value as any)}>
            <option value="stock">Stock Symbol</option>
            <option value="date">Date</option>
            <option value="action">Action(Buy/Sell)</option>
            <option value="source">Source</option>
            <option value="quantity">Quantity</option>
            <option value="price">Price</option>
            <option value="tradeValue">Trade_Value</option>
          </select>
          {' '}
          <label><input type="radio" name="order2" checked={order2==='ASC'} onChange={() => setOrder2('ASC')} /><b>ASC</b></label>
          {' '}
          <label><input type="radio" name="order2" checked={order2==='DESC'} onChange={() => setOrder2('DESC')} /><b>DESC</b></label>
        </p>

        <p>
          <ClassicSubmit value="Submit" />{' '}
          <input type="reset" value="Reset" onClick={handleReset} />
        </p>
      </form>

      {submitted && (
        <>
          {/* Results table — mirrors SecondPage.jsp */}
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
                  <ClassicTd>{new Date(r.date).toLocaleDateString('en-GB')}</ClassicTd>
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

      {/* Stock Symbol lookup — mirrors bottom of FirstPage.jsp */}
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
```

If the modern page exposes a CSV export helper, add a small `<p className="classic-toolbar"><a onClick={exportCsv}>[ Export CSV ]</a></p>` above the results table — import the helper from wherever the modern page defines it.

- [ ] **Step 3: Modify `app/(dashboard)/transactions/page.tsx`**

At the top of the default-export component body, before any existing logic:

```tsx
'use client'  // ensure this line is at the top of the file
import { useSession } from 'next-auth/react'
import { TransactionsClassic } from '@/components/classic/transactions-classic'
// …existing imports

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <TransactionsClassic />
  // …existing modern body unchanged
}
```

Do NOT modify the modern body. Add the four lines above, that's it.

- [ ] **Step 4: Type check + build**

Run: `npx tsc --noEmit` and `npm run build`.
Expected: 0 type errors, build succeeds.

- [ ] **Step 5: Manual test**

Sign in as `GRS`. Navigate to `/transactions`. Verify:
- Maroon underlined "View Trade Book" title.
- Filter form numbered 1–6 with retro layout.
- Account picker shows all accounts.
- Click Submit — results table with yellow background and dark blue text.
- Reset returns form to defaults.
- "Stock Symbol lookup" table at bottom; clicking a symbol navigates to `/summary?stock=X` (will be styled correctly after Task 7).

Sign in as `LKS`. Navigate to `/transactions`. Verify the modern UI renders unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/classic/transactions-classic.tsx app/\(dashboard\)/transactions/page.tsx
git commit -m "classic: transactions page (FirstPage + SecondPage)"
```

---

## Task 7: Summary classic page (per-stock view)

**Reference:** `/tmp/stockapp_old/SummaryPage.jsp`

**Files:**
- Create: `components/classic/summary-classic.tsx`
- Modify: `app/(dashboard)/summary/page.tsx`

- [ ] **Step 1: Read the modern summary page**

Open `app/(dashboard)/summary/page.tsx`. Note:
- It accepts `?stock=X` from search params.
- Which data hook/fetch it uses for per-stock transactions and aggregates.
- Reuse the same data source.

- [ ] **Step 2: Create `components/classic/summary-classic.tsx`**

```tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
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
    if (selectedAccount) r = r.filter(s => s.userid === selectedAccount)
    return [...r].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [stocks, activeStock, selectedAccount])

  // Running totals — mirror SummaryPage.jsp aggregation
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
              {tableRows.length === 0 && <tr><ClassicTd colSpan={8}>No records.</ClassicTd></tr>}
              {tableRows.map(r => (
                <tr key={r.id}>
                  <ClassicTd>{new Date(r.date).toLocaleDateString('en-GB')}</ClassicTd>
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
```

- [ ] **Step 3: Modify `app/(dashboard)/summary/page.tsx`**

Add the classic branch at the top of the default-export component body, identical pattern to Task 6 Step 3:

```tsx
import { useSession } from 'next-auth/react'
import { SummaryClassic } from '@/components/classic/summary-classic'
// …existing imports
// inside component:
const { data: session, status } = useSession()
if (status === 'loading') return null
if (session?.user?.uiMode === 'classic') return <SummaryClassic />
// …existing modern body unchanged
```

- [ ] **Step 4: Type check + manual test**

Run `npx tsc --noEmit` then `npm run dev`.

As `GRS`: from `/transactions`, click a stock symbol in the lookup table. Verify `/summary?stock=X` renders classic with maroon title, yellow table, transactions for that stock, balance/avg-cost line at top. Change the Stock input and submit — table updates.

As `LKS`: navigate to `/summary?stock=X`. Verify modern unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/classic/summary-classic.tsx app/\(dashboard\)/summary/page.tsx
git commit -m "classic: summary page (per-stock SummaryPage.jsp)"
```

---

## Task 8: Profit/Loss classic page

**Reference:** `/tmp/stockapp_old/Profit.jsp`

**Files:**
- Create: `components/classic/profit-loss-classic.tsx`
- Modify: `app/(dashboard)/profit-loss/page.tsx`

- [ ] **Step 1: Inventory modern P/L page**

Open `app/(dashboard)/profit-loss/page.tsx`. Identify:
- Data source (likely `/api/analytics/...` or a derived computation over `stocks`).
- The shape of P/L rows (per stock: realized, unrealized, etc.).
- Year filter behavior, "Not Sold" toggle behavior.

If the modern page does the computation inline, refactor the pure compute logic into `lib/pl.ts` and import from both modern and classic. Do NOT duplicate the math.

- [ ] **Step 2: Create `components/classic/profit-loss-classic.tsx`**

Skeleton (fill in the actual P/L data binding from Step 1):

```tsx
'use client'

import { useState, useMemo } from 'react'
import { ClassicTitle, ClassicTable, ClassicTh, ClassicTd, ClassicAccountPicker, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
// import { computePL } from '@/lib/pl'  // <-- if extracted in Step 1

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

  // Replace this line with the actual compute call from the function you extracted/identified in Step 1.
  // Example: const rows = computePL(stocks, { year: year ? Number(year) : null, account: selectedAccount, stockFilter, view })
  const rows: Array<{ stock: string; qty: number; cost: number; sale: number; pl: number }> = []

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
          <label><input type="radio" checked={view==='profit'} onChange={() => setView('profit')} /> Profit/Loss</label>
          {' '}
          <label><input type="radio" checked={view==='notSold'} onChange={() => setView('notSold')} /> Not Sold</label>
          {' '}<ClassicSubmit value="Submit" />
        </p>
      </form>

      <ClassicTable>
        <thead>
          <tr>
            <ClassicTh>Stock</ClassicTh>
            <ClassicTh>Quantity</ClassicTh>
            <ClassicTh>Cost</ClassicTh>
            <ClassicTh>Sale Value</ClassicTh>
            <ClassicTh>P/L</ClassicTh>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><ClassicTd colSpan={5}>No records.</ClassicTd></tr>}
          {rows.map(r => (
            <tr key={r.stock}>
              <ClassicTd>{r.stock}</ClassicTd>
              <ClassicTd>{r.qty}</ClassicTd>
              <ClassicTd>{r.cost.toFixed(2)}</ClassicTd>
              <ClassicTd>{r.sale.toFixed(2)}</ClassicTd>
              <ClassicTd>{r.pl.toFixed(2)}</ClassicTd>
            </tr>
          ))}
        </tbody>
      </ClassicTable>
    </>
  )
}
```

Replace the `rows` placeholder with the shared P/L compute from Step 1 — column names should match what the modern page shows. If the modern page has additional columns (e.g. unrealized, % return), include them.

- [ ] **Step 3: Modify `app/(dashboard)/profit-loss/page.tsx`**

Add classic branch at top of component, same pattern as Task 6.

- [ ] **Step 4: Type check + manual test**

`npx tsc --noEmit`. As `GRS`, visit `/profit-loss`. Verify retro form with Year/Stock/View, yellow table with P/L rows. Toggling year and view updates rows. As `LKS`, modern unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/classic/profit-loss-classic.tsx app/\(dashboard\)/profit-loss/page.tsx lib/pl.ts 2>/dev/null
git commit -m "classic: profit-loss page (Profit.jsp)"
```

---

## Task 9: Add Stock classic page

**Reference:** `/tmp/stockapp_old/StockDetails.jsp`, `/tmp/stockapp_old/AddStock.jsp`

**Files:**
- Create: `components/classic/add-stock-classic.tsx`
- Modify: `app/(dashboard)/add-stock/page.tsx`

- [ ] **Step 1: Inventory modern add-stock page**

Open `app/(dashboard)/add-stock/page.tsx`. Identify the POST endpoint (likely `/api/stocks` with method `POST`), the field names it submits, and any validation. The classic form must hit the same endpoint with the same payload shape.

- [ ] **Step 2: Create `components/classic/add-stock-classic.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassicTitle, ClassicAccountPicker, ClassicSubmit } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useToast } from '@/components/ui/use-toast'

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
    isin: '',
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
      // Match the payload the modern page sends — confirm in Step 1.
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: form.userid,
          date: form.date,           // expected format: confirm with modern page
          stock: form.stock,
          action: form.action,
          source: form.source || null,
          quantity: qty,
          price: price,
          tradeValue: qty * price,
          brokerage,
          orderRef: form.orderRef || null,
          remarks: form.remarks || null,
          isin: form.isin || null,
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
          <select value={form.userid} onChange={(e) => set('userid', e.target.value)}>
            {allAccounts.map(a => <option key={a.userid} value={a.userid}>{a.userid}</option>)}
          </select>
        </p>
        <p><b>Date (dd/mm/yyyy): </b><input type="text" size={15} value={form.date} onChange={(e) => set('date', e.target.value)} required /></p>
        <p><b>Stock: </b><input type="text" size={20} value={form.stock} onChange={(e) => set('stock', e.target.value)} required /></p>
        <p>
          <b>Action: </b>
          <label><input type="radio" checked={form.action==='Buy'} onChange={() => set('action', 'Buy')} /> Buy</label>
          {' '}
          <label><input type="radio" checked={form.action==='Sell'} onChange={() => set('action', 'Sell')} /> Sell</label>
        </p>
        <p><b>Source: </b><input type="text" size={20} value={form.source} onChange={(e) => set('source', e.target.value)} /></p>
        <p><b>Quantity: </b><input type="text" size={10} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></p>
        <p><b>Price: </b><input type="text" size={10} value={form.price} onChange={(e) => set('price', e.target.value)} required /></p>
        <p><b>Brokerage: </b><input type="text" size={10} value={form.brokerage} onChange={(e) => set('brokerage', e.target.value)} /></p>
        <p><b>Order Ref: </b><input type="text" size={20} value={form.orderRef} onChange={(e) => set('orderRef', e.target.value)} /></p>
        <p><b>Remarks: </b><input type="text" size={40} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} /></p>
        <p><b>ISIN: </b><input type="text" size={20} value={form.isin} onChange={(e) => set('isin', e.target.value)} /></p>
        <p>
          <ClassicSubmit value={submitting ? 'Submitting...' : 'Submit'} />{' '}
          <input type="reset" value="Reset" />
        </p>
      </form>
    </>
  )
}
```

**Important:** in Step 1 you confirmed the actual POST payload shape and date format the modern page uses. Adjust the body in `handleSubmit` to match exactly. Date format mismatches will cause silent server-side bugs.

- [ ] **Step 3: Modify `app/(dashboard)/add-stock/page.tsx`**

Add classic branch at top of component, same pattern as Task 6.

- [ ] **Step 4: Type check + manual test**

`npx tsc --noEmit`. As `GRS`, navigate to `/add-stock`. Submit a Buy with valid data — should redirect to `/transactions` and the new entry should appear after Submit on the filter form. As `LKS`, modern unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/classic/add-stock-classic.tsx app/\(dashboard\)/add-stock/page.tsx
git commit -m "classic: add-stock page (StockDetails.jsp)"
```

---

## Task 10: Modify classic page

**Reference:** `/tmp/stockapp_old/GetRecord.jsp`, `/tmp/stockapp_old/UpdateStock.jsp`

**Files:**
- Create: `components/classic/modify-classic.tsx`
- Modify: `app/(dashboard)/modify/page.tsx`

- [ ] **Step 1: Inventory modern modify page**

Open `app/(dashboard)/modify/page.tsx`. It's only 92 lines — quickly identify lookup-by-id flow, the PUT/PATCH endpoint, and the DELETE endpoint.

- [ ] **Step 2: Create `components/classic/modify-classic.tsx`**

Two-stage UI: lookup form → editable form with Update/Delete.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassicTitle, ClassicSubmit, ClassicAccountPicker } from './primitives'
import { useAccounts } from '@/components/providers/accounts-provider'
import { useToast } from '@/components/ui/use-toast'

export function ModifyClassic() {
  const { stocks, refreshStocks } = useAccounts()
  const { toast } = useToast()
  const router = useRouter()
  const [idInput, setIdInput] = useState('')
  const [record, setRecord] = useState<any | null>(null)
  const [form, setForm] = useState<any>(null)

  const lookup = (e: React.FormEvent) => {
    e.preventDefault()
    const id = Number(idInput)
    const found = stocks.find(s => s.id === id)
    if (!found) {
      toast({ title: 'Not found', description: `No record with id ${id}`, variant: 'destructive' })
      return
    }
    setRecord(found)
    setForm({
      ...found,
      date: new Date(found.date).toISOString().slice(0, 10),
    })
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const update = async () => {
    // Match modern PUT/PATCH endpoint and payload (confirm in Step 1).
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
  }

  const remove = async () => {
    if (!confirm(`Delete record ${record.id}?`)) return
    const res = await fetch(`/api/stocks/${record.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Delete failed', description: await res.text(), variant: 'destructive' })
      return
    }
    toast({ title: 'Deleted' })
    await refreshStocks()
    router.push('/transactions')
  }

  return (
    <>
      <ClassicTitle>Modify Stock Details</ClassicTitle>
      {!record && (
        <form onSubmit={lookup}>
          <p><ClassicAccountPicker /></p>
          <p>
            <b>Record Id: </b>
            <input type="text" size={10} value={idInput} onChange={(e) => setIdInput(e.target.value)} required />
            {' '}<ClassicSubmit value="Fetch" />
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
            <label><input type="radio" checked={form.action==='Buy'} onChange={() => set('action', 'Buy')} /> Buy</label>
            {' '}<label><input type="radio" checked={form.action==='Sell'} onChange={() => set('action', 'Sell')} /> Sell</label>
          </p>
          <p><b>Source: </b><input type="text" value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} /></p>
          <p><b>Quantity: </b><input type="number" value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} /></p>
          <p><b>Price: </b><input type="number" value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></p>
          <p><b>Brokerage: </b><input type="number" value={form.brokerage} onChange={(e) => set('brokerage', Number(e.target.value))} /></p>
          <p><b>Order Ref: </b><input type="text" value={form.orderRef ?? ''} onChange={(e) => set('orderRef', e.target.value)} /></p>
          <p><b>Remarks: </b><input type="text" value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} /></p>
          <p><b>ISIN: </b><input type="text" value={form.isin ?? ''} onChange={(e) => set('isin', e.target.value)} /></p>
          <p>
            <ClassicSubmit value="Update" />{' '}
            <input type="button" value="Delete" onClick={remove} />{' '}
            <input type="button" value="Cancel" onClick={() => { setRecord(null); setForm(null); setIdInput('') }} />
          </p>
        </form>
      )}
    </>
  )
}
```

Confirm the PUT/PATCH endpoint URL and payload shape match the modern page (from Step 1). Adjust `fetch` call accordingly.

- [ ] **Step 3: Modify `app/(dashboard)/modify/page.tsx`**

Add classic branch at top of component, same pattern as Task 6.

- [ ] **Step 4: Type check + manual test**

`npx tsc --noEmit`. As `GRS`, visit `/modify`, fetch a known id from transactions, edit and submit. As `LKS`, modern unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/classic/modify-classic.tsx app/\(dashboard\)/modify/page.tsx
git commit -m "classic: modify page (GetRecord.jsp + UpdateStock.jsp)"
```

---

## Task 11: Accounts classic page

**Reference:** `/tmp/stockapp_old/CreateAccount.jsp`

**Files:**
- Create: `components/classic/accounts-classic.tsx`
- Modify: `app/(dashboard)/accounts/page.tsx`

- [ ] **Step 1: Inventory modern accounts page**

Open `app/(dashboard)/accounts/page.tsx`. Identify create/update/deactivate endpoints under `/api/accounts/*` (the repo already has `/api/accounts/active` and `/api/accounts/list`; check for create/update routes).

- [ ] **Step 2: Create `components/classic/accounts-classic.tsx`**

```tsx
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    // Confirm endpoint in Step 1.
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid, name, active: true }),
    })
    if (!res.ok) {
      toast({ title: 'Create failed', description: await res.text(), variant: 'destructive' })
      return
    }
    toast({ title: 'Account created' })
    setUserid(''); setName('')
    await refreshAccounts()
  }

  return (
    <>
      <ClassicTitle>Create New Account</ClassicTitle>

      <ClassicTable>
        <thead>
          <tr><ClassicTh>User Id</ClassicTh><ClassicTh>Name</ClassicTh><ClassicTh>Active</ClassicTh></tr>
        </thead>
        <tbody>
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
        <p><ClassicSubmit value="Create" /></p>
      </form>
    </>
  )
}
```

- [ ] **Step 3: Modify `app/(dashboard)/accounts/page.tsx`**

Add classic branch at top of component, same pattern as Task 6.

- [ ] **Step 4: Type check + manual test**

`npx tsc --noEmit`. As `GRS`, visit `/accounts`. See existing accounts in yellow table. Create a test account, verify it appears. As `LKS`, modern unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/classic/accounts-classic.tsx app/\(dashboard\)/accounts/page.tsx
git commit -m "classic: accounts page (CreateAccount.jsp)"
```

---

## Task 12: Final integration QA

**Files:** none.

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: success, no type errors, no missing-import errors.

- [ ] **Step 2: Classic walkthrough**

Run `npm run dev`. Sign in as `GRS`.
- Confirm `/` redirects to `/transactions`.
- Confirm `/holdings` and `/summary-book` both redirect to `/transactions`.
- From `/transactions`: filter form works, results table renders retro, stock lookup link goes to `/summary?stock=X`.
- `/summary?stock=X` renders classic.
- `/profit-loss` renders classic; year/view toggle works.
- `/add-stock` creates a record and returns to `/transactions`.
- `/modify` fetches and updates a record.
- `/accounts` shows accounts table; creating one updates the list.
- Top-right `[ Log Out ]` returns to `/login`.

- [ ] **Step 3: Modern walkthrough**

Sign in as `LKS`. Visit every page in the existing modern nav (`/`, `/transactions`, `/summary-book`, `/summary`, `/holdings`, `/profit-loss`, `/add-stock`, `/modify`, `/accounts`). Verify nothing looks regressed — same as before this feature. UserNav dropdown shows `LKS` instead of `Admin`.

- [ ] **Step 4: Mode-switch test**

Sign out as LKS, sign in as GRS, sign out, sign in as LKS — verify each switch lands in the correct UI without stale state.

- [ ] **Step 5: Commit any cleanup**

If you found nothing to fix, no commit needed. Otherwise commit small fixes with a clear message.
