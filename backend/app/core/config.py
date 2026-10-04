import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    # Application
    APP_NAME: str = "Smart Developer Productivity Dashboard"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./smart_developer_productivity.db",
    )
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    DB_CONNECT_TIMEOUT: int = int(os.getenv("DB_CONNECT_TIMEOUT", "15"))
    DB_SSL_DISABLED: bool = os.getenv("DB_SSL_DISABLED", "").lower() in ("1", "true", "yes")

    # SSL CA Cert for cloud databases (e.g. Aiven MySQL 8.4)
    DB_CA_CERT: str | None = (
        os.getenv("DB_CA_CERT")
        or os.getenv("AIVEN_CA_CERT")
        or os.getenv("MYSQL_CA_CERT")
        or os.getenv("CA_CERT")
        or os.getenv("DATABASE_CA_CERT")
    )
    DB_SSL_CA: str | None = (
        os.getenv("DB_SSL_CA")
        or os.getenv("SSL_CA_PATH")
        or os.getenv("AIVEN_CA_PATH")
    )

    # JWT Authentication & Token Encryption
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_developer_productivity_default_secret_key_change_in_prod")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # Default 24 hours

    # GitHub OAuth
    GITHUB_CLIENT_ID: str | None = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: str | None = os.getenv("GITHUB_CLIENT_SECRET")
    GITHUB_REDIRECT_URI: str | None = os.getenv("GITHUB_REDIRECT_URI")

    # Frontend URL & CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://smart-developer-productivity.vercel.app")
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "https://smart-developer-productivity.vercel.app,https://smart-developer-productivity.onrender.com,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173",
        ).split(",")
        if origin.strip()
    ]
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https?://.*\.vercel\.app$|^https?://smart-developer-productivity\.onrender\.com$",
    )


settings = Settings()
