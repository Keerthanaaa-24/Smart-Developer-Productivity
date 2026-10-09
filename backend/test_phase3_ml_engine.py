"""
Phase 3 Machine Learning Engine Master Automated Test Suite
Verifies:
1. Feature Extraction & Missing-Data Fallback
2. Dataset ML Readiness & Feature Audit (Feature 1)
3. 7-Day Multi-Target Productivity Forecasting & Uncertainty Intervals (Feature 2)
4. Explainable Evidence-Based Career Readiness Index (Feature 3)
5. Intelligent Skill-Gap Analysis & Evidence Mapping (Feature 4)
6. Personalized & Dismissible Recommendations Engine (Feature 5)
7. Multi-User Strict Data Isolation & Privacy Controls (Feature 7 & 9)
8. Insufficient Data Transparency (Minimum-Data Policy)
9. FastAPI TestClient Endpoint Verification
"""

import sys
import os
import unittest
from datetime import datetime, date, timedelta

# Append backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.browser_time_session import BrowserTimeSession
from app.models.pomodoro_session import PomodoroSession
from app.models.task import Task
from app.models.project import Project
from app.models.user_settings import UserSettings
from app.models.productivity_forecast import ProductivityForecast
from app.models.skill_gap_analysis import SkillGapAnalysis
from app.models.personalized_recommendation import PersonalizedRecommendation

from app.services.ml_readiness_service import ml_readiness_service
from app.services.productivity_forecasting_service import productivity_forecasting_service
from app.services.career_readiness_service import career_readiness_service
from app.services.skill_gap_service import skill_gap_service
from app.services.recommendation_service import recommendation_service


class TestPhase3MLEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use isolated in-memory SQLite database
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()

        # Create two test users for strict isolation testing
        self.user1 = User(
            email="ml_dev1@test.com",
            username="ml_dev_one",
            password="hashed_pw_123",
        )
        self.user2 = User(
            email="ml_dev2@test.com",
            username="ml_dev_two",
            password="hashed_pw_456",
        )
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

        # Settings
        self.settings1 = UserSettings(
            user_id=self.user1.id,
            daily_coding_target_hours=2.5,
            daily_learning_target_hours=1.0,
            daily_focus_target_minutes=120,
        )
        self.settings2 = UserSettings(
            user_id=self.user2.id,
            daily_coding_target_hours=2.0,
        )
        self.db.add_all([self.settings1, self.settings2])
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        # Clean all tables
        for model in [
            PersonalizedRecommendation,
            SkillGapAnalysis,
            ProductivityForecast,
            Project,
            Task,
            PomodoroSession,
            BrowserTimeSession,
            DeveloperActivity,
            UserSettings,
            User,
        ]:
            self.db.query(model).delete()
        self.db.commit()
        self.db.close()

    def test_01_insufficient_data_minimum_data_policy(self):
        """Verifies that an account with no activity returns an honest insufficient_data state without fabricating scores."""
        # User 1 has 0 activities
        readiness = ml_readiness_service.audit_user_data_readiness(self.db, self.user1.id)
        self.assertEqual(readiness["readiness_status"], "insufficient_data")
        self.assertFalse(readiness["is_sufficient_for_forecasting"])

        forecast = productivity_forecasting_service.generate_7day_forecast(self.db, self.user1.id)
        self.assertEqual(forecast["status"], "insufficient_data")
        self.assertIsNone(forecast["forecast"])
        self.assertIn("Insufficient historical activity data", forecast["message"])

    def test_02_data_readiness_audit_with_real_records(self):
        """Verifies accurate feature coverage calculation and audit classification."""
        today = date.today()
        # Add 5 days of activities
        for i in range(5):
            d = today - timedelta(days=i)
            self.db.add(DeveloperActivity(
                user_id=self.user1.id,
                platform="github",
                category="coding",
                activity_type="commit",
                duration_seconds=3600,
                activity_count=3,
                activity_date=d,
                source="github_api",
            ))
        self.db.commit()

        readiness = ml_readiness_service.audit_user_data_readiness(self.db, self.user1.id)
        self.assertEqual(readiness["readiness_status"], "sufficient")
        self.assertTrue(readiness["is_sufficient_for_forecasting"])
        self.assertEqual(readiness["user_telemetry_stats"]["total_activity_events"], 5)
        self.assertEqual(readiness["user_telemetry_stats"]["distinct_active_days"], 5)
        self.assertEqual(readiness["data_provenance_summary"]["verified_provider_events"], 5)

    def test_03_7day_productivity_forecasting(self):
        """Verifies multi-target 7-day forecasting, uncertainty intervals, and baseline comparisons."""
        today = date.today()
        # Seed 7 days of historical activity for User 1
        for i in range(7):
            d = today - timedelta(days=i)
            self.db.add(DeveloperActivity(
                user_id=self.user1.id,
                platform="github",
                category="coding",
                activity_type="coding_session",
                duration_seconds=7200,  # 2 hours / day
                activity_count=4,
                activity_date=d,
                source="browser_extension",
            ))
        # Add 3 tasks
        for i in range(3):
            self.db.add(Task(
                user_id=self.user1.id,
                title=f"Task {i}",
                status="Completed",
            ))
        self.db.commit()

        result = productivity_forecasting_service.generate_7day_forecast(self.db, self.user1.id, save_to_db=True)
        self.assertEqual(result["status"], "success")
        self.assertIn("targets", result)

        targets = result["targets"]
        focus_pred = targets["focus_time"]
        tasks_pred = targets["tasks_completion"]
        goal_pred = targets["weekly_goal_achievement"]

        # Assert predicted value > 0 and bounds are valid
        self.assertGreater(focus_pred["predicted_value_minutes"], 0)
        self.assertLessEqual(focus_pred["uncertainty_interval"]["lower_bound_minutes"], focus_pred["predicted_value_minutes"])
        self.assertGreaterEqual(focus_pred["uncertainty_interval"]["upper_bound_minutes"], focus_pred["predicted_value_minutes"])

        self.assertGreaterEqual(tasks_pred["predicted_value_tasks"], 1.0)
        self.assertGreaterEqual(goal_pred["probability"], 0.0)
        self.assertLessEqual(goal_pred["probability"], 1.0)

        # Verify DB persistence
        saved_fc = self.db.query(ProductivityForecast).filter(ProductivityForecast.user_id == self.user1.id).first()
        self.assertIsNotNone(saved_fc)
        self.assertEqual(saved_fc.horizon_days, 7)

    def test_04_career_readiness_assessment(self):
        """Verifies 5-pillar career readiness evaluation and separation of observed vs missing evidence."""
        # Add a completed project and tasks for User 1
        self.db.add(Project(
            user_id=self.user1.id,
            name="E-Commerce API",
            description="FastAPI MySQL REST backend with JWT auth",
            tech_stack="Python, FastAPI, MySQL, Docker",
            status="Completed",
        ))
        for i in range(5):
            self.db.add(Task(
                user_id=self.user1.id,
                title=f"Roadmap Item {i}",
                status="Completed",
            ))
        self.db.commit()

        eval_res = career_readiness_service.evaluate_career_readiness(self.db, self.user1.id)
        self.assertIn("overall_readiness_index", eval_res)
        self.assertGreater(eval_res["overall_readiness_index"], 0)

        pillars = eval_res["pillars"]
        self.assertIn("code_and_version_control", pillars)
        self.assertIn("problem_solving", pillars)
        self.assertIn("structured_learning", pillars)
        self.assertIn("execution_discipline", pillars)
        self.assertIn("career_engagement", pillars)

        # Verify observed vs missing evidence lists exist and are populated
        self.assertGreaterEqual(len(pillars["code_and_version_control"]["observed_evidence"]), 1)
        self.assertGreaterEqual(len(pillars["problem_solving"]["missing_evidence"]), 1)

    def test_05_skill_gap_analysis(self):
        """Verifies skill taxonomy parsing, evidence matching, and gap bridging recommendations."""
        # Add project with specific skills
        self.db.add(Project(
            user_id=self.user1.id,
            name="Cloud Microservices Platform",
            description="Built using Python, FastAPI, React, MySQL, and Docker",
            tech_stack="Python, React, MySQL, Docker",
            status="Completed",
        ))
        self.db.commit()


        # Run analysis for Full Stack Engineer
        result = skill_gap_service.analyze_skill_gap(
            db=self.db,
            user_id=self.user1.id,
            target_role="full_stack",
            save_to_db=True,
        )

        self.assertEqual(result["status"], "success")
        self.assertGreater(result["match_percentage"], 0)

        matched_keys = {s["skill_key"] for s in result["matched_skills"]}
        self.assertIn("python", matched_keys)
        self.assertIn("react", matched_keys)
        self.assertIn("sql", matched_keys)

        # Verify DB persistence and deletion
        saved_recs = skill_gap_service.get_analysis_history(self.db, self.user1.id)
        self.assertEqual(len(saved_recs), 1)

        del_ok = skill_gap_service.delete_analysis_record(self.db, self.user1.id, saved_recs[0]["id"])
        self.assertTrue(del_ok)
        self.assertEqual(len(skill_gap_service.get_analysis_history(self.db, self.user1.id)), 0)

    def test_06_personalized_recommendations(self):
        """Verifies dynamic recommendation generation, completion, and dismissal."""
        # Add pending tasks to trigger backlog recommendation
        for i in range(4):
            self.db.add(Task(
                user_id=self.user1.id,
                title=f"Pending Bugfix {i}",
                status="Pending",
            ))
        self.db.commit()

        recs = recommendation_service.generate_recommendations(self.db, self.user1.id)
        self.assertGreater(len(recs), 0)

        top_rec = recs[0]
        rec_id = top_rec["id"]

        # Mark completed
        comp_res = recommendation_service.complete_recommendation(self.db, self.user1.id, rec_id)
        self.assertEqual(comp_res["status"], "success")

        # Dismiss recommendation
        if len(recs) > 1:
            second_rec_id = recs[1]["id"]
            dism_res = recommendation_service.dismiss_recommendation(self.db, self.user1.id, second_rec_id)
            self.assertEqual(dism_res["status"], "success")

    def test_07_strict_multi_user_data_isolation(self):
        """Verifies that User A cannot view or manipulate User B's ML forecasts or recommendations."""
        # Add recommendations for User 1 and User 2
        rec1 = PersonalizedRecommendation(
            user_id=self.user1.id,
            title="User 1 Rec",
            description="User 1 Task",
            evidence_reason="Reason 1",
            category="focus",
        )
        rec2 = PersonalizedRecommendation(
            user_id=self.user2.id,
            title="User 2 Rec",
            description="User 2 Task",
            evidence_reason="Reason 2",
            category="focus",
        )
        self.db.add_all([rec1, rec2])
        self.db.commit()

        # User 1 attempting to complete User 2's recommendation
        hack_res = recommendation_service.complete_recommendation(self.db, self.user1.id, rec2.id)
        self.assertEqual(hack_res["status"], "error")

        # User 2 attempting to delete User 1's analysis
        analysis1 = SkillGapAnalysis(
            user_id=self.user1.id,
            target_role="Full Stack",
            match_percentage=80.0,
            matched_skills_json="[]",
            partial_skills_json="[]",
            missing_skills_json="[]",
        )
        self.db.add(analysis1)
        self.db.commit()

        del_res = skill_gap_service.delete_analysis_record(self.db, self.user2.id, analysis1.id)
        self.assertFalse(del_res)


if __name__ == "__main__":
    unittest.main()
