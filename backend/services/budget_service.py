from supabase import AsyncClient
from datetime import date
from typing import List, Dict, Optional
import calendar

from models.budget import Budget, UpdateBudgetDto, BudgetWithSpend, CategorySpend
from exceptions import ValidationError

class BudgetService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def get_budget(self, user_id: str, month_str: Optional[str] = None) -> BudgetWithSpend:
        """Retrieve the budget details for the specified month including calculated MTD spend metrics."""
        # 1. Determine first and last day of specified calendar month
        if month_str:
            try:
                today = date.fromisoformat(month_str)
            except ValueError:
                today = date.today()
        else:
            today = date.today()

        current_month_start = today.replace(day=1)
        _, last_day = calendar.monthrange(today.year, today.month)
        current_month_end = today.replace(day=last_day)

        # 2. Fetch current month's budget record
        budget_response = (
            await self.db.table("budgets")
            .select("*")
            .eq("user_id", user_id)
            .eq("month", current_month_start.isoformat())
            .execute()
        )

        budget_id = None
        total_cents = 0
        category_limits = {}

        if budget_response.data:
            budget = budget_response.data[0]
            budget_id = budget["id"]
            total_cents = budget["total_cents"]
            category_limits = budget.get("category_limits") or {}

        # 3. Retrieve all expense transactions for the current month
        txn_response = (
            await self.db.table("transactions")
            .select("amount_cents, category")
            .eq("user_id", user_id)
            .eq("type", "expense")
            .gte("txn_date", current_month_start.isoformat())
            .lte("txn_date", current_month_end.isoformat())
            .execute()
        )

        transactions = txn_response.data or []

        # 4. Calculate overall MTD spend and MTD spend by category
        mtd_spent_cents = sum(t["amount_cents"] for t in transactions)
        
        category_spend_map: Dict[str, int] = {}
        for t in transactions:
            cat = t["category"]
            category_spend_map[cat] = category_spend_map.get(cat, 0) + t["amount_cents"]

        # 5. Build category breakdown if category limits are specified
        category_breakdown: List[CategorySpend] = []
        if category_limits:
            all_categories = set(category_limits.keys()) | set(category_spend_map.keys())
            for cat in sorted(all_categories):
                limit = category_limits.get(cat, 0)
                spent = category_spend_map.get(cat, 0)
                remaining = limit - spent
                
                if limit > 0:
                    pct = (spent / limit) * 100.0
                    pct = min(100.0, pct)
                else:
                    pct = 100.0 if spent > 0 else 0.0

                category_breakdown.append(
                    CategorySpend(
                        category=cat,
                        limit_cents=limit,
                        spent_cents=spent,
                        remaining_cents=remaining,
                        percentage_used=pct
                    )
                )

        # 6. Compute overall month-to-date metrics
        remaining_cents = total_cents - mtd_spent_cents
        if total_cents > 0:
            percentage_used = (mtd_spent_cents / total_cents) * 100.0
            percentage_used = min(100.0, percentage_used)
        else:
            percentage_used = 100.0 if mtd_spent_cents > 0 else 0.0

        return BudgetWithSpend(
            id=budget_id,
            month=current_month_start,
            total_cents=total_cents,
            mtd_spent_cents=mtd_spent_cents,
            remaining_cents=remaining_cents,
            percentage_used=percentage_used,
            category_limits=category_limits if category_limits else None,
            category_breakdown=category_breakdown
        )

    async def upsert_budget(self, dto: UpdateBudgetDto, user_id: str, month_str: Optional[str] = None) -> Budget:
        """Create or update the specified month's budget configuration."""
        if month_str:
            try:
                today = date.fromisoformat(month_str)
            except ValueError:
                today = date.today()
        else:
            today = date.today()
            
        current_month_start = today.replace(day=1)
        
        data = {
            "user_id": user_id,
            "month": current_month_start.isoformat(),
            "total_cents": dto.total_cents,
            "category_limits": dto.category_limits
        }

        response = (
            await self.db.table("budgets")
            .upsert(data, on_conflict="user_id,month")
            .execute()
        )

        if not response.data:
            raise ValidationError("Failed to upsert budget configuration")

        return Budget(**response.data[0])
