import sys
import asyncio

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from datetime import date, datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.developer_activity import DeveloperActivity
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.services.platform_sync_service import platform_sync_service
from app.services.unified_activity_service import (
    get_unified_activities,
    get_activity_summary,
    record_unified_activity,
)
from app.services.dashboard_service import get_dashboard_stats


async def run_tests():
    db: Session = SessionLocal()
    try:
        print("=== RUNNING PHASE 6 DYNAMIC SYNC TESTS ===")
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("❌ User Keerthzz not found!")
            sys.exit(1)

        user_id = user.id
        print(f"Testing with User ID: {user_id} ({user.username})")

        # 1. Test get_sync_status
        print("\n--- 1. Testing get_sync_status ---")
        status = platform_sync_service.get_sync_status(db, user_id)
        assert "platforms" in status, "Status must have 'platforms'"
        assert "github" in status["platforms"], "GitHub must be in platforms"
        assert "leetcode" in status["platforms"], "LeetCode must be in platforms"
        assert "coursera" in status["platforms"], "Coursera must be in platforms"
        assert "nptel" in status["platforms"], "NPTEL must be in platforms"
        assert "linkedin" in status["platforms"], "LinkedIn must be in platforms"
        assert "naukri" in status["platforms"], "Naukri must be in platforms"
        print("✓ get_sync_status returns complete platform matrix:")
        for k, v in status["platforms"].items():
            print(f"   [{k}] Sync Mode: {v['sync_mode']} | Connected: {v['connected']}")

        # 2. Test Platform Synchronization Execution
        print("\n--- 2. Testing sync_all Execution ---")
        # Reset cooldown for testing
        platform_sync_service._user_last_sync.pop(user_id, None)
        sync_res = await platform_sync_service.sync_all(db, user_id)
        print("✓ sync_all returned status:", sync_res.get("status"))
        assert sync_res.get("status") == "success", f"Sync failed: {sync_res}"
        assert "results" in sync_res, "Results dict must be returned"
        print(f"✓ Synced platforms. Total new: {sync_res.get('total_new_activities', 0)}")
        for plat, res in sync_res["results"].items():
            print(f"   [{plat}] Status: {res.get('status')} | SyncType: {res.get('sync_type')} | New: {res.get('new_activities')} | Msg: {res.get('message', res.get('error'))}")

        # 3. Test Deduplication
        print("\n--- 3. Testing Deduplication ---")
        # Reset cooldown so we can trigger immediate 2nd sync
        platform_sync_service._user_last_sync.pop(user_id, None)
        sync_res2 = await platform_sync_service.sync_all(db, user_id)
        # Second sync should produce 0 new duplicates for existing external IDs
        print(f"✓ Second sync completed. Total new: {sync_res2.get('total_new_activities', 0)}")
        assert sync_res2.get("total_new_activities", 0) == 0, "Duplicate records were created on second sync!"
        print("✓ Strict deduplication verified: 0 duplicate records inserted on repeated sync.")

        # 4. Test Error Isolation (Provider Exception Handling)
        print("\n--- 4. Testing Provider Error Isolation ---")
        # Simulate a provider with an exception
        class FailingMockProvider:
            sync_mode = "automatic"
            async def sync(self, db, uid):
                raise RuntimeError("Simulated network outage 503")

        orig_gh = platform_sync_service.providers["github"]
        platform_sync_service.providers["github"] = FailingMockProvider()
        platform_sync_service._user_last_sync.pop(user_id, None)

        isolated_res = await platform_sync_service.sync_all(db, user_id)
        assert isolated_res.get("status") == "success", "Overall sync should succeed even if one provider fails"
        assert isolated_res["results"]["github"]["status"] == "error", "GitHub provider should be marked as error"
        assert isolated_res["results"]["coursera"]["status"] == "manual_only", "Coursera should still evaluate normally"
        print("✓ Provider error isolation verified: Failing provider was isolated without affecting others.")
        # Restore provider
        platform_sync_service.providers["github"] = orig_gh

        # 5. Test Privacy Settings Enforcement
        print("\n--- 5. Testing Privacy Preference Enforcement ---")
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if settings:
            orig_setting = settings.activity_tracking
            settings.activity_tracking = False
            db.commit()

            platform_sync_service._user_last_sync.pop(user_id, None)
            privacy_res = await platform_sync_service.sync_all(db, user_id)
            print("✓ Privacy disabled response:", privacy_res)
            assert privacy_res.get("status") == "disabled", "Sync should be disabled when activity_tracking=False"
            assert "Activity collection is disabled" in privacy_res.get("message", "")

            # Restore original setting
            settings.activity_tracking = orig_setting
            db.commit()
            print("✓ Privacy enforcement verified: Sync rejected when disabled.")

        # 6. Test Dashboard and Summary Integration
        print("\n--- 6. Testing Dashboard & Unified Activity Query Integration ---")
        dash = get_dashboard_stats(db, user_id)
        assert "overall_score" in dash or "total_tasks" in dash, f"Dashboard data keys: {list(dash.keys())}"
        summary = get_activity_summary(db, user_id)
        assert "today" in summary, "Activity summary loaded"
        assert "weekly" in summary, "Activity weekly breakdown loaded"
        print(f"✓ Unified Summary: Today Total Activities = {summary['today']['total_activities']}")
        print(f"   Coding: {summary['today']['coding']['formatted']} ({summary['today']['coding']['count']} events)")
        print(f"   Problem Solving: {summary['today']['problem_solving']['formatted']} ({summary['today']['problem_solving']['count']} events)")
        print(f"   Learning: {summary['today']['learning']['formatted']} ({summary['today']['learning']['count']} events)")

        print("\n✅ ALL PHASE 6 AUTOMATED TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
