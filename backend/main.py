from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from exceptions import register_exception_handlers
from routers.accounts import router as accounts_router
from routers.transactions import router as transactions_router
from routers.budget import router as budget_router
from routers.sync import router as sync_router
from routers.auth import router as auth_router
from routers.investments import router as investments_router

app = FastAPI(
    title="Personal Finance Command Center API",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register global exception handlers
register_exception_handlers(app)

# Register routers
app.include_router(accounts_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(budget_router, prefix="/api")
app.include_router(sync_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(investments_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
