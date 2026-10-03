import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = inspector.get_columns("developer_activity")
indexes = inspector.get_indexes("developer_activity")
unique_constraints = inspector.get_unique_constraints("developer_activity")

print("COLUMNS:")
for col in columns:
    print(f"  {col['name']}: {col['type']} (nullable={col['nullable']})")

print("\nINDEXES:")
for idx in indexes:
    print(f"  {idx['name']}: columns={idx['column_names']}, unique={idx['unique']}")

print("\nUNIQUE CONSTRAINTS:")
for uq in unique_constraints:
    print(f"  {uq['name']}: {uq['column_names']}")
