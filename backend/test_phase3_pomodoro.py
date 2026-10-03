import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.services.pomodoro_service import (
    start_pomodoro_session,
    pause_pomodoro_session,
    resume_pomodoro_session,
    complete_pomodoro_session,
    cancel_pomodoro_session,
    get_active_pomodoro_session,
    get_pomodoro_stats,
    get_pomodoro_history,
)
from app.services.dashboard_service import get_dashboard_overview

def run_pomodoro_e2e_tests():
    print("==================================================")
    print("STARTING PHASE 3 POMODORO & FOCUS SUITE VALIDATION")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Fetch primary test user (Keerthzz / id=1)
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("[FAIL] User Keerthzz not found in database.")
            return
        print(f"[PASS] Identified test user: id={user.id}, username='{user.username}'")

        # 2. Find or create a test task for linking
        task = db.query(Task).filter(Task.user_id == user.id).first()
        task_id = task.id if task else None
        print(f"[PASS] Using task for linking: id={task_id}, title='{task.title if task else 'None'}'")

        # 3. Test Session Start
        start_session = start_pomodoro_session(
            db=db,
            user_id=user.id,
            task_id=task_id,
            session_type="focus",
            planned_duration_seconds=1500,
            cycle_number=1,
        )
        print(f"[PASS] Session Started: id={start_session['id']}, status={start_session['status']}, type={start_session['session_type']}")
        assert start_session["status"] == "running"
        assert start_session["user_id"] == user.id

        # 4. Test Session Active Retrieval
        active = get_active_pomodoro_session(db, user.id)
        assert active is not None
        assert active["id"] == start_session["id"]
        print(f"[PASS] Active session retrieval confirmed: active_id={active['id']}")

        # 5. Test Session Pause
        paused = pause_pomodoro_session(db, user.id, start_session["id"], elapsed_seconds=300)
        assert paused is not None
        assert paused["status"] == "paused"
        assert paused["actual_duration_seconds"] == 300
        print(f"[PASS] Session Paused: id={paused['id']}, status={paused['status']}, actual_duration={paused['actual_duration_seconds']}s")

        # 6. Test Session Resume
        resumed = resume_pomodoro_session(db, user.id, start_session["id"])
        assert resumed is not None
        assert resumed["status"] == "running"
        print(f"[PASS] Session Resumed: id={resumed['id']}, status={resumed['status']}")

        # 7. Test Session Complete & DeveloperActivity Integration
        completed = complete_pomodoro_session(
            db=db,
            user_id=user.id,
            session_id=start_session["id"],
            actual_duration_seconds=1500,
        )
        assert completed is not None
        assert completed["status"] == "completed"
        assert completed["actual_duration_seconds"] == 1500
        print(f"[PASS] Session Completed: id={completed['id']}, status={completed['status']}, actual_duration={completed['actual_duration_seconds']}s")

        # 8. Verify DeveloperActivity Record
        latest_act = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.user_id == user.id,
                DeveloperActivity.platform == "pomodoro",
                DeveloperActivity.activity_type == "focus_session",
            )
            .order_by(DeveloperActivity.id.desc())
            .first()
        )
        assert latest_act is not None
        assert latest_act.duration_seconds >= 1500
        print(f"[PASS] DeveloperActivity Focus Record verified: id={latest_act.id}, platform='{latest_act.platform}', duration={latest_act.duration_seconds}s")

        # 9. Verify Pomodoro Stats
        stats = get_pomodoro_stats(db, user.id)
        print(f"[PASS] Pomodoro Stats verified:")
        print(f"       Today Sessions: {stats['today_sessions_completed']}")
        print(f"       Today Focus Secs: {stats['today_focus_seconds']}s ({round(stats['today_focus_seconds']/60, 1)}m)")
        print(f"       Daily Goal Secs: {stats['daily_goal_seconds']}s")
        print(f"       Daily Goal %: {stats['goal_progress_percent']}%")
        print(f"       Avg Session Mins: {stats['avg_session_duration_minutes']}m")
        print(f"       7-Day Trend Points: {len(stats['weekly_trend'])}")
        assert stats["today_sessions_completed"] >= 1
        assert stats["today_focus_seconds"] >= 1500

        # 10. Verify Pomodoro History
        history = get_pomodoro_history(db, user.id, limit=10)
        assert len(history) >= 1
        first_hist = history[0]
        assert first_hist["id"] == start_session["id"]
        assert first_hist["status"] == "completed"
        if task:
            assert first_hist["task_title"] == task.title
        print(f"[PASS] Pomodoro History verified: {len(history)} records, latest task='{first_hist['task_title']}'")

        # 11. Verify Dashboard Overview Integration
        dashboard_data = get_dashboard_overview(db, user.id)
        assert "today_summary" in dashboard_data
        focus_secs = dashboard_data["today_summary"]["focus_seconds"]
        prod_score = dashboard_data["today_summary"]["productivity_score"]
        print(f"[PASS] Dashboard Overview confirmed Pomodoro focus integration:")
        print(f"       Dashboard Focus Seconds Today: {focus_secs}s ({round(focus_secs/60, 1)}m)")
        print(f"       Dashboard Productivity Score: {prod_score}")
        print(f"       Score Breakdown: {dashboard_data['today_summary']['score_breakdown']}")

        # 12. Verify User Isolation / Security Check
        fake_user_pause = pause_pomodoro_session(db, user_id=9999, session_id=start_session["id"], elapsed_seconds=50)
        assert fake_user_pause is None
        print("[PASS] User Isolation verified: User 9999 cannot access or modify User 1's sessions.")

        print("==================================================")
        print("ALL PHASE 3 SUITE TESTS PASSED SUCCESSFULLY! (100%)")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    run_pomodoro_e2e_tests()
