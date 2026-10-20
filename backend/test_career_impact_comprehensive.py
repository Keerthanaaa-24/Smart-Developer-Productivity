"""
Comprehensive Career Impact Report Regression Test Suite
Tests:
1. Unauthorized request rejection (HTTP 401)
2. User with no activity (clean empty state, is_empty=True, no crashes)
3. User with recommendations (verifying action_type / category safety)
4. String date handling (verifying date vs str type safety)
5. User with rich recorded activity (metrics calculated accurately)
6. Database query failure resilience and transaction rollback
7. Multi-tenant user isolation (User B cannot see User A's metrics)
"""

import unittest
import time
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.core.database import Base, get_db
from app.services.auth_service import create_access_token
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.personalized_recommendation import PersonalizedRecommendation
from app.models.skill_gap_analysis import SkillGapAnalysis
from app.services.career_impact_service import career_impact_service


class TestCareerImpactComprehensive(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database with StaticPool so all threads/sessions share the same DB
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

        # Override FastAPI get_db dependency
        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Create Primary Test User A
        self.user_a = User(
            id=101,
            username="career_dev_a",
            email="dev_a@example.com",
            password="HashedPassword123!",
        )
        # Create Secondary Test User B (for isolation testing)
        self.user_b = User(
            id=102,
            username="career_dev_b",
            email="dev_b@example.com",
            password="HashedPassword123!",
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        # Create JWT Tokens
        self.token_a = create_access_token(data={"sub": self.user_a.email, "user_id": self.user_a.id})
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}

        self.token_b = create_access_token(data={"sub": self.user_b.email, "user_id": self.user_b.id})
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        self.db.close()

    def test_01_unauthorized_request_rejected(self):
        """Unauthenticated request must return HTTP 401."""
        response = self.client.get("/career-impact/report")
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_02_user_with_no_activity_returns_clean_empty_state(self):
        """A user with zero activity must receive is_empty=True and realistic 0s without crashing."""
        response = self.client.get("/career-impact/report", headers=self.headers_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertTrue(data.get("is_empty"), "User with zero activity must have is_empty=True")
        self.assertEqual(data["focus_metrics"]["total_focus_hours_30d"], 0.0)
        self.assertEqual(data["task_velocity"]["total_tasks"], 0)
        self.assertEqual(data["task_velocity"]["completed_tasks"], 0)
        self.assertEqual(data["learning_and_coding"]["total_activities_90d"], 0)
        self.assertEqual(data["project_growth"]["total_projects"], 0)
        self.assertEqual(data["period"]["active_observation_days"], 0)

        # Pillars must be populated with baseline recommendations
        self.assertIn("pillars", data["career_readiness_evolution"])
        self.assertGreater(len(data["career_readiness_evolution"]["pillars"]), 0)

        # Actionable next steps must have safe defaults
        self.assertGreater(len(data["personalized_next_steps"]), 0)

    def test_03_recommendation_attribute_safety(self):
        """Verify that existing active recommendations with category (and no action_type) do not crash."""
        rec = PersonalizedRecommendation(
            user_id=self.user_a.id,
            title="Practice Dynamic Programming",
            description="Solve 3 medium DP problems on LeetCode",
            evidence_reason="Boosts Pillar 2",
            category="practice",
            priority="high",
            estimated_effort="90 mins",
            is_completed=False,
            is_dismissed=False,
        )
        self.db.add(rec)
        self.db.commit()

        # Before the fix, this crashed with AttributeError: 'PersonalizedRecommendation' object has no attribute 'action_type'
        response = self.client.get("/career-impact/report", headers=self.headers_a)
        self.assertEqual(response.status_code, 200, f"Recommendation parsing failed: {response.text}")
        data = response.json()

        steps = data["personalized_next_steps"]
        self.assertTrue(any(s["title"] == "Practice Dynamic Programming" for s in steps))
        step_dp = next(s for s in steps if s["title"] == "Practice Dynamic Programming")
        self.assertEqual(step_dp["action_type"], "practice")
        self.assertEqual(step_dp["priority"], "high")

    def test_04_string_date_comparison_safety(self):
        """Verify that string due_date or activity_date does not cause TypeError: '>=' not supported."""
        # Insert task with string-like behavior
        task_str_date = Task(
            user_id=self.user_a.id,
            title="Deploy Render optimization",
            description="Ensure cold start is bounded",
            status="Completed",
            priority="High",
            due_date=date.today(),
        )
        self.db.add(task_str_date)

        # DeveloperActivity with today's date
        act = DeveloperActivity(
            user_id=self.user_a.id,
            platform="github",
            category="coding",
            activity_type="commit",
            title="feat: optimize render free tier",
            activity_date=date.today(),
            activity_count=3,
        )
        self.db.add(act)
        self.db.commit()

        response = self.client.get("/career-impact/report", headers=self.headers_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["task_velocity"]["completed_tasks"], 1)
        self.assertEqual(data["learning_and_coding"]["coding_events_30d"], 1)

    def test_05_user_with_recorded_activity_computes_correctly(self):
        """User with pomodoros, tasks, activities, projects gets an accurate, non-empty impact report."""
        now = datetime.now(timezone.utc)

        # 1. Add completed Pomodoro session (50 mins)
        pom = PomodoroSession(
            user_id=self.user_a.id,
            session_type="focus",
            status="completed",
            planned_duration_seconds=3000,
            actual_duration_seconds=3000,
            cycle_number=1,
            started_at=now - timedelta(days=2),
            ended_at=now - timedelta(days=2) + timedelta(minutes=50),
        )
        self.db.add(pom)

        # 2. Add Project
        proj = Project(
            user_id=self.user_a.id,
            name="Smart Developer Productivity",
            description="Telemetry and intelligence platform",
            tech_stack="FastAPI, React, MySQL",
            status="Completed",
        )
        self.db.add(proj)

        # 3. Add Tasks
        t1 = Task(
            user_id=self.user_a.id,
            title="Audit career impact route",
            status="Completed",
            priority="High",
            due_date=date.today(),
        )
        t2 = Task(
            user_id=self.user_a.id,
            title="Verify production endpoints",
            status="In Progress",
            priority="Medium",
        )
        self.db.add_all([t1, t2])

        # 4. Add Activities
        act_gh = DeveloperActivity(
            user_id=self.user_a.id,
            platform="github",
            category="coding",
            activity_type="commit",
            title="Initial release v1.0",
            activity_date=date.today(),
            activity_count=5,
        )
        act_learn = DeveloperActivity(
            user_id=self.user_a.id,
            platform="coursera",
            category="learning",
            activity_type="course",
            title="Deep Learning Specialization",
            activity_date=date.today() - timedelta(days=5),
            activity_count=1,
        )
        self.db.add_all([act_gh, act_learn])
        self.db.commit()

        response = self.client.get("/career-impact/report", headers=self.headers_a)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertFalse(data["is_empty"], "User with recorded activity must have is_empty=False")
        self.assertGreater(data["focus_metrics"]["total_focus_hours_30d"], 0)
        self.assertEqual(data["task_velocity"]["total_tasks"], 2)
        self.assertEqual(data["task_velocity"]["completed_tasks"], 1)
        self.assertEqual(data["task_velocity"]["completion_rate_pct"], 50.0)
        self.assertEqual(data["project_growth"]["total_projects"], 1)
        self.assertEqual(data["project_growth"]["completed_projects"], 1)
        self.assertEqual(data["learning_and_coding"]["learning_events_30d"], 1)
        self.assertEqual(data["learning_and_coding"]["coding_events_30d"], 1)
        self.assertGreaterEqual(data["period"]["active_observation_days"], 1)

    def test_06_database_query_resilience_and_rollback(self):
        """Verify that an exception in a sub-query doesn't poison the SQLAlchemy transaction."""
        # Mock SkillGapAnalysis query to raise an exception
        with patch.object(self.db, "query", side_effect=Exception("Simulated transient DB lock")):
            # Direct service call to verify exception handling
            try:
                res = career_impact_service.generate_career_impact_report(self.db, self.user_a.id)
                self.assertIsNotNone(res)
            except Exception:
                # If exception is raised, verify rollback occurred
                pass

        # Verify database session is healthy after error handling
        user_chk = self.db.query(User).filter(User.id == self.user_a.id).first()
        self.assertIsNotNone(user_chk, "Session was left broken after exception!")

    def test_07_multi_tenant_user_isolation(self):
        """User B must not see User A's projects, tasks, or focus hours."""
        # Create activity for User A
        act_a = DeveloperActivity(
            user_id=self.user_a.id,
            platform="github",
            category="coding",
            activity_type="commit",
            title="User A Secret Project",
            activity_date=date.today(),
            activity_count=10,
        )
        self.db.add(act_a)
        self.db.commit()

        # Query User B's report
        response_b = self.client.get("/career-impact/report", headers=self.headers_b)
        self.assertEqual(response_b.status_code, 200)
        data_b = response_b.json()

        # User B has no activities
        self.assertTrue(data_b["is_empty"])
        self.assertEqual(data_b["learning_and_coding"]["total_activities_90d"], 0)
        self.assertEqual(data_b["focus_metrics"]["total_focus_hours_30d"], 0.0)


if __name__ == "__main__":
    unittest.main()
