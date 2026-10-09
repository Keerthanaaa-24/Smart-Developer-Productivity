import unittest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.database import Base
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.portfolio_profile import PortfolioProfile
from app.models.project import Project
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection

from app.services.portfolio_service import portfolio_service
from app.services.career_impact_service import career_impact_service


class TestPhase4PortfolioAndCareerImpact(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()
        # Create test users
        self.user1 = User(
            username="keerthana_test",
            email="keerthana@example.com",
            password="hashed_secure_password_123",
        )
        self.user2 = User(
            username="other_dev",
            email="other@example.com",
            password="hashed_secure_password_456",
        )
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

        # Settings
        self.settings1 = UserSettings(
            user_id=self.user1.id,
            full_name="Keerthana M R",
            bio="Full-Stack Engineer building Smart Developer Productivity",
        )
        self.db.add(self.settings1)

        # Projects
        self.proj1 = Project(
            user_id=self.user1.id,
            name="Smart Developer Productivity",
            description="ML-powered developer analytics and telemetry platform.",
            tech_stack="React, FastAPI, MySQL, Python, TailwindCSS",
            status="Completed",
            github_repo_url="https://github.com/Keerthanaaa-24/Smart-Developer-Productivity",
        )
        self.db.add(self.proj1)

        # Connections
        self.gh = GitHubConnection(
            user_id=self.user1.id,
            github_id="gh_987654",
            github_username="Keerthanaaa-24",
            access_token="test_encrypted_token",
            profile_url="https://github.com/Keerthanaaa-24",
        )
        self.lc = LeetCodeConnection(
            user_id=self.user1.id,
            leetcode_username="keerthana_lc",
            problems_solved=145,
            easy_solved=60,
            medium_solved=70,
            hard_solved=15,
        )
        self.db.add_all([self.gh, self.lc])

        # Pomodoro deep work sessions
        now = datetime.now(timezone.utc)
        for i in range(15):
            p = PomodoroSession(
                user_id=self.user1.id,
                session_type="focus",
                status="completed",
                planned_duration_seconds=1500,
                actual_duration_seconds=1500,
                started_at=now - timedelta(days=i * 2),
                ended_at=now - timedelta(days=i * 2, minutes=-25),
            )
            self.db.add(p)

        # Tasks
        for i in range(8):
            t = Task(
                user_id=self.user1.id,
                title=f"Complete Engineering Sprint Task #{i+1}",
                status="Completed" if i < 6 else "In Progress",
                priority="High" if i % 2 == 0 else "Medium",
                due_date=(now - timedelta(days=i * 3)).date(),
            )
            self.db.add(t)

        self.db.commit()

    def tearDown(self):
        self.db.query(PomodoroSession).delete()
        self.db.query(Task).delete()
        self.db.query(DeveloperActivity).delete()
        self.db.query(Project).delete()
        self.db.query(GitHubConnection).delete()
        self.db.query(LeetCodeConnection).delete()
        self.db.query(GeeksForGeeksConnection).delete()
        self.db.query(PortfolioProfile).delete()
        self.db.query(UserSettings).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    def test_01_portfolio_creation_and_defaults(self):
        """Feature 1: Verify portfolio auto-initialization and safe privacy defaults."""
        portfolio = portfolio_service.get_or_create_portfolio(self.db, self.user1.id)
        self.assertIsNotNone(portfolio)
        self.assertEqual(portfolio.custom_slug, "keerthana_test")
        self.assertTrue(portfolio.is_public_portfolio_enabled)
        self.assertFalse(portfolio.contact_email_public)  # Email NEVER public by default
        self.assertTrue(portfolio.show_github_stats)
        self.assertTrue(portfolio.show_coding_stats)
        self.assertTrue(portfolio.show_career_readiness)

    def test_02_portfolio_custom_slug_uniqueness_and_validation(self):
        """Feature 1: Verify custom slug sanitization, minimum length, and unique collision handling."""
        portfolio_service.get_or_create_portfolio(self.db, self.user1.id)
        portfolio_service.get_or_create_portfolio(self.db, self.user2.id)

        # Update User 1 slug
        updated = portfolio_service.update_portfolio(
            self.db, self.user1.id, {"custom_slug": "keerthana-senior-dev"}
        )
        self.assertEqual(updated.custom_slug, "keerthana-senior-dev")

        # Attempt to set User 2 to same slug -> should raise 409 Conflict
        with self.assertRaises(HTTPException) as ctx:
            portfolio_service.update_portfolio(
                self.db, self.user2.id, {"custom_slug": "keerthana-senior-dev"}
            )
        self.assertEqual(ctx.exception.status_code, 409)

        # Attempt too short slug -> should raise 400 Bad Request
        with self.assertRaises(HTTPException) as ctx:
            portfolio_service.update_portfolio(
                self.db, self.user2.id, {"custom_slug": "ab"}
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_03_public_portfolio_redaction_and_privacy_boundaries(self):
        """Feature 1 & 6: Verify strict public endpoint redaction (no passwords, OAuth tokens, or private email)."""
        portfolio_service.get_or_create_portfolio(self.db, self.user1.id)
        public_data = portfolio_service.get_public_portfolio(self.db, "keerthana_test")

        self.assertEqual(public_data["developer_name"], "Keerthana M R")
        self.assertIsNone(public_data["public_contact_email"])  # Redacted
        self.assertNotIn("password", public_data)
        self.assertNotIn("access_token", public_data)
        self.assertNotIn("refresh_token", public_data)
        self.assertNotIn("user_id", public_data)

        # Verified sections present
        self.assertIsNotNone(public_data["github_metrics"])
        self.assertEqual(public_data["github_metrics"]["username"], "Keerthanaaa-24")
        self.assertGreaterEqual(public_data["github_metrics"]["public_repos"], 1)
        self.assertIsNotNone(public_data["coding_metrics"])
        self.assertEqual(public_data["coding_metrics"]["leetcode"]["total_solved"], 145)
        self.assertGreaterEqual(len(public_data["featured_projects"]), 1)
        self.assertEqual(public_data["featured_projects"][0]["name"], "Smart Developer Productivity")

    def test_04_public_portfolio_disabled_visibility(self):
        """Feature 1: Verify that disabling portfolio visibility returns 404 to recruiters."""
        portfolio_service.get_or_create_portfolio(self.db, self.user1.id)
        portfolio_service.update_portfolio(
            self.db, self.user1.id, {"is_public_portfolio_enabled": False}
        )

        with self.assertRaises(HTTPException) as ctx:
            portfolio_service.get_public_portfolio(self.db, "keerthana_test")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_05_resume_export_schema(self):
        """Feature 2: Verify structured resume export format with verified provenance."""
        export_data = portfolio_service.export_resume_data(self.db, self.user1.id)
        self.assertIn("developer_name", export_data)
        self.assertIn("contact_email", export_data)
        self.assertIn("export_timestamp", export_data)
        self.assertIn("featured_projects", export_data)
        self.assertIn("skills", export_data)
        self.assertIn("provenance_summary", export_data)

    def test_06_career_impact_report_synthesis(self):
        """Feature 3: Verify Career Growth Impact synthesis across focus time, task throughput, and readiness."""
        report = career_impact_service.generate_career_impact_report(self.db, self.user1.id)
        self.assertIn("period", report)
        self.assertIn("focus_metrics", report)
        self.assertIn("task_velocity", report)
        self.assertIn("career_readiness_evolution", report)
        self.assertIn("personalized_next_steps", report)

        # Verify focus hours calculation
        self.assertGreater(report["focus_metrics"]["total_focus_hours_30d"], 0)
        self.assertEqual(len(report["focus_metrics"]["weekly_trends"]), 4)

        # Verify task velocity
        self.assertEqual(report["task_velocity"]["total_tasks"], 8)
        self.assertEqual(report["task_velocity"]["completed_tasks"], 6)
        self.assertEqual(report["task_velocity"]["completion_rate_pct"], 75.0)

        # Verify career readiness score
        self.assertGreater(report["career_readiness_evolution"]["current_score"], 0)
        self.assertGreaterEqual(len(report["personalized_next_steps"]), 1)

    def test_07_cross_user_isolation(self):
        """Feature 6: Verify strict per-user data isolation between distinct accounts."""
        p1 = portfolio_service.get_or_create_portfolio(self.db, self.user1.id)
        p2 = portfolio_service.get_or_create_portfolio(self.db, self.user2.id)

        self.assertNotEqual(p1.id, p2.id)
        self.assertNotEqual(p1.user_id, p2.user_id)
        self.assertNotEqual(p1.custom_slug, p2.custom_slug)


if __name__ == "__main__":
    unittest.main()
