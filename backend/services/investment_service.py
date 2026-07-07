from supabase import AsyncClient
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timezone

from models.investment import Investment, CreateInvestmentDto, UpdateInvestmentDto, UpdateInvestmentValueDto
from exceptions import NotFoundError, ValidationError

class InvestmentService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_investments(self, user_id: str) -> List[Investment]:
        """List all investments for a specific user."""
        response = (
            await self.db.table("investments")
            .select("*")
            .eq("user_id", user_id)
            .order("name")
            .execute()
        )
        return [Investment(**row) for row in response.data]

    async def create_investment(self, dto: CreateInvestmentDto, user_id: str) -> Investment:
        """Create a new investment."""
        data = {
            "user_id": user_id,
            "name": dto.name,
            "type": dto.type,
            "invested_amount_cents": dto.invested_amount_cents,
            "current_value_cents": dto.current_value_cents,
            "notes": dto.notes,
        }
        
        # Populate FD/PPF specific fields if relevant
        if dto.type in ("fixed_deposit", "ppf"):
            data["interest_rate"] = float(dto.interest_rate) if dto.interest_rate is not None else None
            
        if dto.type == "fixed_deposit":
            data["maturity_date"] = dto.maturity_date.isoformat() if dto.maturity_date else None

        response = await self.db.table("investments").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create investment in database")
        return Investment(**response.data[0])

    async def update_investment(self, investment_id: str, dto: UpdateInvestmentDto, user_id: str) -> Investment:
        """Update metadata details of an investment (name, interest, notes, etc.)."""
        # First verify it exists and belongs to the user
        existing = await self.db.table("investments").select("*").eq("id", investment_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise NotFoundError("Investment not found")

        data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if dto.name is not None:
            data["name"] = dto.name
        if dto.invested_amount_cents is not None:
            data["invested_amount_cents"] = dto.invested_amount_cents
        if dto.current_value_cents is not None:
            data["current_value_cents"] = dto.current_value_cents
        if dto.notes is not None:
            data["notes"] = dto.notes
            
        # Optional fields based on type
        inv_type = existing.data[0]["type"]
        if inv_type in ("fixed_deposit", "ppf") and dto.interest_rate is not None:
            data["interest_rate"] = float(dto.interest_rate)
        if inv_type == "fixed_deposit" and dto.maturity_date is not None:
            data["maturity_date"] = dto.maturity_date.isoformat()

        response = await self.db.table("investments").update(data).eq("id", investment_id).eq("user_id", user_id).execute()
        if not response.data:
            raise ValidationError("Failed to update investment")
        return Investment(**response.data[0])

    async def update_investment_value(self, investment_id: str, dto: UpdateInvestmentValueDto, user_id: str) -> Investment:
        """Update both the invested_amount_cents and current_value_cents of an investment."""
        existing = await self.db.table("investments").select("id").eq("id", investment_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise NotFoundError("Investment not found")

        data = {
            "invested_amount_cents": dto.invested_amount_cents,
            "current_value_cents": dto.current_value_cents,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        response = await self.db.table("investments").update(data).eq("id", investment_id).eq("user_id", user_id).execute()
        if not response.data:
            raise ValidationError("Failed to update investment values")
        return Investment(**response.data[0])

    async def delete_investment(self, investment_id: str, user_id: str) -> str:
        """Delete an investment."""
        existing = await self.db.table("investments").select("id").eq("id", investment_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise NotFoundError("Investment not found")

        await self.db.table("investments").delete().eq("id", investment_id).eq("user_id", user_id).execute()
        return investment_id
