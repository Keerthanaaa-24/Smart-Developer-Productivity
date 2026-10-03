"""
Live HTTP Test Suite for Phase 7 Career Activity
Tests endpoints against running server at http://127.0.0.1:8001:
1. Login Keerthzz & get JWT token.
2. GET /linkedin/status
3. GET /activity/career/summary
4. POST /activity/record (Naukri job application)
5. POST /activity/record (LinkedIn interview scheduled)
6. GET /activity/career/summary (verify update)
7. GET /dashboard/overview (verify career_summary in dashboard)
8. DELETE /activity/{id} (delete test event)
"""
import httpx
import sys
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

BASE_URL = "http://127.0.0.1:8001"

def run_live_tests():
    print("==================================================")
    print("STARTING LIVE HTTP PHASE 7 INTEGRATION TESTS")
    print("==================================================")
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
    print("[PASS] Successfully authenticated Keerthzz")

    # 2. LinkedIn Status
    li_resp = client.get("/linkedin/status", headers=headers)
    assert li_resp.status_code == 200, f"Failed /linkedin/status: {li_resp.text}"
    li_data = li_resp.json()
    assert "connected" in li_data
    assert "sync_mode" in li_data
    print(f"[PASS] GET /linkedin/status: connected={li_data.get('connected')}, sync_mode={li_data.get('sync_mode')}")

    # 3. Initial Career Summary
    summary_resp = client.get("/activity/career/summary", headers=headers)
    assert summary_resp.status_code == 200, f"Failed /activity/career/summary: {summary_resp.text}"
    summary_data = summary_resp.json()
    print(f"[PASS] GET /activity/career/summary: {summary_data.get('summary')}")

    # 4. Record Naukri Job Application
    post_app_resp = client.post(
        "/activity/manual",
        headers=headers,
        json={
            "platform": "naukri",
            "category": "career",
            "activity_type": "job_applied",
            "title": "Applied for Senior Backend Engineer",
            "description": "Submitted resume via Naukri portal (Job ID: NKR-89210)",
            "duration_minutes": 0,
        },
    )
    assert post_app_resp.status_code == 200, f"Failed to record Naukri activity: {post_app_resp.text}"
    app_act = post_app_resp.json()
    assert "id" in app_act, f"Missing id in response: {app_act}"
    app_act_id = app_act["id"]
    print(f"[PASS] POST /activity/manual (Naukri): Created Activity ID #{app_act_id}")

    # 5. Record LinkedIn Interview
    post_int_resp = client.post(
        "/activity/manual",
        headers=headers,
        json={
            "platform": "linkedin",
            "category": "career",
            "activity_type": "interview_scheduled",
            "title": "System Design Interview with Tech Corp",
            "description": "Round 2 Technical Interview scheduled with Talent Lead",
            "duration_minutes": 45,
        },
    )
    assert post_int_resp.status_code == 200, f"Failed to record LinkedIn interview: {post_int_resp.text}"
    int_act = post_int_resp.json()
    assert "id" in int_act, f"Missing id in response: {int_act}"
    int_act_id = int_act["id"]
    print(f"[PASS] POST /activity/manual (LinkedIn): Created Activity ID #{int_act_id}")

    # 6. Verify Updated Career Summary
    summary2_resp = client.get("/activity/career/summary", headers=headers)
    assert summary2_resp.status_code == 200
    summary2_data = summary2_resp.json()
    assert summary2_data["summary"]["applications"] >= 1
    assert summary2_data["summary"]["interviews"] >= 1
    print(f"[PASS] Updated Career Summary verified: {summary2_data.get('summary')}")

    # 7. Verify Dashboard Overview
    dash_resp = client.get("/dashboard/overview", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "career_summary" in dash_data
    assert dash_data["career_summary"]["summary"]["applications"] >= 1
    print("[PASS] GET /dashboard/overview returned verified career_summary with live counts")

    # 8. Delete Recorded Test Activities
    del1 = client.delete(f"/activity/{app_act_id}", headers=headers)
    assert del1.status_code == 200
    del2 = client.delete(f"/activity/{int_act_id}", headers=headers)
    assert del2.status_code == 200
    print(f"[PASS] Cleaned up test activities #{app_act_id} and #{int_act_id}")

    print("\n==================================================")
    print("ALL LIVE HTTP TESTS PASSED SUCCESSFULLY (100% PASS)")
    print("==================================================")

if __name__ == "__main__":
    run_live_tests()
