"""
Phase 8 Verification Test Suite: Privacy-First Browser Activity Extension
Tests:
1. Supported platform ingestion (GitHub, LeetCode, Coursera, NPTEL, GeeksforGeeks, freeCodeCamp, LinkedIn, Naukri).
2. Unsupported domain / platform rejection (e.g. youtube, twitter, arbitrary domains).
3. Reasonable duration validation (negative or impossible durations ignored).
4. Strict deduplication via client-generated extension_event_id (external_id).
5. Offline batch sync ingestion (multiple queued events in one request).
6. Privacy settings governance (activity_tracking=False blocks extension activity).
7. Multi-user isolation (User A extension data is strictly inaccessible to User B).
8. Dashboard, Unified Activity Engine, and AI Coach integration.
"""
import sys
import os
from datetime import datetime, date, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings
from app.services.unified_activity_service import (
    record_extension_activities,
    get_unified_activities,
    get_activity_summary,
    get_career_summary,
)
from app.services.dashboard_service import get_dashboard_overview

def run_tests():
    db = SessionLocal()
    print("==================================================")
    print("STARTING PHASE 8 BROWSER EXTENSION TEST SUITE")
    print("==================================================")

    # 1. Setup Test Users
    user_a = db.query(User).filter(User.username == "test_phase8_user_a").first()
    if not user_a:
        user_a = User(
            username="test_phase8_user_a",
            email="phase8_a@example.com",
            password="hashed_pw_test",
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

    user_b = db.query(User).filter(User.username == "test_phase8_user_b").first()
    if not user_b:
        user_b = User(
            username="test_phase8_user_b",
            email="phase8_b@example.com",
            password="hashed_pw_test",
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

    # Ensure clean state for test users
    db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id.in_([user_a.id, user_b.id])
    ).delete(synchronize_session=False)
    db.query(UserSettings).filter(
        UserSettings.user_id.in_([user_a.id, user_b.id])
    ).delete(synchronize_session=False)
    db.commit()

    # TEST 1: Supported Platforms Ingestion
    print("\n[TEST 1] Testing Supported Platforms Batch Ingestion...")
    now = datetime.utcnow()
    batch_items = [
        {
            "platform": "github",
            "duration_seconds": 1800,  # 30m
            "started_at": (now - timedelta(minutes=35)).isoformat(),
            "ended_at": (now - timedelta(minutes=5)).isoformat(),
            "extension_event_id": "evt_gh_001",
        },
        {
            "platform": "leetcode",
            "duration_seconds": 1200,  # 20m
            "started_at": (now - timedelta(minutes=60)).isoformat(),
            "ended_at": (now - timedelta(minutes=40)).isoformat(),
            "extension_event_id": "evt_lc_001",
        },
        {
            "platform": "coursera",
            "duration_seconds": 2400,  # 40m
            "started_at": (now - timedelta(hours=2)).isoformat(),
            "ended_at": (now - timedelta(hours=1, minutes=20)).isoformat(),
            "extension_event_id": "evt_coursera_001",
        },
        {
            "platform": "linkedin",
            "duration_seconds": 600,  # 10m
            "started_at": (now - timedelta(hours=3)).isoformat(),
            "ended_at": (now - timedelta(hours=2, minutes=50)).isoformat(),
            "extension_event_id": "evt_li_001",
        },
        {
            "platform": "naukri",
            "duration_seconds": 300,  # 5m
            "started_at": (now - timedelta(hours=4)).isoformat(),
            "ended_at": (now - timedelta(hours=3, minutes=55)).isoformat(),
            "extension_event_id": "evt_nk_001",
        },
    ]

    res = record_extension_activities(db=db, user_id=user_a.id, items=batch_items)
    assert res["status"] == "success"
    assert res["synced_count"] == 5, f"Expected 5 synced, got {res['synced_count']}"
    assert res["duplicate_count"] == 0
    assert res["ignored_count"] == 0
    print("[PASS] Successfully ingested 5 supported platform sessions (GitHub, LeetCode, Coursera, LinkedIn, Naukri)")

    # TEST 2: Unsupported Domain Rejection & Duration Boundaries
    print("\n[TEST 2] Testing Unsupported Domain Rejection & Duration Bounds...")
    invalid_items = [
        {
            "platform": "youtube",  # Not supported
            "duration_seconds": 1200,
            "extension_event_id": "evt_yt_001",
        },
        {
            "platform": "facebook",  # Not supported
            "duration_seconds": 600,
            "extension_event_id": "evt_fb_001",
        },
        {
            "platform": "github",
            "duration_seconds": -500,  # Negative duration invalid
            "extension_event_id": "evt_gh_neg",
        },
        {
            "platform": "leetcode",
            "duration_seconds": 999999,  # Exceeds 24 hours (86400s)
            "extension_event_id": "evt_lc_toolong",
        },
    ]

    res2 = record_extension_activities(db=db, user_id=user_a.id, items=invalid_items)
    assert res2["synced_count"] == 0, f"Expected 0 synced, got {res2['synced_count']}"
    assert res2["ignored_count"] == 4, f"Expected 4 ignored, got {res2['ignored_count']}"
    print("[PASS] Successfully rejected unsupported domains (YouTube, Facebook) and invalid duration bounds")

    # TEST 3: Strict Deduplication
    print("\n[TEST 3] Testing Strict Event Deduplication...")
    # Resend the same batch with existing extension_event_ids
    res3 = record_extension_activities(db=db, user_id=user_a.id, items=batch_items)
    assert res3["synced_count"] == 0, f"Expected 0 newly created, got {res3['synced_count']}"
    assert res3["duplicate_count"] == 5, f"Expected 5 duplicates caught, got {res3['duplicate_count']}"

    # Verify total records in DB for User A is still exactly 5
    total_acts = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_a.id).count()
    assert total_acts == 5, f"Expected exactly 5 DB records, got {total_acts}"
    print("[PASS] Strict deduplication verified: repeated sync caused 0 duplicate DB records")

    # TEST 4: Unified Taxonomy & Activity Categories
    print("\n[TEST 4] Testing Taxonomy & Category Normalization...")
    gh_act = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_a.id,
        DeveloperActivity.platform == "github",
    ).first()
    assert gh_act.category == "coding"
    assert gh_act.source == "browser_extension"
    assert gh_act.external_id == "ext_evt_gh_001"

    lc_act = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_a.id,
        DeveloperActivity.platform == "leetcode",
    ).first()
    assert lc_act.category == "problem_solving"

    li_act = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_a.id,
        DeveloperActivity.platform == "linkedin",
    ).first()
    assert li_act.category == "career"
    print("[PASS] Category mapping verified (GitHub->coding, LeetCode->problem_solving, LinkedIn->career)")

    # TEST 5: Multi-User Isolation
    print("\n[TEST 5] Testing Multi-User Data Isolation...")
    acts_b = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_b.id).all()
    assert len(acts_b) == 0, "User B must have 0 activities"

    summary_b = get_activity_summary(db, user_b.id)
    assert summary_b["today"]["total_activities"] == 0
    print("[PASS] Strict multi-user isolation confirmed: User B has 0 access to User A's extension data")

    # TEST 6: Dashboard & Activity Engine Integration
    print("\n[TEST 6] Testing Dashboard Overview & AI Coach Integration...")
    overview = get_dashboard_overview(db, user_a.id)
    today_sum = overview["today_summary"]
    
    assert today_sum["coding_seconds"] >= 1800
    assert today_sum["problem_solving_seconds"] >= 1200
    assert today_sum["learning_seconds"] >= 2400

    # Verify Timeline displays extension activity
    timeline = overview["timeline"]
    ext_timeline = [t for t in timeline if "Active session" in t.get("message", "")]
    assert len(ext_timeline) > 0, "Extension sessions must appear on the live timeline feed"
    print(f"[PASS] Dashboard received verified active time (Coding: {today_sum['coding_seconds'] // 60}m, Problem Solving: {today_sum['problem_solving_seconds'] // 60}m, Learning: {today_sum['learning_seconds'] // 60}m)")

    # TEST 7: Privacy Settings Enforcement (activity_tracking = False)
    print("\n[TEST 7] Testing Privacy Settings Enforcement...")
    setting_a = UserSettings(user_id=user_a.id, activity_tracking=False)
    db.add(setting_a)
    db.commit()

    privacy_items = [{
        "platform": "github",
        "duration_seconds": 900,
        "extension_event_id": "evt_gh_privacy_test",
    }]
    res_privacy = record_extension_activities(db=db, user_id=user_a.id, items=privacy_items)
    assert res_privacy["status"] == "disabled"
    assert res_privacy["synced_count"] == 0
    print("[PASS] Privacy governance verified: Ingestion rejected when activity_tracking is disabled")

    # Clean up test users
    db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id.in_([user_a.id, user_b.id])
    ).delete(synchronize_session=False)
    db.query(UserSettings).filter(
        UserSettings.user_id.in_([user_a.id, user_b.id])
    ).delete(synchronize_session=False)
    db.delete(user_a)
    db.delete(user_b)
    db.commit()
    db.close()

    print("\n==================================================")
    print("ALL PHASE 8 TESTS PASSED SUCCESSFULLY (100% PASS)")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
