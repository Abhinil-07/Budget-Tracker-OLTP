# BACKEND.md — Backend & Database Architecture

## Stack

- **Framework:** FastAPI (Python 3.11+)
- **Database:** Supabase (managed Postgres)
- **Supabase client:** `supabase-py` (async)
- **Scheduler:** APScheduler (AsyncIOScheduler)
- **HTTP client:** `httpx` (async) — for Databricks API calls
- **Validation:** Pydantic v2
- **Auth:** Supabase Auth — JWT validated in FastAPI middleware

---

## Project Structure

```
backend/
├── main.py                     ← App entry point, lifespan, CORS, router registration
├── config.py                   ← Settings via pydantic-settings (reads .env)
├── dependencies.py             ← Shared FastAPI dependencies (db client, current user)
│
├── routers/
│   ├── accounts.py             ← CRUD for accounts
│   ├── transactions.py         ← CRUD + query for transactions
│   ├── budget.py               ← Get/update monthly budget
│   └── sync.py                 ← Sync status + manual trigger endpoint
│
├── services/
│   ├── account_service.py      ← Business logic for accounts + balance management
│   ├── transaction_service.py  ← Business logic for transactions
│   ├── budget_service.py       ← MTD spend calculation, budget comparison
│   └── sync_service.py         ← CSV export, DBFS upload, job trigger
│
├── models/
│   ├── account.py              ← Pydantic schemas: Account, CreateAccountDto, etc.
│   ├── transaction.py          ← Pydantic schemas: Transaction, CreateTransactionDto, etc.
│   ├── budget.py               ← Pydantic schemas: Budget, UpdateBudgetDto
│   └── sync.py                 ← Pydantic schemas: SyncLog, SyncStatus
│
├── db/
│   └── supabase.py             ← Supabase async client factory
│
├── scheduler/
│   └── jobs.py                 ← APScheduler setup, weekly sync job registration
│
└── exceptions.py               ← Custom exception classes + global handler
```

---

## API Routes

All routes prefixed `/api`. All responses follow:

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

### Accounts

| Method | Path                 | Description                                                 |
| ------ | -------------------- | ----------------------------------------------------------- |
| GET    | `/api/accounts`      | List all accounts with current balance                      |
| POST   | `/api/accounts`      | Create a new account                                        |
| PATCH  | `/api/accounts/{id}` | Update account name or settings                             |
| DELETE | `/api/accounts/{id}` | Delete account (requires zero balance or explicit override) |

### Transactions

| Method | Path                     | Description                               |
| ------ | ------------------------ | ----------------------------------------- |
| GET    | `/api/transactions`      | List transactions — paginated, filterable |
| POST   | `/api/transactions`      | Log a new transaction                     |
| DELETE | `/api/transactions/{id}` | Delete a transaction (reverses balance)   |

**GET `/api/transactions` query params:**

```
account_id    string    filter by account
category      string    filter by category
type          income|expense
date_from     ISO date
date_to       ISO date
page          int (default 1)
page_size     int (default 20, max 100)
```

### Budget

| Method | Path          | Description                                      |
| ------ | ------------- | ------------------------------------------------ |
| GET    | `/api/budget` | Get current month budget + MTD spend + remaining |
| PUT    | `/api/budget` | Create or update monthly budget                  |

### Sync

| Method | Path                | Description                                            |
| ------ | ------------------- | ------------------------------------------------------ |
| GET    | `/api/sync/status`  | Last sync result, timestamp, rows exported             |
| POST   | `/api/sync/trigger` | Manually trigger sync (rate limited: once per 6 hours) |

---

## Supabase Schema

### `accounts`

```sql
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('savings', 'current', 'credit_card')),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'INR',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Balance for credit cards means amount owed (always >= 0)
-- Balance for savings/current means available balance (can be negative if overdrawn)

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

### `transactions`

```sql
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  category      TEXT NOT NULL,
  description   TEXT,
  txn_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_txn_date ON transactions(txn_date DESC);
CREATE INDEX idx_transactions_sync ON transactions(user_id, txn_date DESC);
```

### `budgets`

```sql
CREATE TABLE budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  month           DATE NOT NULL,             -- always the 1st of the month
  total_cents     BIGINT NOT NULL,
  category_limits JSONB,                     -- optional: { "food": 500000, "transport": 200000 }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);
```

### `sync_logs`

```sql
CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status          TEXT NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  rows_exported   INT,
  error_message   TEXT,
  databricks_run_id BIGINT,                  -- run_id returned by Databricks Jobs API
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id, triggered_at DESC);
```

### Row Level Security

All tables have RLS enabled. Users can only see and modify their own rows.

```sql
-- Example for transactions (repeat pattern for all tables)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own transactions"
ON transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Balance Management

Balance is maintained as a running total in `accounts.balance_cents`. It is never computed from transaction history at query time.

**On transaction INSERT:**

```python
async def create_transaction(dto: CreateTransactionDto, user_id: str):
    async with supabase_transaction() as txn:
        # 1. Insert transaction row
        transaction = await txn.table('transactions').insert({...}).execute()

        # 2. Update account balance atomically
        delta = dto.amount_cents if dto.type == 'income' else -dto.amount_cents

        # Credit card: expense increases owed, income (payment) decreases owed
        if account.type == 'credit_card':
            delta = dto.amount_cents if dto.type == 'expense' else -dto.amount_cents

        await txn.rpc('increment_balance', {
            'account_id': dto.account_id,
            'delta': delta
        }).execute()

    return transaction
```

**Postgres function for atomic balance update:**

```sql
CREATE OR REPLACE FUNCTION increment_balance(account_id UUID, delta BIGINT)
RETURNS void AS $$
  UPDATE accounts
  SET balance_cents = balance_cents + delta,
      updated_at = now()
  WHERE id = account_id;
$$ LANGUAGE sql;
```

**On transaction DELETE:**

- Reverse the balance delta using the same function with negated delta
- Transaction is soft-deleted? No — hard delete, balance reversed immediately

---

## Service Layer Pattern

Routes are thin. Business logic lives in services.

```python
# routers/transactions.py
@router.post("/", response_model=ApiResponse[TransactionResponse])
async def create_transaction(
    body: CreateTransactionDto,
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    transaction = await service.create(body, user_id=current_user.id)
    return ApiResponse(data=transaction)

# services/transaction_service.py
class TransactionService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def create(self, dto: CreateTransactionDto, user_id: str) -> Transaction:
        # Validate account belongs to user
        # Compute balance delta
        # Insert transaction + update balance atomically
        # Return transaction
        ...
```

---

## Error Handling

Custom exceptions caught by a global handler:

```python
class AppError(Exception):
    def __init__(self, status_code: int, message: str, code: str):
        self.status_code = status_code
        self.message = message
        self.code = code

class NotFoundError(AppError): ...
class ValidationError(AppError): ...
class InsufficientFundsError(AppError): ...
class SyncRateLimitError(AppError): ...

# Global handler returns:
# { "data": null, "error": { "code": "NOT_FOUND", "message": "Account not found" }, "meta": {} }
```

---

## Categories (predefined)

```python
CATEGORIES = [
    "Food & Dining",
    "Transport",
    "Shopping",
    "Entertainment",
    "Healthcare",
    "Utilities",
    "Rent",
    "Salary",
    "Freelance",
    "Investment",
    "Transfer",
    "Other",
]
```

---

## Authentication

Supabase Auth handles signup/login. FastAPI validates the JWT on every request.

```python
# dependencies.py
async def get_current_user(
    authorization: str = Header(...),
    supabase: AsyncClient = Depends(get_supabase)
) -> User:
    token = authorization.removeprefix("Bearer ")
    user = await supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401)
    return user.user
```

For a personal single-user setup: auth can be simplified to a static API key in `.env` if preferred. Document this as a config option, don't hardcode either path.

---

## Config

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    databricks_host: str
    databricks_token: str
    databricks_job_id: int
    databricks_dbfs_path: str = "/FileStore/finance_tracker/weekly_transactions.csv"
    sync_rate_limit_hours: int = 6
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```
