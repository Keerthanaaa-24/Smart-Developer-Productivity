import os
import ssl
import tempfile
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


def _build_ssl_context(ca_cert_data: str | None = None, ca_cert_path: str | None = None) -> ssl.SSLContext:
    """
    Builds a secure SSLContext for cloud MySQL providers (such as Aiven MySQL 8.4)
    using the official Project CA certificate.
    """
    target_ca_file = None
    
    # 1. Check if CA certificate PEM string is provided in environment variables
    if ca_cert_data and ca_cert_data.strip():
        cleaned = ca_cert_data.strip().strip("\"'")
        cleaned = cleaned.replace("\\n", "\n")
        if "BEGIN CERTIFICATE" not in cleaned and len(cleaned) > 50:
            cleaned = f"-----BEGIN CERTIFICATE-----\n{cleaned}\n-----END CERTIFICATE-----\n"
        elif not cleaned.endswith("\n"):
            cleaned += "\n"

        try:
            # Write to a secure persistent temp file so ssl.create_default_context(cafile=...) can load it
            tmp = tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".pem",
                prefix="aiven_ca_",
                delete=False,
                encoding="utf-8",
            )
            tmp.write(cleaned)
            tmp.close()
            target_ca_file = tmp.name
        except Exception as write_err:
            logger.warning(f"Could not create temporary CA file: {write_err}")

    # 2. Check if a CA certificate file path is provided or exists locally
    if not target_ca_file:
        if ca_cert_path and os.path.isfile(ca_cert_path):
            target_ca_file = ca_cert_path
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.abspath(os.path.join(base_dir, "..", ".."))
            root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
            for candidate in [
                os.path.join(base_dir, "ca.pem"),
                os.path.join(backend_dir, "ca.pem"),
                os.path.join(root_dir, "ca.pem"),
                os.path.join(os.getcwd(), "ca.pem"),
            ]:
                if os.path.isfile(candidate):
                    target_ca_file = candidate
                    break

    # 3. Create SSLContext using the designated CA file or system trust store
    if target_ca_file:
        ssl_ctx = ssl.create_default_context(cafile=target_ca_file)
    else:
        ssl_ctx = ssl.create_default_context()

    # Disable STRICT x509 verification flag to allow valid self-signed project CA certificate chains
    if hasattr(ssl, "VERIFY_X509_STRICT"):
        ssl_ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT

    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    ssl_ctx.check_hostname = True
    return ssl_ctx


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
                ca_cert_path = (
                    os.getenv("DB_SSL_CA")
                    or os.getenv("SSL_CA_PATH")
                    or os.getenv("AIVEN_CA_PATH")
                )

                ssl_ctx = _build_ssl_context(ca_cert_data, ca_cert_path)
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
        err_msg = str(exc)
        if "CERTIFICATE_VERIFY_FAILED" in err_msg or "self-signed certificate" in err_msg:
            logger.error(
                f"Aiven MySQL SSL verification failed for target {safe_target}. "
                "Please configure DB_CA_CERT in your environment with your Aiven Project CA certificate."
            )
        else:
            logger.error(f"Database connectivity check failed for target {safe_target}: {exc}")
        return False