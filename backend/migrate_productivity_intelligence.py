import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from app.core.database import engine

def migrate_productivity_intelligence_schema():
    print("[MIGRATION] Checking productivity intelligence schema...")
    inspector = inspect(engine)
    
    with engine.begin() as conn:
        # 1. user_settings updates
        us_cols = [c["name"] for c in inspector.get_columns("user_settings")]
        if "timezone" not in us_cols:
            print("Adding 'timezone' column to user_settings...")
            conn.execute(text("ALTER TABLE user_settings ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC' AFTER auto_sync_interval_seconds"))
        if "institution" not in us_cols:
            print("Adding 'institution' column to user_settings...")
            conn.execute(text("ALTER TABLE user_settings ADD COLUMN institution VARCHAR(150) NULL DEFAULT '' AFTER timezone"))
        if "department" not in us_cols:
            print("Adding 'department' column to user_settings...")
            conn.execute(text("ALTER TABLE user_settings ADD COLUMN department VARCHAR(100) NULL DEFAULT '' AFTER institution"))
        if "batch_year" not in us_cols:
            print("Adding 'batch_year' column to user_settings...")
            conn.execute(text("ALTER TABLE user_settings ADD COLUMN batch_year VARCHAR(20) NULL DEFAULT '' AFTER department"))
        if "student_id_number" not in us_cols:
            print("Adding 'student_id_number' column to user_settings...")
            conn.execute(text("ALTER TABLE user_settings ADD COLUMN student_id_number VARCHAR(50) NULL DEFAULT '' AFTER batch_year"))

        # 2. tasks updates
        task_cols = [c["name"] for c in inspector.get_columns("tasks")]
        if "project_id" not in task_cols:
            print("Adding 'project_id' column to tasks...")
            conn.execute(text("ALTER TABLE tasks ADD COLUMN project_id INT NULL AFTER user_id"))
            try:
                conn.execute(text("ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL"))
            except Exception as fk_err:
                print(f"Notice adding fk_tasks_project_id: {fk_err}")

        # 3. developer_activity updates
        dev_cols = [c["name"] for c in inspector.get_columns("developer_activity")]
        if "project_id" not in dev_cols:
            print("Adding 'project_id' column to developer_activity...")
            conn.execute(text("ALTER TABLE developer_activity ADD COLUMN project_id INT NULL AFTER org_id"))
            try:
                conn.execute(text("ALTER TABLE developer_activity ADD CONSTRAINT fk_dev_activity_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL"))
            except Exception as fk_err:
                print(f"Notice adding fk_dev_activity_project_id: {fk_err}")
                
        # 4. Add index for project_id lookups
        dev_indices = [idx["name"] for idx in inspector.get_indexes("developer_activity")]
        if "ix_dev_activity_user_project" not in dev_indices:
            print("Adding index 'ix_dev_activity_user_project'...")
            conn.execute(text("ALTER TABLE developer_activity ADD INDEX ix_dev_activity_user_project (user_id, project_id)"))

    print("[MIGRATION] Completed successfully!")

if __name__ == "__main__":
    migrate_productivity_intelligence_schema()
