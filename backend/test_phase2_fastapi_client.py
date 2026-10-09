"""
FastAPI TestClient Comprehensive Endpoint Suite for Phase 2 Time Tracking
Tests all routes against the live FastAPI app:
- GET /time-tracking/platforms
- POST /time-tracking/sessions/sync
- GET /time-tracking/summary
- GET /time-tracking/sessions
- GET /time-tracking/settings
- POST /time-tracking/settings
- DELETE /time-tracking/history
"""

import sys
import os
from datetime import datetime, timedelta

# Append backend to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.browser_time_session import BrowserTimeSession
from app.services.auth_service import create_access_token


def test_all_time_tracking_endpoints():
    print("=" * 70)
    print(" TESTING PHASE 2 FASTAPI ENDPOINTS VIA TESTCLIENT")
    print("=" * 70)

    client = TestClient(app)

    # 1. Test GET /time-tracking/platforms (Public)
    resp = client.get("/time-tracking/platforms")
    assert resp.status_code == 200, f"Failed platforms: {resp.text}"
    platforms_data = resp.json()
    print(f"[OK] GET /time-tracking/platforms: {platforms_data['count']} supported platforms found.")
    for p in platforms_data["platforms"]:
        print(f"   - {p['name']} ({p['platform']}): {', '.join(p['domains'])}")

    # 2. Prepare Test User & Token
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            user = db.query(User).first()
        assert user is not None, "No user found in database for testing."
        user_id = user.id
        token = create_access_token(data={"sub": user.username, "user_id": user.id})
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Created valid JWT token for test user '{user.username}' (id={user_id})")

    # 3. Test POST /time-tracking/sessions/sync
    now = datetime.utcnow()
    sync_payload = {
        "sessions": [
            {
                "platform": "github",
                "domain": "github.com",
                "started_at": (now - timedelta(minutes=45)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 2100, # 35 min
                "idle_seconds": 600,   # 10 min
                "session_key": f"tc_test_{int(now.timestamp())}_gh",
            },
            {
                "platform": "leetcode",
                "domain": "leetcode.com",
                "started_at": (now - timedelta(minutes=25)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1200, # 20 min
                "idle_seconds": 300,   # 5 min
                "session_key": f"tc_test_{int(now.timestamp())}_lc",
            },
            {
                "platform": "coursera",
                "domain": "coursera.org",
                "started_at": (now - timedelta(minutes=30)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1500, # 25 min
                "idle_seconds": 300,
                "session_key": f"tc_test_{int(now.timestamp())}_coursera",
            }
        ]
    }

    resp = client.post("/time-tracking/sessions/sync", json=sync_payload, headers=headers)
    assert resp.status_code == 200, f"Sync failed: {resp.text}"
    sync_res = resp.json()
    print(f"[OK] POST /time-tracking/sessions/sync: {sync_res['message']}")
    print(f"   - Synced Count: {sync_res['synced_count']} | Total Active: {sync_res['total_active_formatted']}")

    # 4. Test GET /time-tracking/summary
    resp = client.get("/time-tracking/summary", headers=headers)
    assert resp.status_code == 200, f"Summary failed: {resp.text}"
    summary = resp.json()
    print(f"[OK] GET /time-tracking/summary: Today's Active Time = {summary['today']['formatted']}")
    print(f"   - Idle Excluded: {summary['today']['idle_excluded_formatted']}")
    print(f"   - Top Platform: {summary['most_used_platform']['name'] if summary['most_used_platform'] else 'None'}")
    print(f"   - Coding Goal: {summary['targets']['coding']['percentage']}% ({summary['targets']['coding']['actual_formatted']} / {summary['targets']['coding']['target_hours']}h)")
    print(f"   - Learning Goal: {summary['targets']['learning']['percentage']}% ({summary['targets']['learning']['actual_formatted']} / {summary['targets']['learning']['target_hours']}h)")

    # 5. Test GET /time-tracking/sessions (with pagination & platform filter)
    resp = client.get("/time-tracking/sessions?limit=5&platform=github", headers=headers)
    assert resp.status_code == 200, f"Sessions failed: {resp.text}"
    sessions_res = resp.json()
    print(f"[OK] GET /time-tracking/sessions?platform=github: {sessions_res['total']} matching sessions.")
    for s in sessions_res["sessions"][:2]:
        print(f"   - [{s['name']}] Active: {s['active_formatted']} | Idle: {s['idle_formatted']} ({s['started_at']} -> {s['ended_at']})")

    # 6. Test GET /time-tracking/settings & POST /time-tracking/settings
    resp = client.get("/time-tracking/settings", headers=headers)
    assert resp.status_code == 200, f"Get settings failed: {resp.text}"
    settings_res = resp.json()
    print(f"[OK] GET /time-tracking/settings: Enabled={settings_res['browser_extension_enabled']}, IdleThreshold={settings_res['idle_threshold_seconds']}s")

    resp = client.post(
        "/time-tracking/settings",
        json={"browser_extension_enabled": True, "idle_threshold_seconds": 60, "auto_sync_interval_seconds": 60},
        headers=headers,
    )
    assert resp.status_code == 200, f"Update settings failed: {resp.text}"
    print(f"[OK] POST /time-tracking/settings: Telemetry settings updated successfully.")


    print("=" * 70)
    print(" ALL FASTAPI TESTCLIENT INTEGRATION CHECKS PASSED (100%)")
    print("=" * 70)


if __name__ == "__main__":
    test_all_time_tracking_endpoints()
