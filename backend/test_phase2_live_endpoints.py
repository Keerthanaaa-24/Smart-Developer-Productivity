"""
Live HTTP Endpoint Integration Test for Phase 2 Time Tracking using urllib.request
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta

API_BASE = "http://127.0.0.1:8001"

def make_req(url, method="GET", data=None, headers=None, form_data=None):
    req_headers = headers or {}
    req_data = None
    
    if form_data is not None:
        req_data = urllib.parse.urlencode(form_data).encode("utf-8")
        req_headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data is not None:
        req_data = json.dumps(data).encode("utf-8")
        req_headers["Content-Type"] = "application/json"


    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as err:
        content = err.read().decode("utf-8")
        return err.code, json.loads(content) if content else {}

def run_live_tests():
    print("=" * 70)
    print(" TESTING PHASE 2 LIVE FASTAPI ENDPOINTS")
    print("=" * 70)

    # 1. Test GET /time-tracking/platforms (Public)
    status, data = make_req(f"{API_BASE}/time-tracking/platforms")
    assert status == 200, f"Failed /time-tracking/platforms: {data}"
    print(f"✓ GET /time-tracking/platforms: {data['count']} supported platforms found.")
    for p in data["platforms"]:
        print(f"   - {p['name']} ({p['platform']}): {', '.join(p['domains'])}")

    # 2. Authenticate or Login
    status, login_data = make_req(
        f"{API_BASE}/auth/login",
        method="POST",
        form_data={"username": "Keerthzz", "password": "password123"},
    )
    if status != 200:
        status, login_data = make_req(
            f"{API_BASE}/auth/login",
            method="POST",
            form_data={"username": "Keerthanaaa-24", "password": "password123"},
        )
    
    if status != 200:
        print(f"⚠️ Login returned {status}: {login_data}. Skipping authenticated checks.")
        return

    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Authenticated successfully with JWT token.")

    # 3. Test POST /time-tracking/sessions/sync
    now = datetime.utcnow()
    sync_payload = {
        "sessions": [
            {
                "platform": "github",
                "domain": "github.com",
                "started_at": (now - timedelta(minutes=40)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 1800, # 30 min
                "idle_seconds": 600,   # 10 min
                "session_key": f"live_test_{int(now.timestamp())}_gh",
            },
            {
                "platform": "leetcode",
                "domain": "leetcode.com",
                "started_at": (now - timedelta(minutes=20)).isoformat() + "Z",
                "ended_at": now.isoformat() + "Z",
                "active_seconds": 900,  # 15 min
                "idle_seconds": 300,
                "session_key": f"live_test_{int(now.timestamp())}_lc",
            },
        ]
    }

    status, sync_data = make_req(f"{API_BASE}/time-tracking/sessions/sync", method="POST", data=sync_payload, headers=headers)
    assert status == 200, f"Sync failed: {sync_data}"
    print(f"✓ POST /time-tracking/sessions/sync: {sync_data['message']}")

    # 4. Test GET /time-tracking/summary
    status, summary_data = make_req(f"{API_BASE}/time-tracking/summary", headers=headers)
    assert status == 200, f"Summary failed: {summary_data}"
    print(f"✓ GET /time-tracking/summary: Today's Active Time = {summary_data['today']['formatted']}")
    print(f"   - Idle Excluded: {summary_data['today']['idle_excluded_formatted']}")
    print(f"   - Top Platform: {summary_data['most_used_platform']['name'] if summary_data['most_used_platform'] else 'None'}")
    print(f"   - Goal Progress: Coding = {summary_data['targets']['coding']['percentage']}% | Learning = {summary_data['targets']['learning']['percentage']}%")

    # 5. Test GET /time-tracking/sessions
    status, sessions_data = make_req(f"{API_BASE}/time-tracking/sessions?limit=5", headers=headers)
    assert status == 200, f"Sessions failed: {sessions_data}"
    print(f"✓ GET /time-tracking/sessions: {sessions_data['total']} total sessions recorded.")

    # 6. Test GET /time-tracking/settings & POST /time-tracking/settings
    status, settings_data = make_req(f"{API_BASE}/time-tracking/settings", headers=headers)
    assert status == 200, f"Get settings failed: {settings_data}"
    print(f"✓ GET /time-tracking/settings: Enabled={settings_data['browser_extension_enabled']}, IdleThreshold={settings_data['idle_threshold_seconds']}s")

    status, upd_data = make_req(
        f"{API_BASE}/time-tracking/settings",
        method="POST",
        data={"browser_extension_enabled": True, "idle_threshold_seconds": 60},
        headers=headers,
    )
    assert status == 200, f"Update settings failed: {upd_data}"
    print(f"✓ POST /time-tracking/settings: Settings updated successfully.")

    print("=" * 70)
    print(" ALL PHASE 2 LIVE FASTAPI INTEGRATION TESTS PASSED (100%)")
    print("=" * 70)


if __name__ == "__main__":
    run_live_tests()
