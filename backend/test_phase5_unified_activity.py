import os
import sys
from datetime import date, datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.task import Task
from app.models.developer_activity import DeveloperActivity
from app.schemas.task_schema import TaskCreate
from app.services.unified_activity_service import (
    record_unified_activity,
    create_manual_activity,
    record_task_completed_activity,
    get_unified_activities,
    get_activity_summary,
    sync_platform_activities,
    normalize_category,
)
from app.services.task_service import update_task
from app.services.dashboard_service import get_dashboard_overview

def run_phase5_activity_suite():
    print("==================================================")
    print("STARTING PHASE 5 UNIFIED ACTIVITY SUITE VALIDATION")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Fetch primary test user (Keerthzz / id=1)
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("[FAIL] User Keerthzz not found in database.")
            return
        print(f"[PASS] Identified test user: id={user.id}, username='{user.username}'")

        # 2. Test Taxonomy Normalization
        assert normalize_category("github") == "coding"
        assert normalize_category("leetcode") == "problem_solving"
        assert normalize_category("nptel") == "learning"
        assert normalize_category("pomodoro") == "productivity"
        assert normalize_category("tasks") == "productivity"
        assert normalize_category("linkedin") == "career"
        print("[PASS] Taxonomy normalization verified across all platforms & categories.")

        # 3. Test Manual Activity Creation
        manual_act = create_manual_activity(
            db=db,
            user_id=user.id,
            platform="nptel",
            category="learning",
            activity_type="course_activity",
            title="Completed Module 4: Cloud Infrastructure & Virtualization",
            description="Finished video lectures and passed module quiz with 90%",
            duration_minutes=45,
            activity_date=date.today(),
        )
        assert manual_act["source"] == "manual"
        assert manual_act["duration_seconds"] == 45 * 60
        assert manual_act["category"] == "learning"
        print(f"[PASS] Manual activity created: id={manual_act['id']}, source='{manual_act['source']}', duration={manual_act['duration_minutes']}m")

        # 4. Test Task Completion Hook Integration
        task = db.query(Task).filter(Task.user_id == user.id).first()
        if task:
            task_payload = TaskCreate(
                title=task.title,
                description=task.description or "",
                status="Completed",
                priority=task.priority or "Medium",
                due_date=task.due_date,
            )
            # Temporarily mark pending to trigger status transition
            task.status = "Pending"
            db.commit()

            updated_task = update_task(db, task.id, task_payload, user.id)
            assert updated_task.status == "Completed"

            # Check unified activity record
            task_act = (
                db.query(DeveloperActivity)
                .filter(
                    DeveloperActivity.user_id == user.id,
                    DeveloperActivity.platform == "tasks",
                    DeveloperActivity.external_id == f"task_{task.id}",
                )
                .first()
            )
            assert task_act is not None
            assert task_act.category == "productivity"
            assert task_act.source == "task_system"
            print(f"[PASS] Task completion activity logged: id={task_act.id}, external_id='{task_act.external_id}'")

        # 5. Test Strict Deduplication
        test_ext_id = "gh_test_commit_sha_998877"
        # First insertion
        first_rec = record_unified_activity(
            db=db,
            user_id=user.id,
            platform="github",
            activity_type="commit",
            title="Fix cache invalidation bug in auth",
            source="github_api",
            external_id=test_ext_id,
        )
        # Second insertion (duplicate trigger)
        second_rec = record_unified_activity(
            db=db,
            user_id=user.id,
            platform="github",
            activity_type="commit",
            title="Fix cache invalidation bug in auth",
            source="github_api",
            external_id=test_ext_id,
        )
        assert first_rec.id == second_rec.id

        dup_count = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.user_id == user.id,
                DeveloperActivity.external_id == test_ext_id,
            )
            .count()
        )
        assert dup_count == 1
        print(f"[PASS] Deduplication verified: {dup_count} record stored for external_id='{test_ext_id}'")

        # 6. Test Multi-Platform Sync
        sync_res = sync_platform_activities(db, user.id)
        assert sync_res["status"] == "success"
        assert "results" in sync_res
        print(f"[PASS] Multi-Platform sync executed: platforms={list(sync_res['results'].keys())}")

        # 7. Test Activity Summary Aggregation
        summary = get_activity_summary(db, user.id)
        assert "today" in summary
        assert "weekly" in summary
        assert "platforms" in summary
        print("[PASS] Activity Summary verified:")
        print(f"       Today Coding: {summary['today']['coding']['formatted']}")
        print(f"       Today Learning: {summary['today']['learning']['formatted']}")
        print(f"       Today Focus: {summary['today']['focus']['formatted']}")
        print(f"       Total Today Events: {summary['today']['total_activities']}")
        assert len(summary["platforms"]) >= 6

        # 8. Test Query Pagination and Filters
        filtered_list = get_unified_activities(
            db=db,
            user_id=user.id,
            limit=10,
            offset=0,
            category_filter="learning",
        )
        assert "activities" in filtered_list
        assert all(a["category"] == "learning" for a in filtered_list["activities"])
        print(f"[PASS] Category filtering ('learning') verified: {len(filtered_list['activities'])} records returned.")

        # 9. Test Privacy Control Integration (Activity Tracking toggle)
        settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if settings:
            # Disable tracking
            settings.activity_tracking = False
            db.commit()

            disabled_act = record_unified_activity(
                db=db,
                user_id=user.id,
                platform="github",
                activity_type="push",
                title="Should be skipped due to privacy setting",
                source="automatic",
            )
            assert disabled_act is None
            print("[PASS] Privacy Governance verified: Automatic activity is skipped when activity_tracking is disabled.")

            # Re-enable tracking
            settings.activity_tracking = True
            db.commit()

        # 10. Test Multi-User Isolation Check
        fake_user_activities = get_unified_activities(db, user_id=9999)
        assert fake_user_activities["total"] == 0
        assert len(fake_user_activities["activities"]) == 0
        print("[PASS] Multi-User Isolation verified: User 9999 has zero access to User 1's activities.")

        # 11. Test Dashboard Integration
        dash = get_dashboard_overview(db, user.id)
        assert "today_summary" in dash
        print(f"[PASS] Dashboard Overview confirmed unified activity consumption (focus: {dash['today_summary']['focus_seconds']}s).")

        print("==================================================")
        print("ALL PHASE 5 ACTIVITY SUITE TESTS PASSED! (100%)")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    run_phase5_activity_suite()
