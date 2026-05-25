# Classic UI Mode

## Goal

Let users log in as either `GRS` (classic UI — mimics the original JSP app) or `LKS` (modern V2 UI). The classic UI must visually resemble the original JSP screens (FirstPage, SecondPage, SummaryPage, Profit, StockDetails, GetRecord/UpdateStock, CreateAccount) as closely as possible while preserving all V2 functionality (filters, CSV export, edit/delete, account picker, react-query data).

## Users & auth

- Two valid usernames: `GRS`, `LKS`. Shared password from env `APP_PASSWORD` (value: `jaipur`).
- `lib/auth.ts` `authorize()`:
  - Accept iff `username ∈ {"GRS","LKS"}` and `password === process.env.APP_PASSWORD`.
  - Returned user: `{ id: username, name: username, email: <username>@stockapp.local }`.
- NextAuth callbacks:
  - `jwt`: on sign-in, set `token.username = user.name`, `token.uiMode = user.name === 'GRS' ? 'classic' : 'modern'`.
  - `session`: copy `username` and `uiMode` onto `session.user`.
- `types/next-auth.d.ts`: augment `Session['user']` and `JWT` with `username: string` and `uiMode: 'classic' | 'modern'`.
- Old `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars are removed.

## Routing

No new route tree. Existing routes branch on `session.user.uiMode`.

| Route | Classic (GRS) | Modern (LKS) |
|---|---|---|
| `/` (dashboard home) | redirect → `/transactions` | existing dashboard |
| `/holdings` | redirect → `/transactions` | existing |
| `/transactions` | `TransactionsClassic` | existing |
| `/summary` | `SummaryClassic` (per-stock view, mirrors `SummaryPage.jsp`) | existing |
| `/summary-book` | redirect → `/transactions` (no JSP equivalent — V2-only list view) | existing |
| `/profit-loss` | `ProfitLossClassic` | existing |
| `/add-stock` | `AddStockClassic` | existing |
| `/modify` | `ModifyClassic` | existing |
| `/accounts` | `AccountsClassic` | existing |
| `/login` | shared modern-styled login | same |

Redirects happen client-side at the top of each page component (after `useSession()` resolves). The shared dashboard layout shows a brief loading state until the session is known.

## Layout

`app/(dashboard)/layout.tsx`:

```tsx
const uiMode = session.user.uiMode
if (uiMode === 'classic') {
  return <ClassicShell>{children}</ClassicShell>
}
// existing modern header + main
```

`ClassicShell` renders:
- Plain white `<body>`-like wrapper, no Tailwind container.
- Top link bar (`<a>` tags, dark blue, underlined) — matches old JSP top-of-page links:
  - View Trade Book (`/transactions`)
  - Stock Summary (no top-level link — accessed by clicking a stock symbol; matches old JSP behavior where summary was only reachable via the Stock Symbol lookup table on FirstPage)
  - Profit/Loss (`/profit-loss`)
  - Add Stock Details (`/add-stock`)
  - Modify Stock Details (`/modify`)
  - Create New Account (`/accounts`)
  - Sign Out (calls `signOut()`)
- `<main>` with no padding except a small top margin.

## Per-page split

For each affected page, extract current body to `*Modern.tsx` (mechanical move) and add `*Classic.tsx`. The route file becomes a thin selector:

```tsx
'use client'
export default function Page() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (session?.user?.uiMode === 'classic') return <TransactionsClassic />
  return <TransactionsModern />
}
```

Both children call the same hooks (`useAccount()`, react-query fetches, mutation handlers). Only the JSX/CSS differs.

Files:
- `components/classic/transactions-classic.tsx`
- `components/classic/summary-classic.tsx`
- `components/classic/profit-loss-classic.tsx`
- `components/classic/add-stock-classic.tsx`
- `components/classic/modify-classic.tsx`
- `components/classic/accounts-classic.tsx`

Existing modern bodies move to `components/dashboard/<page>-modern.tsx` (or stay inline if already a one-liner that calls a child component).

## Visual primitives

`components/classic/primitives.tsx` exports:
- `ClassicShell` — wrapper, applies `.classic-root` class.
- `ClassicTitle({ children })` — `<center><b><font size="6" color="#800000"><u>{children}</u></font></b></center>` (using raw `<font>` is fine; TS/React permit it).
- `ClassicTable`, `ClassicTr`, `ClassicTh`, `ClassicTd` — `border=1`, `bgcolor="#FFFFCC"`, dark-blue text. `ClassicTh` matches old `<TH>` styling.
- `ClassicLink` — `<a>` underlined, color `#0000A0`.
- `ClassicSelect`, `ClassicInput`, `ClassicRadio` — minimal browser-default form controls (no Tailwind, no shadcn).
- `ClassicSubmit({ value })` — `<input type="submit" value={value}>`.
- `ClassicAccountPicker` — small inline form `<b>Choose an Account:</b> <select>...</select>` wired to the existing `useAccount()` provider.

`components/classic/classic.css` — loaded by `ClassicShell`. Scoped under `.classic-root`:
```css
.classic-root { font-family: "Times New Roman", Times, serif; background: #fff; color: #000; }
.classic-root a { color: #0000A0; text-decoration: underline; }
.classic-root h1, .classic-root h2 { color: #800000; text-align: center; }
.classic-root table { border-collapse: collapse; background: #FFFFCC; margin: 0 auto; }
.classic-root th, .classic-root td { border: 1px solid #000; padding: 2px 6px; color: #0000A0; }
.classic-root input[type=submit], .classic-root input[type=reset] { font-family: inherit; }
```

The CSS is imported only by `ClassicShell` so it does not leak into modern pages.

## Per-page content (classic)

Each classic page recreates the relevant JSP screen. Functional behavior matches the modern V2 page (same data, same CSV export, same edit/delete).

- **transactions-classic** — Top of page: filter form mirroring `FirstPage.jsp` (account picker, date radio All/Range + from/to, transaction type All/Buy/Sell, stock symbol text input, primary/secondary sort + ASC/DESC, Submit/Reset). Below: table mirroring `SecondPage.jsp` columns (Id, Key, Date, Stock, Action, Source, Quantity, Price, Trade Value, Brokerage, …) plus a small "CSV" link at the top-right of the table.
- **summary-classic** — Per-stock summary view at `/summary?stock=X`. Mirrors `SummaryPage.jsp`: account picker + stock symbol filter, then a table of all transactions for that stock with running totals (buy qty, sell qty, balance, avg cost, realized/unrealized P/L). Reuses the modern `/summary` page's data hooks.
- **profit-loss-classic** — Year selector + account picker + show toggle (P/L vs Not Sold). Table mirroring `Profit.jsp`.
- **add-stock-classic** — Form mirroring `StockDetails.jsp`: account, date, stock, action (Buy/Sell), source, quantity, price, brokerage, order ref, remarks, ISIN. Submit/Reset.
- **modify-classic** — Mirrors `GetRecord.jsp` + `UpdateStock.jsp` — lookup form (account + id/key), then prefilled edit form with Update/Delete.
- **accounts-classic** — Mirrors `CreateAccount.jsp` — list existing accounts in a small bordered table + a create form (userid + name). Use the existing `/api/accounts` endpoints.

Any V2 capability that has no JSP precedent (e.g. inline editing in modify, multi-stock holdings page) is omitted from classic; the equivalent JSP flow is used.

## Data layer

No changes. All classic components consume:
- `useSession()` for user/mode
- existing `useAccount()` provider
- existing react-query hooks for stocks/accounts/analytics

CSV export reuses the existing util.

## Out of scope

- No DB schema changes; no migrations.
- No per-user data isolation — GRS and LKS see the same data and can both pick any account in the picker (mirrors old JSP).
- No in-app UI toggle (mode is strictly tied to username).
- No retro version of `/`, `/holdings`, or `/login`.
- Login page is shared and stays modern.

## Risks / open items

- `<font>` tag and `bgcolor`/`border` attributes are deprecated in HTML5 but still render and TS/React accept them as known intrinsic attributes. Acceptable trade-off for fidelity.
- Holdings/dashboard-home redirects mean a flash of nothing for classic users hitting `/` directly — mitigated by waiting for `status !== 'loading'` before redirecting.
- If a new account is ever added with username `LRS`, decide later whether it gets classic or modern. Default: extend the username-to-mode map in `lib/auth.ts`.
