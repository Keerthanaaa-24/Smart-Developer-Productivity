"""
Automated Database Schema Synchronization Module
Ensures existing production database tables stay in sync with SQLAlchemy models.

SQLAlchemy's `Base.metadata.create_all()` only creates missing tables, never
altering existing tables to add newly introduced columns.
This module inspects all live database tables and safely applies missing columns
without dropping tables, truncating data, or requiring manual SQL commands.
"""

import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.core.database import Base, engine

logger = logging.getLogger("uvicorn.error")


def sync_database_schema(target_engine: Engine = None) -> int:
    """
    Compares all registered SQLAlchemy models with live database tables.
    1. Runs create_all to create any wholly missing tables.
    2. Inspects existing tables and executes ALTER TABLE ADD COLUMN for missing columns.
    Returns the count of added columns.
    """
    eng = target_engine or engine
    logger.info("[SchemaSync] Beginning automated database schema reconciliation...")

    # 1. Ensure all tables are created if missing
    try:
        Base.metadata.create_all(bind=eng)
    except Exception as e:
        logger.warning(f"[SchemaSync] Warning during Base.metadata.create_all: {e}")

    added_columns_count = 0
    try:
        inspector = inspect(eng)
        existing_tables = set(inspector.get_table_names())
        dialect = eng.dialect

        with eng.connect() as conn:
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
                        
                        # Extract column default if present
                        if col.default is not None and getattr(col.default, "arg", None) is not None:
                            val = col.default.arg
                            if isinstance(val, bool):
                                default_clause = f" DEFAULT {1 if val else 0}"
                            elif isinstance(val, (int, float)):
                                default_clause = f" DEFAULT {val}"
                            elif isinstance(val, str):
                                default_clause = f" DEFAULT '{val}'"

                        # Safe nullability: allow NULL or use default if NOT NULL
                        null_clause = " NOT NULL" if (not col.nullable and default_clause) else " NULL"

                        quote = "`" if dialect.name == "mysql" else '"'
                        alter_sql = (
                            f"ALTER TABLE {quote}{table_name}{quote} "
                            f"ADD COLUMN {quote}{col.name}{quote} {col_type}{default_clause}{null_clause}"
                        )

                        logger.info(f"[SchemaSync] Executing: {alter_sql}")
                        try:
                            conn.execute(text(alter_sql))
                            conn.commit()
                            added_columns_count += 1
                            logger.info(
                                f"[SchemaSync] Added missing column '{col.name}' ({col_type}) to table '{table_name}'"
                            )
                        except Exception as add_err:
                            logger.warning(
                                f"[SchemaSync] Notice: could not add column '{col.name}' to '{table_name}': {add_err}"
                            )

        logger.info(
            f"[SchemaSync] Schema synchronization completed successfully. Added {added_columns_count} column(s)."
        )
    except Exception as e:
        logger.error(f"[SchemaSync] Unexpected error during schema sync: {e}")

    return added_columns_count
