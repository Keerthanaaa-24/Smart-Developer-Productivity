import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.database import engine
from sqlalchemy import text, inspect

def migrate_activity_schema():
    inspector = inspect(engine)
    cols = [c["name"] for c in inspector.get_columns("developer_activity")]
    uq_names = [uq["name"] for uq in inspector.get_unique_constraints("developer_activity")]
    idx_names = [idx["name"] for idx in inspector.get_indexes("developer_activity")]

    with engine.begin() as conn:
        # 1. Add missing columns
        if "category" not in cols:
            print("Adding column 'category'...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'coding' AFTER platform"))
        if "title" not in cols:
            print("Adding column 'title'...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN title VARCHAR(255) NULL AFTER activity_type"))
        if "source" not in cols:
            print("Adding column 'source'...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'automatic' AFTER duration_seconds"))
        if "external_id" not in cols:
            print("Adding column 'external_id'...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN external_id VARCHAR(100) NULL AFTER source"))
        if "updated_at" not in cols:
            print("Adding column 'updated_at'...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at"))

        # 2. Drop unique constraint uq_user_platform_date if present
        if "uq_user_platform_date" in uq_names:
            print("Dropping constraint 'uq_user_platform_date'...")
            conn.execute(text("ALTER TABLE developer_activity DROP INDEX uq_user_platform_date"))

        # 3. Add compound indexes
        if "ix_dev_activity_user_cat_created" not in idx_names:
            print("Adding index 'ix_dev_activity_user_cat_created'...")
            conn.execute(text("ALTER TABLE developer_activity ADD INDEX ix_dev_activity_user_cat_created (user_id, category, created_at)"))

        if "ix_dev_activity_user_plat_created" not in idx_names:
            print("Adding index 'ix_dev_activity_user_plat_created'...")
            conn.execute(text("ALTER TABLE developer_activity ADD INDEX ix_dev_activity_user_plat_created (user_id, platform, created_at)"))

        if "ix_dev_activity_user_plat_ext" not in idx_names:
            print("Adding index 'ix_dev_activity_user_plat_ext'...")
            conn.execute(text("ALTER TABLE developer_activity ADD INDEX ix_dev_activity_user_plat_ext (user_id, platform, external_id)"))

    print("Activity schema migration completed successfully!")

if __name__ == "__main__":
    migrate_activity_schema()
