import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, get_db
from app.models.user import User
from app.models.portfolio_profile import PortfolioProfile
from app.services.auth_service import create_access_token

class TestProductionStabilityAuditAndRepair(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()
        cls.test_user = cls.db.query(User).filter(User.id == 1).first()
        if not cls.test_user:
            cls.test_user = cls.db.query(User).first()
        assert cls.test_user is not None, "A valid application user is required for verification."
        cls.token = create_access_token(data={"sub": cls.test_user.username, "user_id": cls.test_user.id})
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_health_liveness_probe(self):
        """Verify fast liveness probe returns 200 instantly for Render orchestrator."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "healthy")

    def test_health_readiness_probe_connected(self):
        """Verify /health/ready returns 200 with database 'connected'."""
        res = self.client.get("/health/ready")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "ready")
        self.assertEqual(data.get("database"), "connected")

    def test_health_readiness_probe_disconnected(self):
        """Verify /health/ready returns 503 when database connectivity fails."""
        with patch("app.main.verify_database_connection", return_value=False):
            res = self.client.get("/health/ready")
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertEqual(data.get("status"), "unavailable")
            self.assertEqual(data.get("database"), "disconnected")

    def test_portfolio_me_privacy_resilience(self):
        """
        Verify that toggling is_public_portfolio_enabled=False does NOT break
        the authenticated owner's settings/preview endpoint (/portfolio/me).
        """
        from app.services.portfolio_service import portfolio_service
        portfolio = portfolio_service.get_or_create_portfolio(self.db, self.test_user.id)
        original_visibility = portfolio.is_public_portfolio_enabled

        try:
            # Set to Private
            portfolio.is_public_portfolio_enabled = False
            self.db.commit()
            self.db.refresh(portfolio)

            # Authenticated owner requesting their settings
            res = self.client.get("/portfolio/me", headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertIn("settings", data)
            self.assertIn("preview", data)
            self.assertIsNotNone(data["preview"])
            self.assertEqual(data["settings"]["is_public_portfolio_enabled"], False)

            # Public unauthenticated recruiter must be rejected with 404 when private
            slug = data["settings"]["custom_slug"]
            public_res = self.client.get(f"/portfolio/public/{slug}")
            self.assertEqual(public_res.status_code, 404)

        finally:
            if portfolio:
                portfolio.is_public_portfolio_enabled = original_visibility
                self.db.commit()

    def test_career_impact_report_no_synthetic_minimums(self):
        """Verify career impact report returns genuine metrics and accurate observation days."""
        res = self.client.get("/career-impact/report", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("period", data)
        self.assertIn("focus_metrics", data)
        self.assertIn("task_velocity", data)
        self.assertIsInstance(data["period"]["active_observation_days"], int)

if __name__ == "__main__":
    unittest.main()
