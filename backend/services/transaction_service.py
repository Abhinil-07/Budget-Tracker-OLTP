from supabase import AsyncClient
from datetime import date
from typing import List

from models.transaction import Transaction, CreateTransactionDto, TransactionQuery, PaginatedTransactions, UpdateTransactionDto
from exceptions import NotFoundError, ValidationError

class TransactionService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_transactions(self, query: TransactionQuery, user_id: str) -> PaginatedTransactions:
        """List transactions with pagination and query filtering."""
        q = self.db.table("transactions").select("*", count="exact").eq("user_id", user_id)
        
        if query.account_id:
            q = q.eq("account_id", str(query.account_id))
        if query.category:
            q = q.eq("category", query.category)
        if query.type:
            q = q.eq("type", query.type)
        if query.date_from:
            q = q.gte("txn_date", query.date_from.isoformat())
        if query.date_to:
            q = q.lte("txn_date", query.date_to.isoformat())
            
        offset = (query.page - 1) * query.page_size
        limit = query.page_size
        
        response = (
            await q.order("txn_date", desc=True)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        items = [Transaction(**row) for row in response.data]
        total = response.count if response.count is not None else 0
        
        return PaginatedTransactions(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size
        )

    async def create_transaction(self, dto: CreateTransactionDto, user_id: str) -> Transaction:
        """Create a new transaction and atomically update the account balance."""
        # 1. Fetch account details to verify user owns the account and get its type
        account_response = (
            await self.db.table("accounts")
            .select("*")
            .eq("id", str(dto.account_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not account_response.data:
            raise NotFoundError("Account not found")
            
        account = account_response.data[0]
        acc_type = account["type"]
        
        # 2. Determine balance delta based on transaction type and account type
        # Credit Card: expense increases balance (+ owed), income decreases balance (- owed)
        # Savings/Current: income increases balance (+), expense decreases balance (-)
        if acc_type == "credit_card":
            if dto.type == "expense":
                delta = dto.amount_cents
            else:
                delta = -dto.amount_cents
        else:
            if dto.type == "income":
                delta = dto.amount_cents
            else:
                delta = -dto.amount_cents
                
        # 3. Prepare transaction payload
        txn_date = dto.txn_date or date.today()
        data = {
            "user_id": user_id,
            "account_id": str(dto.account_id),
            "type": dto.type,
            "amount_cents": dto.amount_cents,
            "category": dto.category,
            "description": dto.description,
            "txn_date": txn_date.isoformat(),
        }
        
        # 4. Insert transaction row
        insert_response = await self.db.table("transactions").insert(data).execute()
        if not insert_response.data:
            raise ValidationError("Failed to create transaction in database")
            
        created_txn = insert_response.data[0]
        txn_id = created_txn["id"]
        
        # 5. Update account balance atomically via postgres RPC function
        try:
            await self.db.rpc("increment_balance", {
                "account_id": str(dto.account_id),
                "delta": delta
            }).execute()
        except Exception as e:
            # Rollback insertion if balance update fails
            await self.db.table("transactions").delete().eq("id", txn_id).eq("user_id", user_id).execute()
            raise ValidationError(f"Failed to update account balance: {str(e)}")
            
        return Transaction(**created_txn)

    async def delete_transaction(self, transaction_id: str, user_id: str) -> None:
        """Delete a transaction and atomically reverse its balance update."""
        # 1. Fetch transaction details
        txn_response = (
            await self.db.table("transactions")
            .select("*")
            .eq("id", transaction_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not txn_response.data:
            raise NotFoundError("Transaction not found")
            
        txn = txn_response.data[0]
        amount_cents = txn["amount_cents"]
        txn_type = txn["type"]
        account_id = txn["account_id"]
        
        # 2. Fetch associated account details to get its type
        account_response = (
            await self.db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not account_response.data:
            raise NotFoundError("Associated account not found")
            
        account = account_response.data[0]
        acc_type = account["type"]
        
        # 3. Calculate original balance delta to know what to reverse
        if acc_type == "credit_card":
            if txn_type == "expense":
                delta = amount_cents
            else:
                delta = -amount_cents
        else:
            if txn_type == "income":
                delta = amount_cents
            else:
                delta = -amount_cents
                
        # The reverse delta is the negation of the original delta
        reverse_delta = -delta
        
        # 4. Delete the transaction
        delete_response = (
            await self.db.table("transactions")
            .delete()
            .eq("id", transaction_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not delete_response.data:
            raise ValidationError("Failed to delete transaction")
            
        # 5. Reverse the balance update atomically via postgres RPC function
        try:
            await self.db.rpc("increment_balance", {
                "account_id": account_id,
                "delta": reverse_delta
            }).execute()
        except Exception as e:
            # Rollback deletion if balance reversal fails
            # Strip database-generated metadata fields that aren't user-insertable if needed,
            # but since postgrest insert expects a dict, we can just insert the original row
            await self.db.table("transactions").insert(txn).execute()
            raise ValidationError(f"Failed to reverse account balance during deletion: {str(e)}")

    async def update_transaction(self, transaction_id: str, dto: UpdateTransactionDto, user_id: str) -> Transaction:
        """Update an existing transaction and atomically adjust account balances."""
        # 1. Fetch current transaction record
        txn_response = (
            await self.db.table("transactions")
            .select("*")
            .eq("id", transaction_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not txn_response.data:
            raise NotFoundError("Transaction not found")
        
        old_txn = txn_response.data[0]
        old_account_id = old_txn["account_id"]
        old_amount_cents = old_txn["amount_cents"]
        old_type = old_txn["type"]
        
        # 2. Retrieve old account to compute original balance delta
        old_acc_response = (
            await self.db.table("accounts")
            .select("*")
            .eq("id", old_account_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not old_acc_response.data:
            raise NotFoundError("Original account not found")
            
        old_account = old_acc_response.data[0]
        old_acc_type = old_account["type"]
        
        # Calculate old delta:
        if old_acc_type == "credit_card":
            old_delta = old_amount_cents if old_type == "expense" else -old_amount_cents
        else:
            old_delta = old_amount_cents if old_type == "income" else -old_amount_cents
            
        # 3. Handle changes and determine new parameters
        new_account_id = str(dto.account_id) if dto.account_id is not None else old_account_id
        new_amount_cents = dto.amount_cents if dto.amount_cents is not None else old_amount_cents
        new_type = dto.type if dto.type is not None else old_type
        
        # Retrieve new account details
        if new_account_id == old_account_id:
            new_account = old_account
            new_acc_type = old_acc_type
        else:
            new_acc_response = (
                await self.db.table("accounts")
                .select("*")
                .eq("id", new_account_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not new_acc_response.data:
                raise NotFoundError("New account not found")
            new_account = new_acc_response.data[0]
            new_acc_type = new_account["type"]
            
        # Calculate new delta:
        if new_acc_type == "credit_card":
            new_delta = new_amount_cents if new_type == "expense" else -new_amount_cents
        else:
            new_delta = new_amount_cents if new_type == "income" else -new_amount_cents
            
        # Prepare transaction update fields
        update_data = {}
        if dto.account_id is not None:
            update_data["account_id"] = str(dto.account_id)
        if dto.type is not None:
            update_data["type"] = dto.type
        if dto.amount_cents is not None:
            update_data["amount_cents"] = dto.amount_cents
        if dto.category is not None:
            update_data["category"] = dto.category
        if dto.description is not None:
            update_data["description"] = dto.description
        if dto.txn_date is not None:
            update_data["txn_date"] = dto.txn_date.isoformat()
            
        if not update_data:
            return Transaction(**old_txn)
            
        # 4. Perform update & balance adjustment atomically (with rollback logic)
        # Update transaction row in DB
        update_response = (
            await self.db.table("transactions")
            .update(update_data)
            .eq("id", transaction_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not update_response.data:
            raise ValidationError("Failed to update transaction record")
            
        updated_txn = update_response.data[0]
        
        # Apply balance adjustments via RPC
        try:
            if new_account_id == old_account_id:
                # Same account: apply the difference
                net_delta = new_delta - old_delta
                if net_delta != 0:
                    await self.db.rpc("increment_balance", {
                        "account_id": old_account_id,
                        "delta": net_delta
                    }).execute()
            else:
                # Different accounts: reverse old impact, apply new impact
                # 1. Reverse old account balance
                await self.db.rpc("increment_balance", {
                    "account_id": old_account_id,
                    "delta": -old_delta
                }).execute()
                # 2. Apply new account balance
                await self.db.rpc("increment_balance", {
                    "account_id": new_account_id,
                    "delta": new_delta
                }).execute()
        except Exception as e:
            # Rollback: revert the transaction row back to the old state in DB
            revert_data = {
                "account_id": old_txn["account_id"],
                "type": old_txn["type"],
                "amount_cents": old_txn["amount_cents"],
                "category": old_txn["category"],
                "description": old_txn["description"],
                "txn_date": old_txn["txn_date"]
            }
            await self.db.table("transactions").update(revert_data).eq("id", transaction_id).eq("user_id", user_id).execute()
            raise ValidationError(f"Failed to adjust account balances for transaction update: {str(e)}")
            
        return Transaction(**updated_txn)
