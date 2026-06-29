import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Resolve backend absolute directory path to locate .env reliably
BACKEND_DIR = Path(__file__).resolve().parent
ENV_FILE_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    databricks_host: str
    databricks_token: str
    databricks_volume_path: str = "/Volumes/expense_tracker/landing/data/weekly_transactions.csv"
    sync_rate_limit_hours: int = 6
    cors_origins: list[str] = ["http://localhost:3000"]
    static_api_key: str | None = None
    static_user_id: str | None = None

    class Config:
        env_file = str(ENV_FILE_PATH)
        extra = "ignore"

settings = Settings()
