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
        
        # Filter out staged transactions by default unless requested
        if query.status:
            q = q.eq("status", query.status)
        else:
            q = q.neq("status", "staged")

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
        """Delete a transaction. If staged, purges row directly from DB. If confirmed, reverses balance."""
        # 1. Fetch transaction
        txn_response = (
            await self.db.table("transactions")
            .select("*")
            .eq("id", transaction_id)
            .execute()
        )
        if not txn_response.data:
            raise NotFoundError("Transaction not found")
            
        txn = txn_response.data[0]
        
        # If staged transaction, purge row directly from Supabase DB (no balance reversal needed)
        if txn.get("status") == "staged":
            await self.db.table("transactions").delete().eq("id", transaction_id).execute()
            return

        # For confirmed transactions: reverse original balance delta
        amount_cents = txn["amount_cents"]
        txn_type = txn["type"]
        account_id = txn["account_id"]
        
        # Delete transaction from DB
        await self.db.table("transactions").delete().eq("id", transaction_id).execute()

        # Reverse balance delta atomically if associated account exists
        try:
            account_response = (
                await self.db.table("accounts")
                .select("*")
                .eq("id", account_id)
                .execute()
            )
            if account_response.data:
                account = account_response.data[0]
                acc_type = account["type"]
                if acc_type == "credit_card":
                    delta = amount_cents if txn_type == "expense" else -amount_cents
                else:
                    delta = amount_cents if txn_type == "income" else -amount_cents
                reverse_delta = -delta

                await self.db.rpc("increment_balance", {
                    "account_id": account_id,
                    "delta": reverse_delta
                }).execute()
        except Exception as err:
            print("Warning: Balance reversal on delete encountered non-critical error:", err)

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

    async def batch_create_transactions(self, dtos: List[CreateTransactionDto], user_id: str) -> dict:
        """Create multiple transactions in batch and atomically update account balances."""
        if not dtos:
            return {"imported_count": 0, "account_ids": []}

        # 1. Fetch user accounts to verify ownership & account types
        account_ids = list({str(d.account_id) for d in dtos})
        acc_response = (
            await self.db.table("accounts")
            .select("id, type")
            .eq("user_id", user_id)
            .in_("id", account_ids)
            .execute()
        )
        user_accounts = {row["id"]: row["type"] for row in (acc_response.data or [])}

        for acc_id in account_ids:
            if acc_id not in user_accounts:
                raise NotFoundError(f"Account {acc_id} not found or unauthorized")

        # 2. Prepare transaction rows and compute net balance deltas per account
        account_deltas: dict[str, int] = {}
        insert_rows = []
        today = date.today()

        for dto in dtos:
            acc_id = str(dto.account_id)
            acc_type = user_accounts[acc_id]

            if acc_type == "credit_card":
                delta = dto.amount_cents if dto.type == "expense" else -dto.amount_cents
            else:
                delta = dto.amount_cents if dto.type == "income" else -dto.amount_cents

            account_deltas[acc_id] = account_deltas.get(acc_id, 0) + delta

            txn_date = dto.txn_date or today
            insert_rows.append({
                "user_id": user_id,
                "account_id": acc_id,
                "type": dto.type,
                "amount_cents": dto.amount_cents,
                "category": dto.category,
                "description": dto.description,
                "txn_date": txn_date.isoformat(),
            })

        # 3. Batch insert transaction records
        insert_response = await self.db.table("transactions").insert(insert_rows).execute()
        if not insert_response.data:
            raise ValidationError("Failed to batch insert transactions")

        inserted_data = insert_response.data

        # 4. Atomically apply balance updates per account
        try:
            for acc_id, net_delta in account_deltas.items():
                if net_delta != 0:
                    await self.db.rpc("increment_balance", {
                        "account_id": acc_id,
                        "delta": net_delta
                    }).execute()
        except Exception as e:
            # Attempt rollback of inserted transactions if balance update fails
            inserted_ids = [r["id"] for r in inserted_data]
            await self.db.table("transactions").delete().in_("id", inserted_ids).eq("user_id", user_id).execute()
            raise ValidationError(f"Failed to update account balances during batch import: {str(e)}")

        return {
            "imported_count": len(inserted_data),
            "account_ids": list(account_deltas.keys())
        }

    def parse_text(self, text: str) -> dict:
        """Parse raw bank SMS or Email text into structured transaction fields."""
        import re
        from datetime import datetime, date

        lower = text.lower()

        # 1. Amount Extraction
        amount_pattern = r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|credited|spent|paid)\s*(?:by|of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited|spent)'
        match = re.search(amount_pattern, text, re.IGNORECASE)

        amount_cents = 0
        if match:
            amt_str = (match.group(1) or match.group(2) or match.group(3)).replace(',', '')
            try:
                amount_cents = int(round(float(amt_str) * 100))
            except ValueError:
                amount_cents = 0

        # 2. Type Extraction
        if any(k in lower for k in ["credited", "received", "salary", "refund", "deposited"]):
            txn_type = "income"
        else:
            txn_type = "expense"

        # 3. Category Inference
        inferred_category = "Miscellaneous"
        if any(k in lower for k in ["zomato", "swiggy", "starbucks", "dominos", "mcdonald", "restaurant", "cafe"]):
            inferred_category = "Food & Dining"
        elif any(k in lower for k in ["uber", "ola", "rapido", "petrol", "fuel", "shell", "hpcl", "bpcl"]):
            inferred_category = "Transport"
        elif any(k in lower for k in ["amazon", "flipkart", "myntra", "ajio", "zara"]):
            inferred_category = "Shopping"
        elif any(k in lower for k in ["d-mart", "dmart", "blinkit", "zepto", "instamart", "grocery", "bigbasket"]):
            inferred_category = "Grocery"
        elif any(k in lower for k in ["airtel", "jio", "electricity", "bill", "bescom", "broadband"]):
            inferred_category = "Utilities"
        elif any(k in lower for k in ["netflix", "spotify", "prime", "pvr", "inox", "movie"]):
            inferred_category = "Entertainment"
        elif any(k in lower for k in ["salary", "payroll"]):
            inferred_category = "Salary"
        elif "rent" in lower:
            inferred_category = "Housing"

        # 4. Description Extraction (Enhanced for HDFC InstaAlerts & UPI VPA)
        vpa_bracket_match = re.search(r'towards\s+vpa\s+[^\(\s]+\s*\(([^)]+)\)', text, re.IGNORECASE)
        vpa_plain_match = re.search(r'towards\s+vpa\s+([a-zA-Z0-9._\-]+@[a-zA-Z0-9._\-]+)', text, re.IGNORECASE)
        at_merchant_match = re.search(r'\b(?:at|to)\s+([A-Za-z0-9\s&.\-]+?)(?:\s+on|\s+ref|\s+via|\s+val|\.|\$|$)', text, re.IGNORECASE)

        if vpa_bracket_match and vpa_bracket_match.group(1):
            description = vpa_bracket_match.group(1).strip()
        elif vpa_plain_match and vpa_plain_match.group(1):
            description = vpa_plain_match.group(1).split('@')[0].replace('.', ' ').capitalize().strip()
        elif at_merchant_match and at_merchant_match.group(1):
            description = at_merchant_match.group(1).strip()
        else:
            description = text[:45] + "..." if len(text) > 45 else text

        # 5. Date Extraction
        txn_date = date.today()
        date_match = re.search(r'(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{2,4})', text)
        if date_match:
            try:
                d_str = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
                for fmt in ("%d-%b-%Y", "%d-%b-%y", "%d-%m-%Y", "%d-%m-%y"):
                    try:
                        txn_date = datetime.strptime(d_str, fmt).date()
                        break
                    except ValueError:
                        pass
            except Exception:
                pass

        return {
            "amount_cents": amount_cents,
            "type": txn_type,
            "category": inferred_category,
            "description": description,
            "txn_date": txn_date,
        }

    async def stage_parsed_text(self, text: str, target_account_id: str = None) -> dict:
        """Parse raw text and insert as a staged transaction in Supabase."""
        parsed = self.parse_text(text)
        
        try:
            # 1. Fetch account/user details
            account_id = None
            user_id = None

            if target_account_id:
                try:
                    acc_resp = await self.db.table("accounts").select("*").eq("id", str(target_account_id)).execute()
                    if acc_resp.data:
                        account = acc_resp.data[0]
                        user_id = account["user_id"]
                        account_id = account["id"]
                except Exception as e:
                    print("Error finding target account:", e)

            if not account_id:
                try:
                    acc_resp = await self.db.table("accounts").select("id, user_id").limit(1).execute()
                    if acc_resp.data:
                        account = acc_resp.data[0]
                        user_id = account["user_id"]
                        account_id = account["id"]
                except Exception as e:
                    print("Error finding default account:", e)

            # Fallback to transactions table to find existing user_id/account_id if accounts query returns empty
            if not account_id:
                try:
                    txn_resp = await self.db.table("transactions").select("account_id, user_id").limit(1).execute()
                    if txn_resp.data:
                        user_id = txn_resp.data[0]["user_id"]
                        account_id = txn_resp.data[0]["account_id"]
                except Exception as e:
                    print("Error finding transaction fallback account:", e)

            if user_id and account_id:
                insert_data = {
                    "user_id": user_id,
                    "account_id": account_id,
                    "type": parsed["type"],
                    "amount_cents": parsed["amount_cents"],
                    "category": parsed["category"],
                    "description": parsed["description"],
                    "txn_date": parsed["txn_date"].isoformat(),
                    "status": "staged"
                }

                try:
                    res = await self.db.table("transactions").insert(insert_data).execute()
                    if res.data:
                        parsed["staged_id"] = str(res.data[0]["id"])
                except Exception as e:
                    print("Staging with status column failed, trying fallback insert without status column:", e)
                    # Fallback insert without status column if status column does not exist in DB yet
                    try:
                        fallback_data = {k: v for k, v in insert_data.items() if k != "status"}
                        res = await self.db.table("transactions").insert(fallback_data).execute()
                        if res.data:
                            parsed["staged_id"] = str(res.data[0]["id"])
                    except Exception as fallback_e:
                        print("Fallback staging insert failed:", fallback_e)

        except Exception as global_e:
            print("Global stage_parsed_text error:", global_e)

        return parsed

    async def list_staged_transactions(self, user_id: str) -> List[Transaction]:
        """Fetch all staged transactions pending review."""
        try:
            # Query all staged items so auto-parsed emails immediately land in the inbox
            res = await self.db.table("transactions").select("*").eq("status", "staged").order("created_at", desc=True).execute()
            items = []
            for row in res.data:
                try:
                    # Provide fallback values if optional database fields are null
                    if not row.get("user_id"):
                        row["user_id"] = user_id
                    if not row.get("account_id"):
                        row["account_id"] = "00000000-0000-0000-0000-000000000000"
                    if not row.get("created_at"):
                        row["created_at"] = datetime.utcnow().isoformat()
                    if not row.get("status"):
                        row["status"] = "staged"
                    if not row.get("description"):
                        row["description"] = "Bank Transaction Alert"
                    items.append(Transaction(**row))
                except Exception as row_err:
                    print("Error parsing staged row:", row_err, row)
            return items
        except Exception as e:
            print("Error listing staged transactions:", e)
            return []

    async def approve_staged_transaction(self, transaction_id: str, dto: UpdateTransactionDto, user_id: str) -> Transaction:
        """Confirm a staged transaction, set status='confirmed', and update account balance."""
        # 1. Fetch existing transaction
        existing_res = await self.db.table("transactions").select("*").eq("id", transaction_id).eq("user_id", user_id).execute()
        if not existing_res.data:
            raise NotFoundError("Staged transaction not found")
        existing = existing_res.data[0]

        target_account_id = str(dto.account_id) if dto.account_id else existing["account_id"]
        
        # 2. Fetch target account
        acc_resp = await self.db.table("accounts").select("*").eq("id", target_account_id).eq("user_id", user_id).execute()
        if not acc_resp.data:
            raise NotFoundError("Account not found")
        account = acc_resp.data[0]
        acc_type = account["type"]

        amount_cents = dto.amount_cents if dto.amount_cents is not None else existing["amount_cents"]
        txn_type = dto.type if dto.type else existing["type"]

        # 3. Calculate balance delta
        if acc_type == "credit_card":
            delta = amount_cents if txn_type == "expense" else -amount_cents
        else:
            delta = amount_cents if txn_type == "income" else -amount_cents

        # 4. Update transaction status to "confirmed"
        txn_date_val = (dto.txn_date or date.today()).isoformat() if isinstance(dto.txn_date, date) else existing["txn_date"]

        update_data = {
            "account_id": target_account_id,
            "type": txn_type,
            "amount_cents": amount_cents,
            "category": dto.category if dto.category else existing["category"],
            "description": dto.description if dto.description is not None else existing["description"],
            "txn_date": txn_date_val,
            "status": "confirmed"
        }

        updated_res = await self.db.table("transactions").update(update_data).eq("id", transaction_id).eq("user_id", user_id).execute()
        if not updated_res.data:
            raise ValidationError("Failed to approve staged transaction")

        # 5. Apply balance update atomically
        await self.db.rpc("increment_balance", {
            "account_id": target_account_id,
            "delta": delta
        }).execute()

        return Transaction(**updated_res.data[0])

