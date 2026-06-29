# FRONTEND.md — Frontend Architecture

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State:** Zustand for global client state, React Query (TanStack Query) for server state
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **API Client:** A typed client wrapping fetch — never raw fetch in components

---

## Design Direction

The UI is a **financial command center** — not a banking app clone, not a spreadsheet. The aesthetic is dark, precise, and data-forward. Think terminal meets fintech.

### Design Tokens

```
Background:       #0A0A0F   (near black, slight blue cast)
Surface:          #13131A   (cards, panels)
Surface raised:   #1C1C26   (hover states, modals)
Border:           #2A2A38   (subtle dividers)

Accent:           #6C63FF   (primary — electric violet)
Accent muted:     #3D3A6B   (secondary — dimmed violet for backgrounds)

Success:          #22C55E   (income, positive balance)
Danger:           #EF4444   (expenses, credit card debt)
Warning:          #F59E0B   (budget near limit)

Text primary:     #F0F0F5
Text secondary:   #8888AA
Text muted:       #55556A

Font display:     'Inter' — tight tracking, medium weight for numbers
Font mono:        'JetBrains Mono' — all currency values, account numbers
```

### Signature Element

Every account balance renders in JetBrains Mono with a subtle digit-flip animation on update. Numbers count up/down when a transaction is logged — the user always _feels_ the money move.

---

## Pages and Routes

### `/` — Dashboard (primary view)

The single most important page. Everything the user needs at a glance.

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Header: "Finance Tracker"    [+ Add Txn]   │
├──────────────┬──────────────┬───────────────┤
│  Account     │  Account     │  Credit Card  │
│  Card        │  Card        │  Card         │
│  (Bank 1)    │  (Bank 2)    │               │
├──────────────┴──────────────┴───────────────┤
│  Budget Progress Bar (month to date)        │
├─────────────────────────────────────────────┤
│  [Spent] [Remaining] [Income] — stat row    │
├─────────────────────────────────────────────┤
│  Recent Transactions (last 10, live)        │
├─────────────────────────────────────────────┤
│  Weekly Spending Chart (bar, 7 days)        │
└─────────────────────────────────────────────┘
```

**Account Card anatomy:**

```
┌────────────────────────────┐
│  HDFC Savings          🏦  │
│                            │
│  ₹ 84,231.00               │  ← JetBrains Mono, large
│                            │
│  ↑ +₹5,000 today           │  ← green if net positive
│  Last txn: 2h ago          │
└────────────────────────────┘
```

Credit card cards show `OWED: ₹12,400` in red instead of a balance.

---

### `/transactions` — Transaction Log

Full paginated list of all transactions. Filterable by account, category, date range.

**Features:**

- Search by description
- Filter by: account, category, type (income/expense), date range
- Sort by: date, amount
- Inline delete with confirmation
- Bulk export to CSV (client-side)

---

### `/accounts` — Account Management

Add, edit, and delete accounts.

**Account types:** Savings, Current, Credit Card

**Add Account form fields:**

- Name (text)
- Type (select: Savings / Current / Credit Card)
- Opening balance (number — stored as cents)
- Currency (default: user preference, stored in settings)

---

### `/budget` — Budget Settings

Set a monthly budget. See category-level breakdown.

**Layout:**

- Total monthly budget input
- Per-category budget allocation (optional)
- Month-to-date vs budget comparison bar chart
- Category donut chart

---

### `/settings` — App Settings

- Currency preference
- Account management shortcut
- Sync status: last sync timestamp, last sync result (success/failed)
- Manual sync trigger button (calls `POST /api/sync/trigger`)

---

## Component Structure

```
frontend/
├── app/
│   ├── layout.tsx              ← Root layout, providers
│   ├── page.tsx                ← Dashboard
│   ├── transactions/
│   │   └── page.tsx
│   ├── accounts/
│   │   └── page.tsx
│   ├── budget/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── ui/                     ← Primitives: Button, Input, Modal, Badge, Spinner
│   ├── accounts/
│   │   ├── AccountCard.tsx
│   │   ├── AccountList.tsx
│   │   └── AddAccountModal.tsx
│   ├── transactions/
│   │   ├── TransactionRow.tsx
│   │   ├── TransactionList.tsx
│   │   ├── AddTransactionModal.tsx
│   │   └── TransactionFilters.tsx
│   ├── budget/
│   │   ├── BudgetProgressBar.tsx
│   │   └── CategoryBreakdown.tsx
│   ├── charts/
│   │   ├── WeeklySpendingChart.tsx
│   │   └── CategoryDonut.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageWrapper.tsx
│   └── sync/
│       └── SyncStatusBadge.tsx
│
├── lib/
│   ├── api.ts                  ← Typed API client (all backend calls go here)
│   ├── supabase.ts             ← Supabase browser client
│   ├── formatCurrency.ts       ← formatCurrency(cents, currency) → string
│   ├── formatDate.ts           ← UTC → local display
│   └── constants.ts            ← Category list, account type labels
│
├── stores/
│   └── useFinanceStore.ts      ← Zustand: accounts, selected filters
│
├── hooks/
│   ├── useAccounts.ts          ← React Query: fetch accounts
│   ├── useTransactions.ts      ← React Query: fetch transactions (paginated)
│   ├── useBudget.ts            ← React Query: fetch budget + MTD spend
│   └── useSyncStatus.ts        ← React Query: last sync info
│
└── types/
    ├── account.ts
    ├── transaction.ts
    ├── budget.ts
    └── sync.ts
```

---

## API Client Pattern

All backend communication goes through `lib/api.ts`. No component calls `fetch` directly.

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}

export const api = {
  accounts: {
    list: () => request<Account[]>("/api/accounts"),
    create: (body: CreateAccountDto) =>
      request<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/accounts/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: (params: TransactionQuery) =>
      request<PaginatedTransactions>(
        `/api/transactions?${toQueryString(params)}`,
      ),
    create: (body: CreateTransactionDto) =>
      request<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  },
  budget: {
    get: () => request<Budget>("/api/budget"),
    update: (body: UpdateBudgetDto) =>
      request<Budget>("/api/budget", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
  sync: {
    status: () => request<SyncStatus>("/api/sync/status"),
    trigger: () => request<void>("/api/sync/trigger", { method: "POST" }),
  },
};
```

---

## Currency Handling

All amounts received from the API are in **cents (integers)**. Never store or manipulate floats.

```typescript
// lib/formatCurrency.ts
export function formatCurrency(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// Usage
formatCurrency(8423100, "INR"); // → ₹84,231.00
```

---

## State Management

**React Query** owns all server state — accounts, transactions, budget, sync status. It handles caching, refetching, and optimistic updates.

**Zustand** owns local UI state only — selected filters, modal open/close, active account selection.

No Redux. No Context API for data (only for theme/auth).

---

## Add Transaction Flow

This is the highest-frequency user action. It must be fast and low-friction.

1. User clicks `+ Add Transaction` (always visible in header)
2. Modal opens (no page navigation)
3. Form fields:
   - Amount (number input, auto-focused)
   - Type (toggle: Expense / Income)
   - Account (select from accounts list)
   - Category (select from predefined list)
   - Description (text, optional)
   - Date (date picker, defaults to today)
4. Submit → optimistic update → API call → confirm or rollback
5. Account card balance animates to new value
6. Modal closes, transaction appears at top of recent list

---

## Sync Status Display

The Settings page shows:

- Last sync: `Sunday, 15 Jun 2025 at 00:02 UTC`
- Status: `✅ Success — 47 transactions exported` or `❌ Failed — see logs`
- Button: `Run Sync Now` (disabled if a sync ran in the last 6 hours)

The `SyncStatusBadge` component in the header shows a small dot — green if last sync succeeded, red if failed, grey if never run.
