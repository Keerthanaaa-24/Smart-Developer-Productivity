"""
Automated Database Schema Synchronization & Migration Guard Module
Ensures existing production database tables stay strictly in sync with SQLAlchemy models.

Key Guarantees:
1. Zero Data Loss: Never drops tables or columns.
2. Distributed Lock: Uses MySQL GET_LOCK to prevent concurrent DDL race conditions across workers.
3. Idempotent: Can be safely executed multiple times; handles existing columns gracefully.
4. Schema Verification: Audits final state; raises an explicit error if critical columns remain missing,
   preventing the application from silently running against a broken database.
5. Migration Tracking: Records applied schema version checkpoints in a dedicated `schema_migrations` table.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.core.database import Base, engine
import app.models  # Ensures all models are registered on Base.metadata

logger = logging.getLogger("uvicorn.error")

MIGRATION_VERSION = "2026_10_phase5_competition_v1"


def _acquire_advisory_lock(conn, dialect_name: str) -> bool:
    """Acquires a distributed advisory lock if supported by the database engine."""
    if dialect_name == "mysql":
        try:
            res = conn.execute(text("SELECT GET_LOCK('sdp_schema_sync_advisory_lock', 20)")).scalar()
            return bool(res == 1)
        except Exception as e:
            logger.warning(f"[SchemaSync] Could not acquire MySQL advisory lock: {e}")
            return True
    return True


def _release_advisory_lock(conn, dialect_name: str) -> None:
    """Releases the distributed advisory lock."""
    if dialect_name == "mysql":
        try:
            conn.execute(text("SELECT RELEASE_LOCK('sdp_schema_sync_advisory_lock')"))
            conn.commit()
        except Exception as e:
            logger.warning(f"[SchemaSync] Could not release MySQL advisory lock: {e}")


def _ensure_migration_table(conn, dialect_name: str) -> None:
    """Ensures the schema_migrations tracking table exists."""
    if dialect_name == "mysql":
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL,
                details TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))
    else:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) NOT NULL PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL,
                details TEXT NULL
            );
        """))
    conn.commit()


def sync_database_schema(target_engine: Engine = None, force: bool = False) -> int:
    """
    Compares all registered SQLAlchemy models with live database tables.
    Fast-path: Checks schema_migrations table; if MIGRATION_VERSION was already verified,
    skips expensive remote table/column inspection.
    Otherwise:
    1. Runs Base.metadata.create_all to create missing tables.
    2. Inspects existing tables and executes ALTER TABLE ADD COLUMN for missing columns.
    3. Validates that all model columns exist after synchronization.
    Raises RuntimeError if any model column is still missing after migration.
    """
    eng = target_engine or engine
    logger.info("[SchemaSync] Beginning database schema verification...")

    added_columns_count = 0
    dialect = eng.dialect
    dialect_name = dialect.name

    with eng.connect() as conn:
        has_lock = _acquire_advisory_lock(conn, dialect_name)
        if not has_lock:
            logger.warning("[SchemaSync] Another worker is currently synchronizing schema. Skipping redundant sync.")
            return 0

        try:
            # 1. Ensure migration history table exists
            _ensure_migration_table(conn, dialect_name)

            # Fast-path check: if this version was already applied and verified, skip expensive table inspection
            if not force:
                try:
                    row = conn.execute(
                        text("SELECT 1 FROM schema_migrations WHERE version = :ver"),
                        {"ver": MIGRATION_VERSION},
                    ).scalar()
                    if row:
                        logger.info(
                            f"[SchemaSync] Schema version '{MIGRATION_VERSION}' is verified up-to-date. Startup sync complete."
                        )
                        return 0
                except Exception as chk_err:
                    logger.debug(f"[SchemaSync] Migration check notice: {chk_err}")

            # 2. Create wholly missing tables first
            try:
                Base.metadata.create_all(bind=eng)
            except Exception as e:
                logger.warning(f"[SchemaSync] Notice during Base.metadata.create_all: {e}")

            inspector = inspect(eng)
            existing_tables = set(inspector.get_table_names())

            for table_name, table in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue

                try:
                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                except Exception as col_err:
                    logger.warning(f"[SchemaSync] Could not inspect columns for {table_name}: {col_err}")
                    continue

                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(dialect)
                        default_clause = ""

                        # Extract default value
                        if col.default is not None and getattr(col.default, "arg", None) is not None:
                            val = col.default.arg
                            if isinstance(val, bool):
                                default_clause = f" DEFAULT {1 if val else 0}"
                            elif isinstance(val, (int, float)):
                                default_clause = f" DEFAULT {val}"
                            elif isinstance(val, str):
                                default_clause = f" DEFAULT '{val}'"

                        # Safe nullability: allow NULL or apply default if NOT NULL
                        null_clause = " NOT NULL" if (not col.nullable and default_clause) else " NULL"

                        quote = "`" if dialect_name == "mysql" else '"'
                        alter_sql = (
                            f"ALTER TABLE {quote}{table_name}{quote} "
                            f"ADD COLUMN {quote}{col.name}{quote} {col_type}{default_clause}{null_clause}"
                        )

                        logger.info(f"[SchemaSync] Reconciling column: {alter_sql}")
                        try:
                            conn.execute(text(alter_sql))
                            conn.commit()
                            added_columns_count += 1
                            logger.info(
                                f"[SchemaSync] Added column '{col.name}' ({col_type}) to '{table_name}'"
                            )
                        except Exception as add_err:
                            err_str = str(add_err).lower()
                            # Idempotent guard: if duplicate column error (MySQL 1060), ignore safely
                            if "duplicate column" in err_str or "1060" in err_str:
                                logger.info(f"[SchemaSync] Column '{col.name}' already exists in '{table_name}'.")
                            else:
                                logger.error(
                                    f"[SchemaSync] Error adding column '{col.name}' to '{table_name}': {add_err}"
                                )

            # 3. Post-sync verification: ensure no required model column is missing
            fresh_inspector = inspect(eng)
            missing_critical_columns = []
            for table_name, table in Base.metadata.tables.items():
                if not fresh_inspector.has_table(table_name):
                    missing_critical_columns.append(f"Table '{table_name}' is missing")
                    continue
                current_cols = {c["name"] for c in fresh_inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in current_cols:
                        missing_critical_columns.append(f"{table_name}.{col.name}")

            if missing_critical_columns:
                err_msg = f"Schema sync failed! Unresolved missing columns: {', '.join(missing_critical_columns)}"
                logger.error(f"[SchemaSync] {err_msg}")
                raise RuntimeError(err_msg)

            # 4. Record migration entry
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            try:
                conn.execute(
                    text(
                        "INSERT INTO schema_migrations (version, applied_at, details) "
                        "VALUES (:ver, :dt, :det) ON DUPLICATE KEY UPDATE applied_at = :dt, details = :det"
                        if dialect_name == "mysql"
                        else "INSERT OR REPLACE INTO schema_migrations (version, applied_at, details) VALUES (:ver, :dt, :det)"
                    ),
                    {
                        "ver": MIGRATION_VERSION,
                        "dt": now_iso,
                        "det": f"Synchronized {added_columns_count} missing column(s). All tables verified.",
                    },
                )
                conn.commit()
            except Exception as mig_rec_err:
                logger.warning(f"[SchemaSync] Notice: could not record migration version: {mig_rec_err}")

            logger.info(
                f"[SchemaSync] Database schema synchronization verified. Added {added_columns_count} column(s). All models verified."
            )
        finally:
            _release_advisory_lock(conn, dialect_name)

    return added_columns_count
