import os
import ssl
import tempfile
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

RAW_DATABASE_URL = settings.DATABASE_URL or os.getenv("DATABASE_URL") or "sqlite:///./smart_developer_productivity.db"



def _build_ssl_context(ca_cert_data: str | None = None, ca_cert_path: str | None = None) -> ssl.SSLContext:
    """
    Builds a secure SSLContext for cloud MySQL providers (such as Aiven MySQL 8.4)
    using the official Project CA certificate or bundled Mozilla trust store.
    
    Ensures TLS verification is strictly preserved (CERT_REQUIRED & check_hostname=True)
    while accepting custom CA certificates provided via file or environment variables.
    """
    # 1. Initialize base SSLContext using certifi (or system trust store)
    try:
        import certifi
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ssl_ctx = ssl.create_default_context()

    # Disable STRICT x509 verification flag to allow valid self-signed project CA certificate chains (e.g. Aiven)
    if hasattr(ssl, "VERIFY_X509_STRICT"):
        ssl_ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT

    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
    ssl_ctx.check_hostname = True

    # 2. Identify candidate CA certificate file from arguments or environment
    target_ca_file = None

    if ca_cert_path and os.path.isfile(ca_cert_path):
        target_ca_file = ca_cert_path

    if not target_ca_file and ca_cert_data and isinstance(ca_cert_data, str):
        trimmed_candidate = ca_cert_data.strip().strip("\"'")
        if os.path.isfile(trimmed_candidate):
            target_ca_file = trimmed_candidate

    if not target_ca_file:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(base_dir, "..", ".."))
        root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
        candidates = [
            "/etc/secrets/ca.pem",             # Render Secret Files default path
            "/etc/secrets/aiven-ca.pem",       # Render Secret Files alternate
            os.path.join(base_dir, "ca.pem"),
            os.path.join(backend_dir, "ca.pem"),
            os.path.join(root_dir, "ca.pem"),
            os.path.join(os.getcwd(), "ca.pem"),
        ]
        for candidate in candidates:
            if os.path.isfile(candidate) and os.path.getsize(candidate) > 0:
                target_ca_file = candidate
                break

    # If a valid CA file was located on disk, load it
    if target_ca_file:
        try:
            ssl_ctx.load_verify_locations(cafile=target_ca_file)
            logger.info(f"Loaded database SSL CA certificate from file: {target_ca_file}")
            return ssl_ctx
        except Exception as file_load_err:
            logger.warning(f"Could not load CA certificate from file {target_ca_file}: {file_load_err}")

    # 3. If no file, check if ca_cert_data contains PEM certificate content
    if ca_cert_data and isinstance(ca_cert_data, str) and ca_cert_data.strip():
        cleaned = ca_cert_data.strip().strip("\"'")
        cleaned = cleaned.replace("\\n", "\n").replace("\r\n", "\n")

        # Check if string contains PEM certificate content
        if "BEGIN CERTIFICATE" in cleaned:
            if not cleaned.endswith("\n"):
                cleaned += "\n"
            try:
                # In-memory certificate loading using OpenSSL cadata
                ssl_ctx.load_verify_locations(cadata=cleaned)
                logger.info("Loaded database SSL CA certificate from environment variable PEM data.")
                return ssl_ctx
            except Exception as pem_load_err:
                logger.warning(f"Failed to load CA certificate from PEM data: {pem_load_err}")
        elif len(cleaned) > 50 and not (cleaned.endswith(".pem") or cleaned.endswith(".crt") or cleaned.startswith("/") or "\\" in cleaned):
            wrapped = f"-----BEGIN CERTIFICATE-----\n{cleaned}\n-----END CERTIFICATE-----\n"
            try:
                ssl_ctx.load_verify_locations(cadata=wrapped)
                logger.info("Loaded database SSL CA certificate from wrapped base64 data.")
                return ssl_ctx
            except Exception as pem_load_err:
                logger.warning(f"Failed to load CA certificate from wrapped base64 data: {pem_load_err}")
        elif cleaned.endswith(".pem") or cleaned.endswith(".crt") or "/" in cleaned or "\\" in cleaned:
            logger.warning(f"CA certificate environment variable appears to be a file path ({cleaned}), but file was not found on disk.")
        else:
            logger.warning("Provided CA certificate environment variable does not contain valid PEM boundaries.")

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
    # Set bounded, resilient timeouts to protect against cold-start hangs
    connect_args["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT", 8))

    # Clean unsupported query parameters if copied from Aiven / MySQL CLI (e.g. ssl-mode=REQUIRED)
    if "mysql" in parsed_url.drivername:
        connect_args["read_timeout"] = int(os.getenv("DB_READ_TIMEOUT", 15))
        connect_args["write_timeout"] = int(os.getenv("DB_WRITE_TIMEOUT", 15))

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
                try:
                    import certifi
                    fallback_ctx = ssl.create_default_context(cafile=certifi.where())
                    fallback_ctx.verify_mode = ssl.CERT_REQUIRED
                    fallback_ctx.check_hostname = True
                    connect_args["ssl"] = fallback_ctx
                except Exception:
                    pass

    engine_kwargs.update({
        "connect_args": connect_args,
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", 5)),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", 5)),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", 10)),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", 300)),
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
    except Exception:
        db.rollback()
        raise
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