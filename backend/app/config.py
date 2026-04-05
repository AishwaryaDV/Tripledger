from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    REDIS_URL: str = ""
    EXCHANGE_RATE_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "TripLedger <noreply@tripledger.app>"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
