from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar('T')

class ApiErrorResponse(BaseModel):
    code: str
    message: str

class ApiResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    error: Optional[ApiErrorResponse] = None
    meta: dict[str, Any] = {}
