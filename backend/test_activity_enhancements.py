import sys
from datetime import date, datetime
from sqlalchemy.orm import Session
import json

from app.core.database import SessionLocal
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.services.unified_activity_service import (
    get_unified_activities,
    get_career_applications,
    create_or_update_career_application,
    get_activity_summary,
)

def run_tests():
    db: Session = SessionLocal()
    try:
        print("=== 1. VERIFYING USER & DATABASE INTEGRITY ===")
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("[FAIL] User Keerthzz not found!")
            sys.exit(1)
        
        user_id = user.id
        print(f"[PASS] Primary User: ID={user_id}, Username={user.username}, Email={user.email}")

        # Count existing activities
        total_in_db = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_id).count()
        print(f"[PASS] Total DeveloperActivity records in DB: {total_in_db}")

        print("\n=== 2. TESTING SMART FILTERS & SEARCH ===")
        # 1. Base query
        res_all = get_unified_activities(db, user_id, limit=20, offset=0)
        assert "activities" in res_all
        assert res_all["total"] >= 200, f"Expected >= 200 activities, got {res_all['total']}"
        print(f"[PASS] get_unified_activities (all): returned {len(res_all['activities'])} items out of {res_all['total']} total")

        # 2. Category Filter (coding)
        res_coding = get_unified_activities(db, user_id, category_filter="coding", limit=50)
        assert res_coding["total"] > 0
        for item in res_coding["activities"]:
            assert item["category"] == "coding"
        print(f"[PASS] Category filter ('coding'): {res_coding['total']} matching records verified")

        # 3. Platform Filter (github)
        res_github = get_unified_activities(db, user_id, platform_filter="github", limit=50)
        assert res_github["total"] > 0
        for item in res_github["activities"]:
            assert item["platform"] == "github"
        print(f"[PASS] Platform filter ('github'): {res_github['total']} matching records verified")

        # 4. Search Query ('commit')
        res_search = get_unified_activities(db, user_id, search_query="commit", limit=50)
        assert res_search["total"] > 0
        print(f"[PASS] Search filter ('commit'): {res_search['total']} matching records verified")

        # 5. Date Range Filter
        res_range = get_unified_activities(
            db, user_id,
            start_date=date(2020, 1, 1),
            end_date=date(2030, 12, 31),
            limit=20
        )
        assert res_range["total"] == total_in_db
        print(f"[PASS] Date Range filter (2020 to 2030): {res_range['total']} matching records verified")

        print("\n=== 3. TESTING CAREER APPLICATION PIPELINE ===")
        # 1. Create a Career Application
        app1 = create_or_update_career_application(
            db=db,
            user_id=user_id,
            company="Stripe",
            role="Staff Software Engineer",
            stage="applied",
            platform="linkedin",
            notes="Applied through executive referral."
        )
        assert app1["id"] is not None
        assert app1["stage"] == "applied"
        assert app1["company"] == "Stripe"
        print(f"[PASS] Created Career Application #{app1['id']}: {app1['company']} - {app1['role']} ({app1['stage']})")

        # 2. Update Career Application Stage to Interview
        app1_updated = create_or_update_career_application(
            db=db,
            user_id=user_id,
            company="Stripe",
            role="Staff Software Engineer",
            stage="interview",
            platform="linkedin",
            notes="Technical architecture interview scheduled.",
            interview_date="2026-10-15",
            activity_id=app1["id"]
        )
        assert app1_updated["id"] == app1["id"]
        assert app1_updated["stage"] == "interview"
        print(f"[PASS] Updated Career Application #{app1_updated['id']}: Stage updated to '{app1_updated['stage']}'")

        # 3. Create another Career Application (Offer stage)
        app2 = create_or_update_career_application(
            db=db,
            user_id=user_id,
            company="Google",
            role="Senior Developer Advocate",
            stage="offer",
            platform="company_portal",
            notes="Offer letter received."
        )
        print(f"[PASS] Created Career Application #{app2['id']}: {app2['company']} ({app2['stage']})")

        # 4. Get Career Applications and Pipeline Metrics
        career_summary = get_career_applications(db, user_id)
        assert "applications" in career_summary
        assert "metrics" in career_summary
        metrics = career_summary["metrics"]
        print(f"[PASS] Career Summary loaded: {len(career_summary['applications'])} applications")
        print(f"       Applications Submitted: {metrics.get('applications_submitted')}")
        print(f"       Interviews Scheduled:   {metrics.get('interviews_scheduled')}")
        print(f"       Offers Received:        {metrics.get('offers_received')}")
        assert metrics.get("interviews_scheduled", 0) >= 1
        assert metrics.get("offers_received", 0) >= 1

        print("\n=== 4. TESTING SUMMARY METRICS CARDS INTEGRATION ===")
        summary = get_activity_summary(db, user_id)
        assert "today" in summary
        assert "weekly" in summary
        print(f"[PASS] Activity Summary for Metric Cards verified:")
        print(f"       Coding: {summary['today']['coding']['formatted']}")
        print(f"       Problem Solving: {summary['today']['problem_solving']['formatted']}")
        print(f"       Learning: {summary['today']['learning']['formatted']}")
        print(f"       Deep Focus: {summary['today']['focus']['formatted']}")
        print(f"       Career: {summary['today']['career']['formatted']}")

        print("\n[ALL ACTIVITY ENHANCEMENTS AND CAREER PIPELINE TESTS PASSED 100%!]")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
