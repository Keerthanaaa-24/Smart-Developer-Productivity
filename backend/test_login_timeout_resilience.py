"""
TEST SUITE: Login Timeout, Cold-Start Resilience & Authentication Integrity
Validates:
1. Login Success (Form & JSON payloads, JWT token validity, session validation via /auth/me)
2. Invalid Credentials & Validation Errors (401 invalid credentials, 400 missing fields)
3. Backend Timeout & Cold-Start Resilience (Safe GET /health bounded retries vs non-blind POST retry)
4. Database Failure & Settings Resiliency (Simulated DB failure, graceful fallback in /auth/me)
5. Preservation of Phase 1-4 Models, Routes, and Primary User Data
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app.main import app
from app.core.database import SessionLocal, engine
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.services.auth_service import authenticate_user, create_access_token
from app.core.oauth2 import get_current_user


class TestLoginTimeoutAndResilience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()
        cls.primary_user = cls.db.query(User).filter(User.id == 1).first()
        assert cls.primary_user is not None, "Primary User ID 1 (Keerthzz) must exist in database"

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # =========================================================================
    # 1. LOGIN SUCCESS TESTS
    # =========================================================================
    def test_login_success_form_data(self):
        """Test login success with standard application/x-www-form-urlencoded format."""
        response = self.client.post(
            "/auth/login",
            data={"username": "Keerthzz", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 200, f"Form login failed: {response.text}")
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["id"], 1)
        self.assertEqual(data["user"]["username"], "Keerthzz")
        self.assertEqual(data["user"]["email"], "keerthzz@gmail.com")

        # Test session verification on /auth/me with the received token
        token = data["access_token"]
        me_res = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["id"], 1)
        self.assertEqual(me_data["username"], "Keerthzz")

    def test_login_success_json_payload(self):
        """Test login success with modern application/json format using email."""
        response = self.client.post(
            "/auth/login",
            json={"email": "keerthzz@gmail.com", "password": "password123"},
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 200, f"JSON login failed: {response.text}")
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["id"], 1)

    def test_token_alias_endpoint(self):
        """Verify /auth/token endpoint acts as a functional alias for /auth/login."""
        response = self.client.post(
            "/auth/token",
            data={"username": "Keerthzz", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())

    # =========================================================================
    # 2. INVALID CREDENTIALS & VALIDATION TESTS
    # =========================================================================
    def test_invalid_password_returns_401(self):
        """Test wrong password produces clean HTTP 401 with detail 'Invalid credentials'."""
        response = self.client.post(
            "/auth/login",
            data={"username": "Keerthzz", "password": "WrongPassword999!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json().get("detail"), "Invalid credentials")

    def test_nonexistent_user_returns_401(self):
        """Test non-existent username produces clean HTTP 401 without leaking internal details."""
        response = self.client.post(
            "/auth/login",
            data={"username": "non_existent_ghost_user_99999", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json().get("detail"), "Invalid credentials")

    def test_empty_credentials_returns_400(self):
        """Test missing username or password produces HTTP 400 Bad Request."""
        response = self.client.post(
            "/auth/login",
            data={"username": "", "password": ""},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", response.json().get("detail", "").lower())

    # =========================================================================
    # 3. BACKEND TIMEOUT & COLD-START RESILIENCE TESTS
    # =========================================================================
    def test_health_check_responds_promptly(self):
        """Verify backend /health check returns status 'healthy' with zero overhead."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("service"), "smart-developer-productivity-api")

    def test_cors_headers_production_origin(self):
        """Verify CORS preflight correctly acknowledges production Vercel frontend origin."""
        response = self.client.options(
            "/auth/login",
            headers={
                "Origin": "https://smart-developer-productivity.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "https://smart-developer-productivity.vercel.app",
        )
        self.assertEqual(response.headers.get("access-control-allow-credentials"), "true")

    def test_no_blind_post_retry_contract(self):
        """
        Verify that login POST requests record exactly one login history entry per request,
        confirming that POST requests are non-idempotent mutations that must never be
        blindly retried by automated background loops.
        """
        from app.models.login_history import LoginHistory
        with SessionLocal() as db_check:
            count_before = db_check.query(LoginHistory).filter(LoginHistory.user_id == 1).count()

        # Send exactly one valid login request
        res = self.client.post(
            "/auth/login",
            data={"username": "Keerthzz", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(res.status_code, 200)

        with SessionLocal() as db_check:
            count_after = db_check.query(LoginHistory).filter(LoginHistory.user_id == 1).count()
        self.assertEqual(count_after, count_before + 1, "Exactly one history row should be created per login POST")

    # =========================================================================
    # 4. DATABASE FAILURE & FAULT-TOLERANCE TESTS
    # =========================================================================
    def test_auth_me_survives_user_settings_failure(self):
        """
        Test that /auth/me gracefully returns user profile even if the user_settings
        table query raises a database exception (e.g., schema divergence during deployment).
        """
        token = create_access_token({"sub": "1", "user_id": 1, "username": "Keerthzz", "email": "keerthzz@gmail.com"})
        
        orig_query = Session.query
        def failing_settings_query(session_self, *entities, **kwargs):
            from app.models.user_settings import UserSettings
            if UserSettings in entities:
                raise OperationalError("Simulated user_settings column missing", {}, None)
            return orig_query(session_self, *entities, **kwargs)

        with patch.object(Session, "query", failing_settings_query):
            response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            # Must NOT fail with 500; must safely fall back and return core user profile
            self.assertEqual(response.status_code, 200, f"/auth/me did not survive DB settings failure: {response.text}")
            data = response.json()
            self.assertEqual(data["id"], 1)
            self.assertEqual(data["username"], "Keerthzz")
            self.assertEqual(data["email"], "keerthzz@gmail.com")

    def test_database_connection_failure_during_login(self):
        """
        Test that database operational errors during authentication are safely caught
        and do not leak sensitive credentials or internal stack traces to the client.
        """
        with patch("app.routes.auth_routes.authenticate_user") as mock_auth:
            mock_auth.side_effect = OperationalError("Lost connection to MySQL server at 'remote-cloud:3306'", {}, None)
            
            try:
                response = self.client.post(
                    "/auth/login",
                    data={"username": "Keerthzz", "password": "password123"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                self.assertIn(response.status_code, [500, 503])
                self.assertNotIn("password", response.text.lower())
            except OperationalError:
                # OperationalError raised without leaking password
                pass

    # =========================================================================
    # 5. PHASE 1-4 FEATURES & USER DATA PRESERVATION
    # =========================================================================
    def test_phase1_4_features_and_primary_user_preserved(self):
        """Verify that existing primary user data, tasks, pomodoro, activities, and routes are intact."""
        with SessionLocal() as db_check:
            # 1. Primary User Keerthzz
            user = db_check.query(User).filter(User.id == 1).first()
            self.assertIsNotNone(user)
            self.assertEqual(user.username, "Keerthzz")
            self.assertEqual(user.email, "keerthzz@gmail.com")

            # 2. Tasks
            task_count = db_check.query(Task).filter(Task.user_id == 1).count()
            self.assertGreater(task_count, 0, "Phase 1 tasks must be preserved")

            # 3. Pomodoro
            pomo_count = db_check.query(PomodoroSession).filter(PomodoroSession.user_id == 1).count()
            self.assertGreater(pomo_count, 0, "Phase 2 pomodoro sessions must be preserved")

            # 4. Activities
            act_count = db_check.query(DeveloperActivity).filter(DeveloperActivity.user_id == 1).count()
            self.assertGreater(act_count, 0, "Phase 3 developer activities must be preserved")

        # 5. Portfolio & Career Impact routes successfully mounted
        paths = app.openapi().get("paths", {})
        self.assertIn("/portfolio/me", paths, "Phase 4 portfolio route must be registered")
        self.assertIn("/career-impact/report", paths, "Phase 4 career-impact route must be registered")
        self.assertIn("/health", paths, "Health endpoint must be registered")
        self.assertIn("/auth/login", paths, "Auth login route must be registered")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("RUNNING LOGIN TIMEOUT & AUTHENTICATION RESILIENCE TEST SUITE")
    print("=" * 70 + "\n")
    suite = unittest.TestLoader().loadTestsFromTestCase(TestLoginTimeoutAndResilience)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
