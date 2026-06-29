from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException

class AppError(Exception):
    def __init__(self, status_code: int, message: str, code: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code

class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(status_code=404, message=message, code="NOT_FOUND")

class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(status_code=400, message=message, code="VALIDATION_ERROR")

class InsufficientFundsError(AppError):
    def __init__(self, message: str = "Insufficient funds"):
        super().__init__(status_code=400, message=message, code="INSUFFICIENT_FUNDS")

class SyncRateLimitError(AppError):
    def __init__(self, message: str = "Sync ran recently. Try again later."):
        super().__init__(status_code=429, message=message, code="RATE_LIMIT_ERROR")

def register_exception_handlers(app: FastAPI):
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=jsonable_encoder({
                "data": None,
                "error": {
                    "code": exc.code,
                    "message": exc.message
                },
                "meta": {}
            })
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code = "HTTP_ERROR"
        if exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        
        return JSONResponse(
            status_code=exc.status_code,
            content=jsonable_encoder({
                "data": None,
                "error": {
                    "code": code,
                    "message": exc.detail
                },
                "meta": {}
            })
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        # Create a user-friendly validation error message
        msg_parts = []
        for err in errors:
            loc = " -> ".join(str(x) for x in err["loc"])
            msg_parts.append(f"{loc}: {err['msg']}")
        message = "Validation failed: " + "; ".join(msg_parts)
        
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder({
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message
                },
                "meta": {"details": errors}
            })
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        import traceback
        tb = traceback.format_exc()
        print(f"\n{'='*60}\nUNHANDLED EXCEPTION on {request.method} {request.url.path}\n{tb}\n{'='*60}\n")
        return JSONResponse(
            status_code=500,
            content=jsonable_encoder({
                "data": None,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred."
                },
                "meta": {
                    "details": str(exc),
                    "traceback": tb.splitlines()
                }
            })
        )
