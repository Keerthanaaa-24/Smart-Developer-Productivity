import os
import ssl
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

logger = logging.getLogger("uvicorn.error")
load_dotenv()

RAW_DATABASE_URL = os.getenv("DATABASE_URL")

if not RAW_DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing from environment variables."
    )

# Normalize URL schema prefixes for SQLAlchemy
normalized_url = RAW_DATABASE_URL.strip()
if normalized_url.startswith("postgres://"):
    normalized_url = normalized_url.replace("postgres://", "postgresql://", 1)
elif normalized_url.startswith("mysql://"):
    # SQLAlchemy requires explicit driver name for PyMySQL
    normalized_url = normalized_url.replace("mysql://", "mysql+pymysql://", 1)

parsed_url = make_url(normalized_url)

# Configure connection arguments and SSL based on dialect
connect_args = {}
engine_kwargs = {}

if parsed_url.drivername.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
else:
    # Set reasonable timeouts
    connect_args["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT", 15))

    # Clean unsupported query parameters if copied from Aiven / MySQL CLI (e.g. ssl-mode=REQUIRED)
    if "mysql" in parsed_url.drivername:
        query_params = dict(parsed_url.query)
        has_ssl_mode = query_params.pop("ssl-mode", None) or query_params.pop("ssl_mode", None)
        if has_ssl_mode is not None:
            parsed_url = parsed_url.set(query=query_params)

        # Determine if SSL is required (for remote hosts like Aiven MySQL)
        host_str = str(parsed_url.host or "")
        is_localhost = host_str in ("localhost", "127.0.0.1", "")
        ssl_disabled = os.getenv("DB_SSL_DISABLED", "").lower() in ("1", "true", "yes")

        if not is_localhost and not ssl_disabled:
            try:
                ca_cert_data = (
                    os.getenv("DB_CA_CERT")
                    or os.getenv("AIVEN_CA_CERT")
                    or os.getenv("MYSQL_CA_CERT")
                    or os.getenv("CA_CERT")
                    or os.getenv("DATABASE_CA_CERT")
                )
                ca_cert_path = os.getenv("DB_SSL_CA") or os.getenv("SSL_CA_PATH")

                if ca_cert_data and ca_cert_data.strip():
                    # Load PEM string from environment variable (ideal for Render)
                    ssl_ctx = ssl.create_default_context()
                    ssl_ctx.load_verify_locations(cadata=ca_cert_data.strip())
                    connect_args["ssl"] = ssl_ctx
                elif ca_cert_path and os.path.isfile(ca_cert_path):
                    # Load CA certificate from file path
                    ssl_ctx = ssl.create_default_context(cafile=ca_cert_path)
                    connect_args["ssl"] = ssl_ctx
                else:
                    # Default SSL context using system CA bundle (standard for Aiven with public / system certs)
                    ssl_ctx = ssl.create_default_context()
                    if os.getenv("DB_SSL_NO_VERIFY", "").lower() in ("1", "true", "yes") or os.getenv("DB_SSL_VERIFY", "").lower() in ("0", "false", "no"):
                        ssl_ctx.check_hostname = False
                        ssl_ctx.verify_mode = ssl.CERT_NONE
                    connect_args["ssl"] = ssl_ctx
            except Exception as ssl_err:
                logger.warning(f"Failed to initialize custom SSL context: {ssl_err}")

    engine_kwargs.update({
        "connect_args": connect_args,
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", 10)),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", 20)),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", 30)),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", 1800)),
    })

DATABASE_URL = parsed_url.render_as_string(hide_password=False)

try:
    engine = create_engine(parsed_url, **engine_kwargs)
except Exception as exc:
    safe_target = parsed_url.render_as_string(hide_password=True)
    logger.error(f"Failed to create database engine for target {safe_target}: {exc}")
    raise

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_database_connection() -> bool:
    """Safely verifies database connectivity without leaking credentials."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        safe_target = engine.url.render_as_string(hide_password=True)
        logger.error(f"Database connectivity check failed for target {safe_target}: {exc}")
        return False