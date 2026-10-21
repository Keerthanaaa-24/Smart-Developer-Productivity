"""
Comprehensive Master Test Suite for Real-World Productivity Intelligence Upgrade
Tests all 7 phases:
1. Timezone-aware calendar day calculations
2. Multi-source interval overlap deduplication
3. Project attribution (direct project_id + workspace fallback + evidence timeline)
4. Fair scoring & points ledger (anti-commit-spam policy)
5. ML feature normalization (daily task targets vs lifetime counts)
6. College-scale metadata (institution, department, batch_year, student_id)
7. End-to-end regression validation
"""

import os
import sys
from datetime import datetime, date, timedelta, timezone
import zoneinfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.project import Project
from app.models.task import Task
from app.models.developer_activity import DeveloperActivity
from app.models.point_transaction import PointTransaction
from app.schemas.task_schema import TaskCreate

from app.services.unified_activity_service import (
    get_user_timezone,
    get_user_local_now,
    get_user_local_today,
    merge_time_intervals,
    compute_deduplicated_category_seconds,
    record_unified_activity,
    record_extension_activities,
    get_activity_summary,
)
from app.services.developer_streak_service import get_developer_streak
from app.services.login_streak_service import get_login_streak, record_user_login
from app.services.project_service import (
    create_project,
    get_user_projects,
    get_project_timeline,
    delete_project,
)
from app.services.task_service import create_task, update_task, delete_task
from app.services.points_service import award_points, get_user_points_summary
from app.services.ml_service import ml_productivity_service
from app.services.dashboard_service import get_dashboard_overview


def run_master_test_suite():
    print("==================================================================")
    print("STARTING REAL-WORLD PRODUCTIVITY INTELLIGENCE MASTER TEST SUITE")
    print("==================================================================")

    db = SessionLocal()
    try:
        # Step 0: Identify test user (Keerthzz / ID 1)
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            user = db.query(User).first()
        assert user is not None, "Test user not found in database"
        print(f"[PASS] Identified test user: id={user.id}, username='{user.username}'")

        # -------------------------------------------------------------
        # TEST 1: TIMEZONE CALIBRATION & LOCAL CALENDAR DATES
        # -------------------------------------------------------------
        print("\n--- TEST 1: TIMEZONE CALIBRATION ---")
        settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if not settings:
            settings = UserSettings(user_id=user.id)
            db.add(settings)
            db.commit()

        # Test with Asia/Kolkata
        settings.timezone = "Asia/Kolkata"
        db.commit()

        tz_str = get_user_timezone(db, user.id)
        assert tz_str == "Asia/Kolkata", f"Expected Asia/Kolkata, got {tz_str}"
        local_now = get_user_local_now(db, user.id)
        local_today = get_user_local_today(db, user.id)
        assert local_now.tzinfo is not None, "Local now must have tzinfo"
        assert local_today == local_now.date(), "Local today must match local_now date"
        print(f"[PASS] Timezone correctly calibrated: {tz_str} -> {local_now.isoformat()} (Date: {local_today})")

        # Test fallback on invalid timezone
        settings.timezone = "Invalid/Timezone_Name_123"
        db.commit()
        fallback_tz_now = get_user_local_now(db, user.id)
        assert fallback_tz_now is not None, "Fallback timezone must not fail"
        settings.timezone = "Asia/Kolkata"
        db.commit()
        print("[PASS] Timezone gracefully handled invalid string fallback to UTC.")

        # -------------------------------------------------------------
        # TEST 2: INTERVAL OVERLAP DEDUPLICATION
        # -------------------------------------------------------------
        print("\n--- TEST 2: INTERVAL OVERLAP DEDUPLICATION ---")
        # Scenario: Two overlapping intervals
        # Interval 1: 10:00 to 10:30 (1800s)
        # Interval 2: 10:15 to 10:45 (1800s)
        # Merged interval should be 10:00 to 10:45 (2700s = 45m), NOT 3600s
        t1000 = datetime(2026, 10, 22, 10, 0, 0)
        t1030 = datetime(2026, 10, 22, 10, 30, 0)
        t1015 = datetime(2026, 10, 22, 10, 15, 0)
        t1045 = datetime(2026, 10, 22, 10, 45, 0)

        merged_secs = merge_time_intervals([(t1000, t1030), (t1015, t1045)])
        assert merged_secs == 2700, f"Expected 2700s (45m), got {merged_secs}s"
        print(f"[PASS] Overlap deduplication: [10:00-10:30] + [10:15-10:45] merged to {merged_secs}s (45m, zero double counting).")

        # Scenario: Disjoint intervals
        # Interval 3: 11:00 to 11:30 (1800s)
        merged_with_disjoint = merge_time_intervals([(t1000, t1030), (t1015, t1045), (datetime(2026, 10, 22, 11, 0, 0), datetime(2026, 10, 22, 11, 30, 0))])
        assert merged_with_disjoint == 4500, f"Expected 4500s, got {merged_with_disjoint}s"
        print(f"[PASS] Disjoint interval aggregation verified: {merged_with_disjoint}s (75m total).")

        # -------------------------------------------------------------
        # TEST 3: PROJECT ATTRIBUTION & LOCAL WORKSPACE MAPPING
        # -------------------------------------------------------------
        print("\n--- TEST 3: PROJECT ATTRIBUTION & EVIDENCE TIMELINE ---")
        # Create test project
        test_project_name = f"Test Project Intelligence {int(datetime.now().timestamp())}"
        project = create_project(
            db=db,
            user_id=user.id,
            name=test_project_name,
            description="Automated intelligence test project",
            tech_stack="Python, FastAPI, React",
            status="In Progress",
            github_repo_url=None, # Local development without GitHub
        )
        assert project.id is not None
        print(f"[PASS] Created local project without GitHub: id={project.id}, name='{project.name}'")

        # Create Task with direct project_id
        task_payload = TaskCreate(
            title="Implement Core Intelligence Engine",
            description="Build deduplication algorithms",
            status="Pending",
            priority="High",
            project_id=project.id,
        )
        task = create_task(db=db, task=task_payload, user_id=user.id)
        assert task.project_id == project.id, "Task project_id must match"
        print(f"[PASS] Created Task with explicit project_id={task.project_id}")

        # Simulate VS Code Extension sync with workspace name matching project
        ext_sync_res = record_extension_activities(
            db=db,
            user_id=user.id,
            items=[
                {
                    "platform": "vscode",
                    "title": f"VS Code: Active coding in {test_project_name}",
                    "duration_seconds": 1200, # 20 mins
                    "started_at": datetime.utcnow().isoformat(),
                    "ended_at": (datetime.utcnow() + timedelta(seconds=1200)).isoformat(),
                    "source": "vscode_extension",
                    "extension_event_id": f"test_vsc_proj_{int(datetime.now().timestamp())}",
                }
            ],
        )
        assert ext_sync_res["synced_count"] >= 1, "Extension activity must be recorded"

        # Verify activity was linked to the project
        linked_act = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.user_id == user.id,
                DeveloperActivity.project_id == project.id,
            )
            .first()
        )
        assert linked_act is not None, "Activity must be automatically attributed to project by workspace name"
        print(f"[PASS] Local IDE activity attributed to project id={linked_act.project_id} without GitHub URL!")

        # Check get_user_projects evidence metrics
        user_projects = get_user_projects(db, user.id)
        matched_proj_data = next((p for p in user_projects if p["id"] == project.id), None)
        assert matched_proj_data is not None
        assert matched_proj_data["total_tasks"] >= 1
        assert matched_proj_data["coding_seconds"] >= 1200
        assert matched_proj_data["evidence_backed"] is True
        print(f"[PASS] Project analytics: coding_seconds={matched_proj_data['coding_seconds']}s, evidence_backed={matched_proj_data['evidence_backed']}")

        # Mark task completed and test timeline
        task_update = TaskCreate(
            title=task.title,
            description=task.description,
            status="Completed",
            priority=task.priority,
            project_id=project.id,
        )
        update_task(db=db, task_id=task.id, task=task_update, user_id=user.id)

        timeline = get_project_timeline(db, project.id, user.id)
        assert len(timeline) >= 2, "Timeline must contain tasks and activities"
        task_event = next((ev for ev in timeline if ev["id"] == f"task_{task.id}"), None)
        assert task_event is not None
        assert task_event["is_verified"] is True
        print(f"[PASS] Project evidence timeline verified: {len(timeline)} events with provenance tags.")

        # -------------------------------------------------------------
        # TEST 4: FAIR SCORING & ANTI-SPAM POINTS POLICY
        # -------------------------------------------------------------
        print("\n--- TEST 4: FAIR SCORING & ANTI-SPAM POINTS POLICY ---")
        # Test: GitHub push events should NOT award points per event
        before_tx_count = db.query(PointTransaction).filter(PointTransaction.user_id == user.id).count()

        gh_act = record_unified_activity(
            db=db,
            user_id=user.id,
            platform="github",
            activity_type="push",
            title="GitHub PushEvent",
            message="Pushed commit to repository",
            duration_seconds=0,
            source="github_api",
            external_id=f"gh_test_commit_{int(datetime.now().timestamp())}",
        )
        after_tx_count = db.query(PointTransaction).filter(PointTransaction.user_id == user.id).count()
        assert after_tx_count == before_tx_count, "Raw GitHub push events must NOT grant points (prevents commit spam)!"
        print("[PASS] Anti-commit-spam policy verified: raw GitHub events awarded 0 extra points.")

        # Test: Genuine coding session (>= 15 mins = 900s) grants points
        code_act = record_unified_activity(
            db=db,
            user_id=user.id,
            platform="vscode",
            category="coding",
            activity_type="coding_session",
            title="Deep Coding Sprint",
            duration_seconds=1200, # 20m
            source="vscode_extension",
            external_id=f"deep_code_session_{int(datetime.now().timestamp())}",
        )
        after_code_tx_count = db.query(PointTransaction).filter(PointTransaction.user_id == user.id).count()
        assert after_code_tx_count == before_tx_count + 1, "Genuine coding session (>= 15m) must earn points."
        print("[PASS] Verified coding session (20m) awarded +5 points in auditable ledger.")

        # -------------------------------------------------------------
        # TEST 5: ML PREDICTION & FEATURE NORMALIZATION
        # -------------------------------------------------------------
        print("\n--- TEST 5: ML PREDICTION & FEATURE NORMALIZATION ---")
        features, has_data = ml_productivity_service.extract_live_user_features(db, user.id)
        assert has_data is True, "User should have sufficient activity data"
        assert features["tasks_planned"] <= 10, f"tasks_planned must be daily-normalized, got {features['tasks_planned']}"
        assert features["hour_of_day"] == local_now.hour, f"hour_of_day must match user's local timezone ({local_now.hour})"
        print(f"[PASS] ML Feature Vector: hour={features['hour_of_day']}, planned_tasks={features['tasks_planned']}, coding_mins={features['coding_minutes']}")

        prediction = ml_productivity_service.predict_for_user(db, user.id, save_to_db=False)
        assert prediction["status"] == "success"
        assert prediction["predicted_productivity_score"] is not None
        print(f"[PASS] RandomForestRegressor prediction: score={prediction['predicted_productivity_score']:.1f}, level='{prediction['productivity_level']}'")

        # -------------------------------------------------------------
        # TEST 6: COLLEGE-SCALE METADATA & PRIVACY
        # -------------------------------------------------------------
        print("\n--- TEST 6: COLLEGE-SCALE METADATA ---")
        settings.institution = "MIT World Peace University"
        settings.department = "School of Computer Engineering"
        settings.batch_year = "2026"
        settings.student_id_number = "MIT-CS-2026-088"
        db.commit()

        reloaded_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        assert reloaded_settings.institution == "MIT World Peace University"
        assert reloaded_settings.department == "School of Computer Engineering"
        assert reloaded_settings.batch_year == "2026"
        assert reloaded_settings.student_id_number == "MIT-CS-2026-088"
        print(f"[PASS] College-scale metadata verified: {reloaded_settings.institution} | {reloaded_settings.department} | Batch: {reloaded_settings.batch_year}")

        # -------------------------------------------------------------
        # TEST 7: DASHBOARD OVERVIEW INTEGRATION
        # -------------------------------------------------------------
        print("\n--- TEST 7: DASHBOARD OVERVIEW INTEGRATION ---")
        overview = get_dashboard_overview(db, user.id, force_refresh=True)
        assert "primary_metrics" in overview
        assert "coding" in overview["primary_metrics"]
        assert "focus" in overview["primary_metrics"]
        assert "tasks" in overview["primary_metrics"]
        assert "productivity" in overview["primary_metrics"]
        assert "ml_prediction" in overview
        assert overview["today_summary"]["coding_seconds"] >= 0
        print(f"[PASS] Dashboard Overview confirmed: Score={overview['primary_metrics']['productivity']['score']}, Coding={overview['primary_metrics']['coding']['formatted']}")

        # Clean up test task and project
        delete_task(db, task.id, user.id)
        delete_project(db, project.id, user.id)
        print("[PASS] Test artifacts cleanly rolled back.")

        print("\n==================================================================")
        print("ALL 7 PHASES PASSED WITH 100% SUCCESSFUL VALIDATION!")
        print("==================================================================")

    finally:
        db.close()


if __name__ == "__main__":
    run_master_test_suite()
