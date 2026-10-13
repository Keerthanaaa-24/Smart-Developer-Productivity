import unittest
import time
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, Text, MetaData, Table, inspect, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base
from app.core.schema_sync import sync_database_schema
from app.main import app
from app.models.user import User
from app.models.user_settings import UserSettings
from app.core.security import hash_password
from app.core.jwt_handler import create_access_token


class TestSchemaSyncAndDashboardResilience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_schema_sync_detects_and_adds_missing_columns(self):
        """Verify that sync_database_schema detects missing columns in an existing table and adds them."""
        # Setup an isolated in-memory SQLite database
        test_engine = create_engine("sqlite:///:memory:")
        with test_engine.connect() as conn:
            # Create a partial user_settings table missing Phase 2 browser extension columns
            conn.execute(text(
                "CREATE TABLE user_settings (id INTEGER PRIMARY KEY, user_id INTEGER, theme VARCHAR(20) DEFAULT 'light')"
            ))
            conn.commit()

        inspector_before = inspect(test_engine)
        cols_before = {c["name"] for c in inspector_before.get_columns("user_settings")}
        self.assertNotIn("browser_extension_enabled", cols_before)
        self.assertNotIn("idle_threshold_seconds", cols_before)

        # Run schema sync against this engine
        added_count = sync_database_schema(target_engine=test_engine)
        self.assertGreater(added_count, 0)

        inspector_after = inspect(test_engine)
        cols_after = {c["name"] for c in inspector_after.get_columns("user_settings")}
        self.assertIn("browser_extension_enabled", cols_after)
        self.assertIn("idle_threshold_seconds", cols_after)
        self.assertIn("auto_sync_interval_seconds", cols_after)

    def test_dashboard_overview_endpoint_contract(self):
        """Verify that /dashboard/overview returns 200 with structured metrics and does not fail."""
        # Login or get token for user 1
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/dashboard/overview", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("primary_metrics", data)
        self.assertIn("user", data)
        self.assertIn("today_summary", data)
        self.assertIn("ml_prediction", data)

    def test_dashboard_stats_endpoint_contract(self):
        """Verify that /dashboard/stats returns 200 with backward compatible stats."""
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/dashboard/stats", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, dict)

    def test_ml_career_readiness_endpoint_contract(self):
        """Verify that /ml/career-readiness returns 200 and does not crash."""
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/ml/career-readiness", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("overall_readiness_index", data)
        self.assertIn("pillars", data)

    def test_time_tracking_summary_endpoint_contract(self):
        """Verify that /time-tracking/summary returns 200 with platform breakdown."""
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/time-tracking/summary", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("today", data)
        self.assertIn("targets", data)

    def test_portfolio_me_endpoint_contract(self):
        """Verify that /portfolio/me returns 200."""
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/portfolio/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("settings", data)
        self.assertIn("preview", data)

    def test_career_impact_report_endpoint_contract(self):
        """Verify that /career-impact/report returns 200."""
        token = create_access_token({"sub": "1", "user_id": 1, "username": "testuser"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/career-impact/report", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("focus_metrics", data)
        self.assertIn("career_readiness_evolution", data)

    def test_random_forest_ml_pipeline_intact(self):
        """Verify that Random Forest predictor and ML endpoints operate normally."""
        from ml.predict import get_productivity_predictor
        predictor = get_productivity_predictor()
        features = {
            "coding_minutes": 120.0,
            "tasks_completed": 4,
            "tasks_planned": 5,
            "pomodoro_sessions": 4,
            "pomodoro_minutes": 100.0,
            "github_commits": 6,
            "goal_completion_rate": 80.0,
            "focus_score": 85.0,
        }
        pred = predictor.predict(features)
        self.assertIn("predicted_productivity_score", pred)
        self.assertIn("productivity_level", pred)


if __name__ == "__main__":
    unittest.main()
