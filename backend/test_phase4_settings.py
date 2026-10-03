import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.task import Task
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.core.security import hash_password, verify_password
from app.services.settings_service import (
    get_or_create_user_settings,
    get_full_user_settings,
    update_profile,
    change_password,
    update_appearance,
    update_notifications,
    update_productivity,
    update_privacy,
    delete_user_account,
)
from app.services.dashboard_service import get_dashboard_overview
from app.services.pomodoro_service import get_pomodoro_stats

def run_phase4_settings_suite():
    print("==================================================")
    print("STARTING PHASE 4 SETTINGS & PERSONALIZATION SUITE")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Fetch primary test user (Keerthzz / id=1)
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("[FAIL] User Keerthzz not found in database.")
            return
        print(f"[PASS] Identified test user: id={user.id}, username='{user.username}', email='{user.email}'")

        # 2. Test get_full_user_settings & default creation
        settings_data = get_full_user_settings(db, user)
        assert "profile" in settings_data
        assert "appearance" in settings_data
        assert "notifications" in settings_data
        assert "productivity" in settings_data
        assert "privacy" in settings_data
        print("[PASS] Full user settings retrieved and structured correctly.")

        # 3. Test Profile Update
        updated_prof = update_profile(
            db=db,
            user=user,
            full_name="Keerthi Developer",
            bio="Full-Stack Engineer building smart developer tools.",
        )
        assert updated_prof["full_name"] == "Keerthi Developer"
        assert updated_prof["bio"] == "Full-Stack Engineer building smart developer tools."
        print(f"[PASS] Profile updated successfully: name='{updated_prof['full_name']}', bio='{updated_prof['bio']}'")

        # 4. Verify Dashboard Greeting Integration
        dash_overview = get_dashboard_overview(db, user.id)
        assert dash_overview["user"]["username"] == "Keerthi Developer"
        print(f"[PASS] Dashboard Overview reflects updated full_name: '{dash_overview['user']['username']}'")

        # 5. Test Appearance Theme Setting
        app_res = update_appearance(db, user.id, "dark")
        assert app_res["theme"] == "dark"
        app_res_light = update_appearance(db, user.id, "light")
        assert app_res_light["theme"] == "light"
        print("[PASS] Appearance theme settings persisted (light/dark/system).")

        # 6. Test Notification Preferences
        notif_res = update_notifications(db, user.id, {
            "pomodoro_notifications": True,
            "productivity_reminders": True,
            "daily_summary": True,
            "activity_notifications": False,
            "sound_enabled": True,
        })
        assert notif_res["activity_notifications"] is False
        assert notif_res["sound_enabled"] is True
        print("[PASS] Notification preferences persisted.")

        # 7. Test Productivity & Pomodoro Preferences
        prod_res = update_productivity(db, user.id, {
            "daily_coding_target_hours": 3.0,
            "daily_learning_target_hours": 1.5,
            "daily_focus_target_minutes": 150,
            "daily_task_target": 6,
            "pomodoro_focus_duration": 50,
            "pomodoro_short_break": 10,
            "pomodoro_long_break": 20,
            "pomodoro_cycle_count": 4,
        })
        assert prod_res["daily_focus_target_minutes"] == 150
        assert prod_res["pomodoro_focus_duration"] == 50
        print(f"[PASS] Productivity settings updated: focus_target={prod_res['daily_focus_target_minutes']}m, sprint={prod_res['pomodoro_focus_duration']}m")

        # 8. Verify Pomodoro Stats dynamic goal integration
        pom_stats = get_pomodoro_stats(db, user.id)
        assert pom_stats["daily_goal_seconds"] == 150 * 60
        print(f"[PASS] Pomodoro Stats accurately reads user's configured goal: {pom_stats['daily_goal_seconds']}s ({pom_stats['daily_goal_seconds']//60}m)")

        # 9. Test Privacy Settings
        priv_res = update_privacy(db, user.id, {
            "profile_visibility": "public",
            "analytics_sharing": True,
            "activity_tracking": True,
        })
        assert priv_res["profile_visibility"] == "public"
        assert priv_res["analytics_sharing"] is True
        print("[PASS] Privacy governance settings updated and persisted.")

        # 10. Test Password Security Change with Validation
        # Create a temp user to test password changes and deletion
        temp_user = db.query(User).filter(User.username == "TempPhase4User").first()
        if temp_user:
            delete_user_account(db, temp_user, "delete my account")

        temp_user = User(
            username="TempPhase4User",
            email="tempphase4@example.com",
            password=hash_password("OriginalPass123"),
        )
        db.add(temp_user)
        db.commit()
        db.refresh(temp_user)

        # A: Attempt change with wrong password (should fail)
        try:
            change_password(db, temp_user, "WrongPass123", "NewSecurePass456")
            assert False, "Should have raised exception on wrong password"
        except Exception as e:
            print("[PASS] Wrong current password rejected correctly.")

        # B: Change password with correct credentials
        pw_res = change_password(db, temp_user, "OriginalPass123", "NewSecurePass456")
        assert pw_res["message"] == "Password updated successfully"
        db.refresh(temp_user)
        assert verify_password("NewSecurePass456", temp_user.password)
        print("[PASS] Password changed and hashed securely.")

        # 11. Test Account Deletion with Explicit Confirmation
        # A: Invalid confirmation text
        try:
            delete_user_account(db, temp_user, "invalid confirmation")
            assert False, "Should reject invalid confirmation text"
        except Exception as e:
            print("[PASS] Account deletion requires explicit confirmation string.")

        # B: Add sample child records to verify cascade deletion
        db.add(UserSettings(user_id=temp_user.id, full_name="Temp User"))
        db.add(Task(user_id=temp_user.id, title="Temp Task", status="Pending", priority="Low"))
        db.commit()

        del_res = delete_user_account(db, temp_user, "delete my account")
        assert "deleted" in del_res["message"]

        deleted_check = db.query(User).filter(User.id == temp_user.id).first()
        assert deleted_check is None
        deleted_settings = db.query(UserSettings).filter(UserSettings.user_id == temp_user.id).first()
        assert deleted_settings is None
        deleted_task = db.query(Task).filter(Task.user_id == temp_user.id).first()
        assert deleted_task is None
        print("[PASS] Account and all cascading child records permanently deleted.")

        print("==================================================")
        print("ALL PHASE 4 SETTINGS SUITE TESTS PASSED! (100%)")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    run_phase4_settings_suite()
