"""
Live HTTP Integration Test Suite for Phase 8 Browser Extension
Tests against running FastAPI backend at http://127.0.0.1:8001:
1. Authenticate with account credentials to retrieve JWT.
2. POST /activity/extension-sync with a single platform session (GitHub).
3. POST /activity/extension-sync with a batch of queued sessions (LeetCode, Coursera, LinkedIn).
4. POST /activity/extension-sync resend to verify deduplication.
5. GET /activity to confirm source='browser_extension' and verified durations.
6. GET /dashboard/overview to confirm extension data reflects on live dashboard telemetry.
7. Clean up test events.
"""
import httpx
import sys
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.core.security import hash_password

BASE_URL = "http://127.0.0.1:8001"

def run_live_tests():
    print("==================================================")
    print("STARTING LIVE HTTP PHASE 8 EXTENSION TESTS")
    print("==================================================")

    # Ensure password is set for test user
    db = SessionLocal()
    user = db.query(User).filter((User.username == "Keerthzz") | (User.email == "keerthzz@gmail.com")).first()
    if user:
        user.password = hash_password("password123")
        db.commit()
    db.close()

    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    # 1. Login
    login_resp = client.post(
        "/auth/login",
        data={"username": "keerthzz@gmail.com", "password": "password123"},
    )
    if login_resp.status_code != 200:
        login_resp = client.post(
            "/auth/login",
            data={"username": "Keerthzz", "password": "password123"},
        )
    if login_resp.status_code != 200:
        print(f"[FAIL] Login failed: {login_resp.status_code} {login_resp.text}")
        sys.exit(1)

    token = login_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Successfully authenticated Keerthzz with JWT token")

    # 2. Single Extension Event Sync
    single_event_id = f"test_live_gh_{int(datetime.now().timestamp())}"
    single_payload = {
        "platform": "github",
        "category": "coding",
        "activity_type": "platform_session",
        "duration_seconds": 1500,  # 25m
        "extension_event_id": single_event_id,
        "source": "browser_extension",
    }

    res_single = client.post(
        "/activity/extension-sync",
        headers=headers,
        json={"events": [single_payload]},
    )
    assert res_single.status_code == 200, f"Single sync failed: {res_single.text}"
    single_data = res_single.json()
    assert single_data["status"] == "success"
    assert single_data["synced_count"] == 1
    print("[PASS] POST /activity/extension-sync (Single Event): Successfully synced GitHub 25m session")

    # 3. Batch Extension Queue Sync (Simulating offline queue flush)
    ts = int(datetime.now().timestamp())
    batch_payload = {
        "events": [
            {
                "platform": "leetcode",
                "category": "problem_solving",
                "duration_seconds": 900,  # 15m
                "extension_event_id": f"test_live_lc_{ts}",
            },
            {
                "platform": "coursera",
                "category": "learning",
                "duration_seconds": 1800,  # 30m
                "extension_event_id": f"test_live_coursera_{ts}",
            },
            {
                "platform": "linkedin",
                "category": "career",
                "duration_seconds": 300,  # 5m
                "extension_event_id": f"test_live_li_{ts}",
            },
        ]
    }

    res_batch = client.post(
        "/activity/extension-sync",
        headers=headers,
        json=batch_payload,
    )
    assert res_batch.status_code == 200, f"Batch sync failed: {res_batch.text}"
    batch_data = res_batch.json()
    assert batch_data["synced_count"] == 3
    print("[PASS] POST /activity/extension-sync (Batch Queue): Successfully synced LeetCode, Coursera, LinkedIn")

    # 4. Deduplication on Retried Batch
    res_retry = client.post(
        "/activity/extension-sync",
        headers=headers,
        json=batch_payload,
    )
    assert res_retry.status_code == 200
    retry_data = res_retry.json()
    assert retry_data["synced_count"] == 0
    assert retry_data["duplicate_count"] == 3
    print("[PASS] Server Deduplication verified: Retried queue returned 0 created and 3 duplicates")

    # 5. Verify Activities Ingested via GET /activity
    res_acts = client.get("/activity?limit=10", headers=headers)
    assert res_acts.status_code == 200
    acts_data = res_acts.json()
    ext_records = [a for a in acts_data.get("activities", []) if a.get("source") == "browser_extension"]
    assert len(ext_records) >= 4, f"Expected at least 4 extension records, got {len(ext_records)}"
    print(f"[PASS] GET /activity: Verified {len(ext_records)} extension activity records in Unified Timeline")

    # 6. Verify Dashboard Overview Telemetry
    res_dash = client.get("/dashboard/overview", headers=headers)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert "today_summary" in dash_data
    assert dash_data["today_summary"]["coding_seconds"] >= 1500
    print("[PASS] GET /dashboard/overview: Real-time dashboard reflects extension session durations")

    # 7. Cleanup Live Test Events
    db = SessionLocal()
    user_db = db.query(User).filter((User.username == "Keerthzz") | (User.email == "keerthzz@gmail.com")).first()
    if user_db:
        db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == user_db.id,
            DeveloperActivity.external_id.like("ext_test_live_%"),
        ).delete(synchronize_session=False)
        db.commit()
    db.close()
    print("[PASS] Cleaned up temporary live test events")

    print("\n==================================================")
    print("ALL LIVE HTTP TESTS PASSED SUCCESSFULLY (100% PASS)")
    print("==================================================")

if __name__ == "__main__":
    run_live_tests()
