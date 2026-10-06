from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, date
from uuid import UUID

class Person(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    is_me: bool = False
    aliases: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class CreatePersonDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    is_me: bool = False
    aliases: List[str] = []

class TransactionSplit(BaseModel):
    id: UUID
    transaction_id: UUID
    person_id: UUID
    amount_paise: int
    category: Optional[str] = None
    note: Optional[str] = None
    parsed_by: Optional[str] = None
    created_at: datetime
    person: Optional[Person] = None

    class Config:
        from_attributes = True

class CreateTransactionSplitDto(BaseModel):
    person_id: UUID
    amount_paise: int = Field(..., gt=0)
    category: Optional[str] = None
    note: Optional[str] = None
    parsed_by: Optional[str] = None

class Settlement(BaseModel):
    id: UUID
    user_id: UUID
    from_person: UUID
    to_person: UUID
    amount_paise: int
    date: date
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CreateSettlementDto(BaseModel):
    from_person: UUID
    to_person: UUID
    amount_paise: int = Field(..., gt=0)
    date: Optional[date] = None
    note: Optional[str] = None

class MerchantDefault(BaseModel):
    id: UUID
    user_id: UUID
    merchant_pattern: str
    default_split_rule: Any
    auto_approve_after_hours: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PersonBalance(BaseModel):
    person_id: UUID
    user_id: UUID
    name: str
    aliases: List[str] = []
    total_split_paise: int
    total_repaid_paise: int
    total_lent_paise: int
    net_balance_paise: int
