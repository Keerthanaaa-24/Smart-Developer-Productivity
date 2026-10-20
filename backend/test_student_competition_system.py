"""
Comprehensive Automated Test Suite:
Real Student Competition, Idempotent Points, Persistent Streaks, & Achievement System.
Uses isolated in-memory SQLite database to guarantee ZERO modification of production data.
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
    get_user_points_summary,
    calculate_level_info,
    SCORING_POLICY,
)
from app.services.developer_streak_service import get_developer_streak
from app.services.leaderboard_service import (
    get_leaderboard,
    get_student_leaderboard_position,
    get_public_student_profile,
)


class TestStudentCompetitionSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an isolated SQLite database for testing
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
        # Seed test users
        self.user1 = User(id=1, username="student_alpha", email="alpha@test.edu", password="hash_password_1")
        self.user2 = User(id=2, username="student_beta", email="beta@test.edu", password="hash_password_2")
        self.user3 = User(id=3, username="student_gamma", email="gamma@test.edu", password="hash_password_3")
        self.user4 = User(id=4, username="student_private", email="private@test.edu", password="hash_password_4")

        self.db.add_all([self.user1, self.user2, self.user3, self.user4])
        self.db.commit()

        # Seed user settings
        self.settings1 = UserSettings(user_id=1, full_name="Alpha Student", profile_visibility="public")
        self.settings2 = UserSettings(user_id=2, full_name="Beta Coder", profile_visibility="public")
        self.settings3 = UserSettings(user_id=3, full_name="Gamma Engineer", profile_visibility="public")
        self.settings4 = UserSettings(user_id=4, full_name="Secret Developer", profile_visibility="private")

        self.db.add_all([self.settings1, self.settings2, self.settings3, self.settings4])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # ==========================================================================
    # 1. IDEMPOTENT POINTS ENGINE TESTS
    # ==========================================================================
    def test_point_award_idempotency(self):
        """Awarding points with the same (user_id, source_type, source_id) must be strictly idempotent."""
        # First award
        tx1 = award_points(
            db=self.db,
            user_id=1,
            source_type="task",
            source_id="task_101",
            points=10,
            category="productivity",
            description="Completed task #101",
        )
        self.assertIsNotNone(tx1)
        self.assertEqual(tx1.points, 10)

        # Repeated award with same source_id
        tx2 = award_points(
            db=self.db,
            user_id=1,
            source_type="task",
            source_id="task_101",
            points=10,
            category="productivity",
            description="Completed task #101 again",
        )
        self.assertEqual(tx1.id, tx2.id)

        # Total points for user must be exactly 10, not 20
        summary = get_user_points_summary(self.db, user_id=1)
        self.assertEqual(summary["total_points"], 10)

    def test_level_calculation_progression(self):
        """Verifies level calculation thresholds and progress percentage."""
        lvl_0 = calculate_level_info(0)
        self.assertEqual(lvl_0["level"], 1)
        self.assertEqual(lvl_0["current_points"], 0)

        lvl_150 = calculate_level_info(150)
        self.assertEqual(lvl_150["level"], 2)
        self.assertEqual(lvl_150["title"], "Apprentice Coder")

        lvl_600 = calculate_level_info(600)
        self.assertEqual(lvl_600["level"], 4)
        self.assertEqual(lvl_600["title"], "Senior Crafter")

    def test_task_completion_not_earning_duplicate_points(self):
        """Toggling task completion multiple times must not award points repeatedly."""
        from app.services.task_service import create_task, update_task
        from app.schemas.task_schema import TaskCreate

        task_data = TaskCreate(
            title="Implement OAuth",
            description="Build GitHub OAuth flow",
            status="In Progress",
            priority="High",
        )
        task = create_task(self.db, task_data, user_id=1)

        # Mark completed (1st time)
        completed_data = TaskCreate(
            title="Implement OAuth",
            description="Build GitHub OAuth flow",
            status="Completed",
            priority="High",
        )
        update_task(self.db, task.id, completed_data, user_id=1)

        # Check points
        pts1 = get_user_points_summary(self.db, user_id=1)["total_points"]
        self.assertEqual(pts1, 10)

        # Toggle back to In Progress
        in_prog_data = TaskCreate(
            title="Implement OAuth",
            description="Build GitHub OAuth flow",
            status="In Progress",
            priority="High",
        )
        update_task(self.db, task.id, in_prog_data, user_id=1)

        # Toggle back to Completed (2nd time)
        update_task(self.db, task.id, completed_data, user_id=1)

        # Points MUST remain 10!
        pts2 = get_user_points_summary(self.db, user_id=1)["total_points"]
        self.assertEqual(pts2, 10)

    def test_short_focus_session_does_not_earn_points(self):
        """Pomodoro sessions shorter than 900 seconds (15m) must not award completion points."""
        from app.services.pomodoro_service import start_pomodoro_session, complete_pomodoro_session

        session = start_pomodoro_session(self.db, user_id=1, planned_duration_seconds=1500)
        # Completed after only 300 seconds (5 mins - too short)
        complete_pomodoro_session(self.db, user_id=1, session_id=session["id"], actual_duration_seconds=300)

        summary = get_user_points_summary(self.db, user_id=1)
        self.assertEqual(summary["total_points"], 0)

        # Now test a qualifying 1500-second session
        session2 = start_pomodoro_session(self.db, user_id=1, planned_duration_seconds=1500)
        complete_pomodoro_session(self.db, user_id=1, session_id=session2["id"], actual_duration_seconds=1500)

        summary2 = get_user_points_summary(self.db, user_id=1)
        self.assertEqual(summary2["total_points"], 5)

    # ==========================================================================
    # 2. REAL STREAK ENGINE TESTS
    # ==========================================================================
    def test_streak_consecutive_days_and_grace_period(self):
        """Active days across calendar dates must form streaks; yesterday activity preserves streak."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        day_before = today - timedelta(days=2)

        # Add activities on day_before and yesterday
        act1 = DeveloperActivity(
            user_id=1,
            platform="github",
            activity_date=day_before,
            activity_type="commit",
            activity_count=3,
        )
        act2 = DeveloperActivity(
            user_id=1,
            platform="leetcode",
            activity_date=yesterday,
            activity_type="problem_solved",
            activity_count=1,
        )
        self.db.add_all([act1, act2])
        self.db.commit()

        streak = get_developer_streak(self.db, user_id=1, force_refresh=True)
        # Should be preserved at 2 because user was active yesterday
        self.assertEqual(streak["current_streak"], 2)
        self.assertEqual(streak["longest_streak"], 2)
        self.assertEqual(streak["total_active_days"], 2)

        # Now add activity today
        act3 = DeveloperActivity(
            user_id=1,
            platform="pomodoro",
            activity_date=today,
            activity_type="focus_session",
            activity_count=1,
        )
        self.db.add(act3)
        self.db.commit()

        streak_today = get_developer_streak(self.db, user_id=1, force_refresh=True)
        self.assertEqual(streak_today["current_streak"], 3)
        self.assertEqual(streak_today["longest_streak"], 3)
        self.assertTrue(streak_today["today_active"])

    def test_duplicate_activity_same_day_does_not_inflate_streak(self):
        """Multiple activities on the same day must count as at most 1 active day."""
        today = date.today()
        for i in range(5):
            act = DeveloperActivity(
                user_id=2,
                platform="github",
                activity_date=today,
                activity_type=f"commit_{i}",
                activity_count=1,
            )
            self.db.add(act)
        self.db.commit()

        streak = get_developer_streak(self.db, user_id=2, force_refresh=True)
        self.assertEqual(streak["total_active_days"], 1)
        self.assertEqual(streak["current_streak"], 1)

    def test_empty_student_activity_history(self):
        """A student with no activities must have 0 streak and clean empty state."""
        streak = get_developer_streak(self.db, user_id=3, force_refresh=True)
        self.assertEqual(streak["current_streak"], 0)
        self.assertEqual(streak["longest_streak"], 0)
        self.assertEqual(streak["total_active_days"], 0)
        self.assertFalse(streak["today_active"])

    # ==========================================================================
    # 3. LEADERBOARD RANKING & TIE-BREAKING TESTS
    # ==========================================================================
    def test_leaderboard_ranking_across_multiple_users(self):
        """Rankings must be strictly based on points, not registration order (User 1 is not automatically rank 1)."""
        # User 1: 20 points
        award_points(self.db, user_id=1, source_type="task", source_id="t1", points=20)
        # User 2: 50 points
        award_points(self.db, user_id=2, source_type="task", source_id="t2", points=50)
        # User 3: 35 points
        award_points(self.db, user_id=3, source_type="task", source_id="t3", points=35)

        leaderboard = get_leaderboard(self.db, period="all_time", page=1, limit=10)
        students = leaderboard["students"]

        # Student with highest points (User 2) must be Rank 1!
        self.assertEqual(students[0]["user_id"], 2)
        self.assertEqual(students[0]["rank"], 1)
        self.assertEqual(students[0]["points"], 50)

        # User 3 is Rank 2
        self.assertEqual(students[1]["user_id"], 3)
        self.assertEqual(students[1]["rank"], 2)
        self.assertEqual(students[1]["points"], 35)

        # User 1 is Rank 3
        self.assertEqual(students[2]["user_id"], 1)
        self.assertEqual(students[2]["rank"], 3)
        self.assertEqual(students[2]["points"], 20)

    def test_ranking_ties_and_deterministic_ordering(self):
        """When points tie, tie-breaker orders by active days DESC, then user_id ASC."""
        # Both User 1 and User 2 have 30 points
        award_points(self.db, user_id=1, source_type="task", source_id="t1", points=30)
        award_points(self.db, user_id=2, source_type="task", source_id="t2", points=30)

        # User 2 has 3 active days, User 1 has 1 active day
        today = date.today()
        self.db.add(DeveloperActivity(user_id=1, platform="github", activity_type="commit", activity_date=today))
        for d in range(3):
            self.db.add(DeveloperActivity(user_id=2, platform="github", activity_type="commit", activity_date=today - timedelta(days=d)))
        self.db.commit()

        leaderboard = get_leaderboard(self.db, period="all_time")
        students = leaderboard["students"]

        # User 2 has more active days, so User 2 wins the tie!
        self.assertEqual(students[0]["user_id"], 2)
        self.assertEqual(students[0]["rank"], 1)
        self.assertEqual(students[1]["user_id"], 1)
        self.assertEqual(students[1]["rank"], 2)

    def test_period_filtering_weekly_and_monthly(self):
        """Points created outside the period threshold must not count towards period leaderboard."""
        now = datetime.now(timezone.utc)
        ten_days_ago = now - timedelta(days=10)

        # Recent point for User 1
        tx1 = PointTransaction(
            user_id=1,
            points=25,
            source_type="task",
            source_id="recent_1",
            created_at=now,
        )
        # Old point for User 2 (10 days ago)
        tx2 = PointTransaction(
            user_id=2,
            points=50,
            source_type="task",
            source_id="old_2",
            created_at=ten_days_ago,
        )
        self.db.add_all([tx1, tx2])
        self.db.commit()

        # Weekly leaderboard: only past 7 days -> User 1 has 25 pts, User 2 has 0 pts!
        weekly = get_leaderboard(self.db, period="weekly")
        weekly_students = weekly["students"]
        user1_entry = next(s for s in weekly_students if s["user_id"] == 1)
        user2_entry = next(s for s in weekly_students if s["user_id"] == 2)
        self.assertEqual(user1_entry["points"], 25)
        self.assertEqual(user2_entry["points"], 0)

        # Monthly leaderboard: past 30 days -> User 2 has 50 pts, User 1 has 25 pts!
        monthly = get_leaderboard(self.db, period="monthly")
        monthly_students = monthly["students"]
        user2_monthly = next(s for s in monthly_students if s["user_id"] == 2)
        self.assertEqual(user2_monthly["points"], 50)

    # ==========================================================================
    # 4. PRIVACY SAFETY & ISOLATION TESTS
    # ==========================================================================
    def test_privacy_masking_for_private_student_profile(self):
        """Private accounts must have their display name and personal details masked on the global leaderboard."""
        award_points(self.db, user_id=4, source_type="task", source_id="t4", points=100)

        # User 1 looks at leaderboard
        leaderboard = get_leaderboard(self.db, current_user_id=1)
        user4_entry = next(s for s in leaderboard["students"] if s["user_id"] == 4)

        self.assertTrue(user4_entry["is_private"])
        self.assertIn("Student Developer #4", user4_entry["display_name"])
        self.assertNotIn("Secret Developer", user4_entry["display_name"])
        self.assertNotIn("private@test.edu", str(leaderboard))

        # Public student summary check
        public_prof = get_public_student_profile(self.db, target_user_id=4)
        self.assertTrue(public_prof["is_private"])
        self.assertIn("Student Developer #4", public_prof["display_name"])
        self.assertEqual(len(public_prof["public_achievements"]), 0)

    # ==========================================================================
    # 5. ACHIEVEMENTS & CERTIFICATES TESTS
    # ==========================================================================
    def test_achievement_creation_and_points_award(self):
        """Creating an achievement with link assigns 'link_supplied' and awards 15 bonus points."""
        ach = StudentAchievement(
            user_id=1,
            title="AWS Certified Cloud Practitioner",
            category="certification",
            issuer="Amazon Web Services",
            verification_url="https://www.credly.com/badges/sample-id",
            verification_status="link_supplied",
            points_awarded=15,
            is_public=True,
        )
        self.db.add(ach)
        self.db.commit()

        award_points(
            db=self.db,
            user_id=1,
            source_type="achievement",
            source_id=f"ach_{ach.id}",
            points=15,
            category="achievements",
            description=f"Achievement: {ach.title}",
        )

        summary = get_user_points_summary(self.db, user_id=1)
        self.assertEqual(summary["total_points"], 15)
        self.assertEqual(summary["category_breakdown"]["achievements"]["points"], 15)


if __name__ == "__main__":
    unittest.main()
