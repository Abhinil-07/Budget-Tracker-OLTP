from supabase import AsyncClient
from uuid import UUID
from typing import List

from models.account import Account, CreateAccountDto, UpdateAccountDto
from exceptions import NotFoundError, ValidationError

class AccountService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_accounts(self, user_id: str) -> List[Account]:
        """List all accounts for a specific user."""
        response = (
            await self.db.table("accounts")
            .select("*")
            .eq("user_id", user_id)
            .order("name")
            .execute()
        )
        return [Account(**row) for row in response.data]

    async def create_account(self, dto: CreateAccountDto, user_id: str) -> Account:
        """Create a new account with an initial opening balance."""
        try:
            print(f"DEBUG: create_account inputs - dto: {dto}, user_id: {user_id} (type: {type(user_id)})")
            data = {
                "user_id": user_id,
                "name": dto.name,
                "type": dto.type,
                "balance_cents": dto.opening_balance,
                "currency": dto.currency,
                "account_number": dto.account_number,
            }
            print(f"DEBUG: create_account inserting data: {data}")
            response = await self.db.table("accounts").insert(data).execute()
            print(f"DEBUG: create_account response: {response}")
            if not response.data:
                raise ValidationError("Failed to create account in database")
                
            res = Account(**response.data[0])
            print(f"DEBUG: create_account returning: {res}")
            return res
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"\n{'='*60}\nEXCEPTION IN create_account:\n{tb}\n{'='*60}\n")
            raise e

    async def update_account(self, account_id: str, dto: UpdateAccountDto, user_id: str) -> Account:
        """Update account details (name/currency). Raises NotFoundError if account doesn't exist."""
        # Check if account exists and belongs to user
        check_response = (
            await self.db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Account not found")

        update_data = {}
        if dto.name is not None:
            update_data["name"] = dto.name
        if dto.currency is not None:
            update_data["currency"] = dto.currency
        if dto.account_number is not None:
            update_data["account_number"] = dto.account_number
        if dto.balance_cents is not None:
            update_data["balance_cents"] = dto.balance_cents

        if not update_data:
            return Account(**check_response.data[0])

        response = (
            await self.db.table("accounts")
            .update(update_data)
            .eq("id", account_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise NotFoundError("Failed to update account")

        return Account(**response.data[0])

    async def delete_account(self, account_id: str, user_id: str) -> None:
        """Delete an account. Fails if transactions are linked to it."""
        # Check if account exists and belongs to user
        check_response = (
            await self.db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Account not found")

        # Check if transactions are linked to the account
        txn_response = (
            await self.db.table("transactions")
            .select("id")
            .eq("account_id", account_id)
            .limit(1)
            .execute()
        )
        if txn_response.data:
            raise ValidationError("Cannot delete account with existing transactions")

        await self.db.table("accounts").delete().eq("id", account_id).eq("user_id", user_id).execute()
