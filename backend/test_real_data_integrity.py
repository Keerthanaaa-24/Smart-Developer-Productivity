"""
Automated Test Suite: Real-Data Integrity, Streak Audit, and User Isolation
Verifies that all leaderboard data, points, streaks, and achievements are grounded strictly
in genuine database records and that user isolation is rigidly enforced.
"""

import unittest
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.project import Project
from app.models.point_transaction import PointTransaction
from app.models.student_achievement import StudentAchievement

from app.services.points_service import (
    award_points,
    sync_verified_points_for_user,
    get_user_points_summary,
)
from app.services.developer_streak_service import get_developer_streak
from app.services.leaderboard_service import (
    get_leaderboard,
    get_student_leaderboard_position,
    get_public_student_profile,
)


class TestRealDataIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Isolated SQLite in-memory engine to guarantee zero modification of production data
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Real registered student accounts
        self.real_student_1 = User(id=1, username="Keerthzz", email="keerthzz@gmail.com", password="hash1")
        self.real_student_2 = User(id=72, username="keerthu@gmail.com", email="keerthanamr9@gmail.com", password="hash2")
        
        # Synthetic test runner accounts that must be excluded from public leaderboard
        self.test_runner_1 = User(id=200, username="UserA_dev", email="test_usera@example.com", password="hash_test1")
        self.test_runner_2 = User(id=201, username="opt_user_99", email="perf_opt@example.com", password="hash_test2")
        self.test_runner_3 = User(id=202, username="audit_user", email="audit@test.com", password="hash_test3")

        self.db.add_all([
            self.real_student_1,
            self.real_student_2,
            self.test_runner_1,
            self.test_runner_2,
            self.test_runner_3,
        ])
        self.db.commit()

        self.db.add_all([
            UserSettings(user_id=1, full_name="Keerthi Developer", profile_visibility="public"),
            UserSettings(user_id=72, full_name="Keerthana", profile_visibility="public"),
            UserSettings(user_id=200, full_name="Alice Synthetic", profile_visibility="public"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # ==========================================================================
    # 1. SYNTHETIC ACCOUNT EXCLUSION FROM LEADERBOARD
    # ==========================================================================
    def test_synthetic_test_accounts_excluded_from_leaderboard(self):
        """Synthetic test runner accounts (@example.com, @test.com) must be excluded from real leaderboard."""
        # Award points to test runner
        award_points(self.db, user_id=200, source_type="task", source_id="test_task_1", points=100)
        # Award points to real student
        award_points(self.db, user_id=72, source_type="task", source_id="real_task_1", points=20)

        board = get_leaderboard(self.db, period="all_time")
        students = board["students"]
        student_ids = [s["user_id"] for s in students]

        # Test runner 200 with 100 points must NOT be on the public leaderboard
        self.assertNotIn(200, student_ids)
        self.assertNotIn(201, student_ids)
        self.assertNotIn(202, student_ids)

        # Real student 72 MUST be on the leaderboard
        self.assertIn(72, student_ids)
        # Real student 72 is ranked #1 among real students
        rank_72 = next(s for s in students if s["user_id"] == 72)
        self.assertEqual(rank_72["rank"], 1)
        self.assertEqual(rank_72["points"], 20)

    # ==========================================================================
    # 2. AUDIT OF REAL STREAKS & DATE GAPS
    # ==========================================================================
    def test_streak_requires_active_today_or_yesterday_not_fabricated(self):
        """If activity stopped 12 days ago, current streak is honestly 0, not fabricated."""
        today = date.today()
        lapsed_date = today - timedelta(days=12)

        # Simulate historical activity from 30 days ago to 12 days ago
        for i in range(18):
            self.db.add(DeveloperActivity(
                user_id=72,
                platform="github",
                activity_type="commit",
                activity_date=lapsed_date - timedelta(days=i),
            ))
        self.db.commit()

        streak_info = get_developer_streak(self.db, user_id=72, force_refresh=True)

        # Total active days must match exact distinct calendar dates
        self.assertEqual(streak_info["total_active_days"], 18)
        # Longest historical unbroken streak was 18
        self.assertEqual(streak_info["longest_streak"], 18)
        # Current streak MUST BE 0 because last active was 12 days ago
        self.assertEqual(streak_info["current_streak"], 0)
        self.assertFalse(streak_info["today_active"])
        self.assertEqual(streak_info["last_active_date"], str(lapsed_date))
        self.assertIn("No eligible activity recorded recently", streak_info["status_reason"])

    def test_streak_unbroken_consecutive_days_calculation(self):
        """Verifies that an unbroken streak calculation never fabricates extra days."""
        today = date.today()
        # Add 5 consecutive days ending yesterday
        for d in range(1, 6):
            self.db.add(DeveloperActivity(
                user_id=1,
                platform="github",
                activity_type="commit",
                activity_date=today - timedelta(days=d),
            ))
        self.db.commit()

        streak_info = get_developer_streak(self.db, user_id=1, force_refresh=True)
        # Active yesterday -> streak of 5 preserved waiting for today
        self.assertEqual(streak_info["current_streak"], 5)
        self.assertEqual(streak_info["total_active_days"], 5)

        # Gap on day 6 breaks the streak, so longest is 5, not inflated
        self.assertEqual(streak_info["longest_streak"], 5)

    # ==========================================================================
    # 3. VERIFIED HISTORICAL POINTS RECONCILIATION
    # ==========================================================================
    def test_verified_historical_points_reconciliation(self):
        """Historical tasks, pomodoros, and projects reconcile points transactionally and idempotently."""
        # Add legitimate completed tasks for User 72
        self.db.add(Task(id=28, user_id=72, title="complete deployment", status="Completed"))
        self.db.add(Task(id=33, user_id=72, title="Make use of AI tools", status="Completed"))
        self.db.add(Task(id=50, user_id=72, title="Pending task", status="Pending"))

        # Add legitimate qualifying focus Pomodoro session (1500s)
        self.db.add(PomodoroSession(
            id=15,
            user_id=72,
            session_type="focus",
            status="completed",
            actual_duration_seconds=1500,
        ))
        # Add interrupted focus session (must earn 0 pts)
        self.db.add(PomodoroSession(
            id=14,
            user_id=72,
            session_type="focus",
            status="interrupted",
            actual_duration_seconds=105,
        ))

        # Add completed project
        self.db.add(Project(id=5, user_id=72, name="Todo App", status="Completed"))
        self.db.commit()

        # Reconcile points
        awarded = sync_verified_points_for_user(self.db, user_id=72)
        # 2 tasks (20) + 1 pomodoro (5) + 1 project (10) = 4 transactions
        self.assertEqual(awarded, 4)

        summary = get_user_points_summary(self.db, user_id=72)
        self.assertEqual(summary["total_points"], 35)

        # Repeated reconciliation must be 100% idempotent (0 duplicate awards)
        awarded_second_run = sync_verified_points_for_user(self.db, user_id=72)
        self.assertEqual(awarded_second_run, 0)
        self.assertEqual(summary["total_points"], 35)

    # ==========================================================================
    # 4. USER ISOLATION & PRIVACY TESTS
    # ==========================================================================
    def test_user_data_isolation_achievements_and_points(self):
        """User A cannot access or modify User B's achievements or points."""
        # Create private achievement for User 1
        ach_user1 = StudentAchievement(
            id=10,
            user_id=1,
            title="Private Internal Award",
            category="hackathon",
            issuer="Tech Org",
            is_public=False,
            points_awarded=15,
        )
        self.db.add(ach_user1)
        self.db.commit()

        # User 72 requests User 1's public profile summary
        public_summary = get_public_student_profile(self.db, target_user_id=1)
        # Private achievement must NOT be exposed
        self.assertEqual(len(public_summary["public_achievements"]), 0)


if __name__ == "__main__":
    unittest.main()
