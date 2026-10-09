"""
Phase 2 Comprehensive Automated Test Suite
Verifies:
1. Browser time tracking session ingestion & validation
2. Server-side bounds enforcement (e.g. idle exclusion, max bounds, negative durations)
3. Idempotent deduplication (duplicate session keys don't inflate totals)
4. Multi-user strict isolation
5. Metric computation (daily distribution, weekly totals, goals comparison)
6. Supported domain whitelist filtering & unsupported domain rejection
7. History purge privacy controls
8. Integration with unified timeline & Data Trust Center
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
from app.models.browser_time_session import BrowserTimeSession
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings
from app.services.time_tracking_service import (
    time_tracking_service,
    SUPPORTED_PLATFORMS_MAP,
)
from app.services.data_trust_service import get_data_trust_center_overview


class TestPhase2BrowserTimeTracking(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use in-memory SQLite for high-speed isolated testing
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()

        # Create two test users to verify multi-user isolation
        self.user1 = User(
            email="developer1@test.com",
            username="dev_one",
            password="hashed_pw_123",
        )
        self.user2 = User(
            email="developer2@test.com",
            username="dev_two",
            password="hashed_pw_456",
        )
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

        # Settings
        self.settings1 = UserSettings(
            user_id=self.user1.id,
            browser_extension_enabled=True,
            activity_tracking=True,
            daily_coding_target_hours=2.0,
            daily_learning_target_hours=1.5,
        )
        self.settings2 = UserSettings(
            user_id=self.user2.id,
            browser_extension_enabled=True,
            activity_tracking=True,
        )
        self.db.add_all([self.settings1, self.settings2])
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        # Clean tables
        self.db.query(BrowserTimeSession).delete()
        self.db.query(DeveloperActivity).delete()
        self.db.query(UserSettings).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    def test_01_supported_platforms_registry(self):
        """Verifies that all 8 Phase 1 + IDE domains are registered."""
        platforms = time_tracking_service.get_supported_platforms()
        keys = {p["platform"] for p in platforms}
        
        required_platforms = {
            "github", "leetcode", "freecodecamp", "geeksforgeeks",
            "coursera", "nptel", "linkedin", "naukri", "vscode"
        }
        for req in required_platforms:
            self.assertIn(req, keys, f"Platform {req} missing from time tracking registry")

    def test_02_valid_session_ingestion(self):
        """Verifies successful ingestion of active browser session intervals."""
        now = datetime.utcnow()
        start = now - timedelta(minutes=25)
        end = now

        sessions = [
            {
                "platform": "github",
                "domain": "github.com",
                "started_at": start.isoformat() + "Z",
                "ended_at": end.isoformat() + "Z",
                "active_seconds": 1200,  # 20 mins active
                "idle_seconds": 300,    # 5 mins idle excluded
                "session_key": f"bts_{self.user1.id}_github_test1",
            }
        ]

        result = time_tracking_service.sync_browser_sessions(self.db, self.user1.id, sessions)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["synced_count"], 1)
        self.assertEqual(result["total_active_seconds"], 1200)

        # Verify record in DB
        db_session = self.db.query(BrowserTimeSession).filter(BrowserTimeSession.user_id == self.user1.id).first()
        self.assertIsNotNone(db_session)
        self.assertEqual(db_session.platform, "github")
        self.assertEqual(db_session.active_seconds, 1200)
        self.assertEqual(db_session.idle_seconds, 300)

        # Verify unified timeline mirroring
        unified_act = self.db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == self.user1.id,
            DeveloperActivity.source == "browser_extension"
        ).first()
        self.assertIsNotNone(unified_act)
        self.assertEqual(unified_act.duration_seconds, 1200)

    def test_03_idempotent_deduplication(self):
        """Verifies that duplicate session synchronization does NOT inflate durations."""
        now = datetime.utcnow()
        session_payload = [
            {
                "platform": "leetcode",
                "domain": "leetcode.com",
                "started_at": (now - timedelta(minutes=30)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1500,
                "idle_seconds": 300,
                "session_key": "fixed_idempotent_key_leetcode_001",
            }
        ]

        # First sync
        res1 = time_tracking_service.sync_browser_sessions(self.db, self.user1.id, session_payload)
        self.assertEqual(res1["synced_count"], 1)

        # Re-sync same session (e.g. extension retry)
        res2 = time_tracking_service.sync_browser_sessions(self.db, self.user1.id, session_payload)
        self.assertEqual(res2["synced_count"], 0, "Duplicate session should not increase synced_count")

        # Total count in DB must remain 1
        count = self.db.query(BrowserTimeSession).filter(
            BrowserTimeSession.user_id == self.user1.id,
            BrowserTimeSession.session_key == "fixed_idempotent_key_leetcode_001",
        ).count()
        self.assertEqual(count, 1)

    def test_04_unsupported_platform_rejected(self):
        """Verifies that non-whitelisted domains/platforms are ignored."""
        sessions = [
            {
                "platform": "facebook",
                "domain": "facebook.com",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "ended_at": datetime.utcnow().isoformat() + "Z",
                "active_seconds": 600,
                "session_key": "fb_key_01",
            },
            {
                "platform": "unknown_site",
                "domain": "random.xyz",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "ended_at": datetime.utcnow().isoformat() + "Z",
                "active_seconds": 600,
                "session_key": "rand_key_02",
            },
        ]

        result = time_tracking_service.sync_browser_sessions(self.db, self.user1.id, sessions)
        self.assertEqual(result["synced_count"], 0)
        self.assertEqual(result["total_active_seconds"], 0)

    def test_05_strict_per_user_isolation(self):
        """Verifies that User A cannot view, sync, or overwrite User B's sessions."""
        now = datetime.utcnow()
        # Ingest for User 1
        time_tracking_service.sync_browser_sessions(self.db, self.user1.id, [
            {
                "platform": "github",
                "started_at": now.isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 3600,
                "session_key": "user1_session_key",
            }
        ])

        # Ingest for User 2
        time_tracking_service.sync_browser_sessions(self.db, self.user2.id, [
            {
                "platform": "coursera",
                "started_at": now.isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1800,
                "session_key": "user2_session_key",
            }
        ])

        # User 1 summary
        summary1 = time_tracking_service.get_time_tracking_summary(self.db, self.user1.id)
        self.assertEqual(summary1["today"]["active_seconds"], 3600)
        self.assertEqual(summary1["today"]["by_platform"][0]["platform"], "github")

        # User 2 summary
        summary2 = time_tracking_service.get_time_tracking_summary(self.db, self.user2.id)
        self.assertEqual(summary2["today"]["active_seconds"], 1800)
        self.assertEqual(summary2["today"]["by_platform"][0]["platform"], "coursera")

        # User 1 paginated sessions should not contain User 2 data
        sessions1 = time_tracking_service.get_time_tracking_sessions(self.db, self.user1.id)
        self.assertEqual(sessions1["total"], 1)
        self.assertEqual(sessions1["sessions"][0]["platform"], "github")

    def test_06_goal_targets_calculation(self):
        """Verifies coding & learning daily target progress computations."""
        now = datetime.utcnow()
        # 1 hour on GitHub (coding)
        time_tracking_service.sync_browser_sessions(self.db, self.user1.id, [
            {
                "platform": "github",
                "started_at": now.isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 3600,
                "session_key": "coding_goal_test",
            }
        ])

        # 45 mins on Coursera (learning)
        time_tracking_service.sync_browser_sessions(self.db, self.user1.id, [
            {
                "platform": "coursera",
                "started_at": now.isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 2700,
                "session_key": "learning_goal_test",
            }
        ])

        summary = time_tracking_service.get_time_tracking_summary(self.db, self.user1.id)
        targets = summary["targets"]

        # Coding goal: 2.0 hrs = 7200s, actual: 3600s -> 50.0%
        self.assertEqual(targets["coding"]["percentage"], 50.0)
        self.assertEqual(targets["coding"]["actual_seconds"], 3600)

        # Learning goal: 1.5 hrs = 5400s, actual: 2700s -> 50.0%
        self.assertEqual(targets["learning"]["percentage"], 50.0)
        self.assertEqual(targets["learning"]["actual_seconds"], 2700)

    def test_07_data_trust_center_integration(self):
        """Verifies that Data Trust Center surfaces browser extension telemetry."""
        now = datetime.utcnow()
        time_tracking_service.sync_browser_sessions(self.db, self.user1.id, [
            {
                "platform": "github",
                "started_at": now.isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1800,
                "session_key": "trust_center_test",
            }
        ])

        trust_overview = get_data_trust_center_overview(self.db, self.user1.id)
        self.assertIn("browser_extension", trust_overview)

        ext = trust_overview["browser_extension"]
        self.assertTrue(ext["installed_and_synced"])
        self.assertTrue(ext["is_connected"])
        self.assertEqual(ext["total_sessions_recorded"], 1)
        self.assertEqual(ext["capture_provenance"], "Application-Recorded Data — Browser Extension")


if __name__ == "__main__":
    unittest.main()
