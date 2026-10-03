import sys
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.services.unified_activity_service import (
    get_activity_summary,
    get_unified_activities,
    get_career_summary,
    get_career_applications,
    create_or_update_career_application,
    create_manual_activity,
    record_unified_activity,
)

def run_activity_enhancement_test():
    db: Session = SessionLocal()
    print("=" * 65)
    print("STARTING ACTIVITY CENTER ENHANCEMENT AUDIT")
    print("=" * 65)

    try:
        user = db.query(User).first()
        if not user:
            print("[ERROR] No user found in database")
            sys.exit(1)

        print(f"[PASS] Auditing for User ID {user.id} ({user.username})")

        # 1. Test Pomodoro Focus Time as Truth Source
        now = datetime.utcnow()
        focus_session = PomodoroSession(
            user_id=user.id,
            session_type="focus",
            planned_duration_seconds=1500,
            actual_duration_seconds=1500,
            status="completed",
            started_at=now,
            ended_at=now,
        )
        db.add(focus_session)
        db.commit()

        # Log matching activity
        record_unified_activity(
            db=db,
            user_id=user.id,
            platform="pomodoro",
            category="productivity",
            activity_type="pomodoro_focus_completed",
            title="Pomodoro Focus Sprint: 25m",
            message="Completed 25m deep work sprint",
            duration_seconds=1500,
            source="pomodoro_timer",
            external_id=f"pomodoro_audit_{focus_session.id}",
        )

        # 2. Test Four Metric Summary Generation
        summary = get_activity_summary(db, user.id)
        assert "today" in summary, "Missing 'today' in summary"
        assert "coding" in summary["today"], "Missing coding in summary"
        assert "learning" in summary["today"], "Missing learning in summary"
        assert "focus" in summary["today"], "Missing focus in summary"
        assert "career" in summary["today"], "Missing career in summary"
        print(f"[PASS] 4-Card Summary validated:")
        print(f"       - Coding Today:   {summary['today']['coding']['formatted']} ({summary['today']['coding']['count']} events)")
        print(f"       - Learning Today: {summary['today']['learning']['formatted']} ({summary['today']['learning']['count']} modules/solves)")
        print(f"       - Focus Today:    {summary['today']['focus']['formatted']} ({summary['today']['focus']['count']} sprints)")
        print(f"       - Career Today:   {summary['today']['career']['count']} milestones")

        # 3. Test Career Milestones (All stages)
        stages = ["applied", "assessment", "interview", "offer"]
        for stg in stages:
            create_or_update_career_application(
                db=db,
                user_id=user.id,
                company=f"TechCorp {stg.capitalize()}",
                role="Senior Engineer",
                stage=stg,
                platform="linkedin",
                notes=f"Audit stage test {stg}",
            )

        career_apps = get_career_applications(db, user.id)
        assert career_apps["total"] >= len(stages), "Career applications count mismatch"
        assert len(career_apps["pipeline"]["applied"]) >= 1, "Missing applied pipeline entry"
        assert len(career_apps["pipeline"]["interview"]) >= 1, "Missing interview pipeline entry"
        assert len(career_apps["pipeline"]["offer"]) >= 1, "Missing offer pipeline entry"
        print(f"[PASS] Career Milestones pipeline verified across stages: {list(career_apps['pipeline'].keys())}")

        # 4. Test Smart Filtering & Timeline Search
        search_res = get_unified_activities(db, user.id, search_query="Pomodoro Focus")
        assert len(search_res["activities"]) >= 1, "Search query filtering failed"
        print(f"[PASS] Smart search filter returned {len(search_res['activities'])} matching records")

        cat_res = get_unified_activities(db, user.id, category_filter="career")
        assert len(cat_res["activities"]) >= 1, "Category filtering failed"
        print(f"[PASS] Category filter ('career') returned {len(cat_res['activities'])} records")

        # 5. Multi-User Isolation
        other_user_acts = get_unified_activities(db, user_id=999999)
        assert other_user_acts["total"] == 0, "Multi-user leakage detected"
        print(f"[PASS] Strict multi-user isolation confirmed (0 records returned for foreign user ID)")

        print("=" * 65)
        print("ALL ACTIVITY CENTER ENHANCEMENT TESTS PASSED (100%)")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    run_activity_enhancement_test()
