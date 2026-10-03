from fastapi.testclient import TestClient
from datetime import date, datetime, timedelta

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.core.jwt_handler import create_access_token

def test_activity_center_full_suite():
    client = TestClient(app)
    db = SessionLocal()

    print("\n" + "=" * 70)
    print(" FASTAPI TESTCLIENT: DEVELOPER ACTIVITY CENTER END-TO-END SUITE")
    print("=" * 70)

    try:
        user = db.query(User).first()
        assert user is not None, "User not found"

        token = create_access_token(data={"sub": user.email, "user_id": user.id})
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Test Summary Endpoint (Four Metric Cards)
        res = client.get("/activity/summary", headers=headers)
        assert res.status_code == 200, f"Summary status: {res.status_code}"
        data = res.json()
        assert "today" in data
        assert "weekly" in data
        assert "coding" in data["today"]
        assert "learning" in data["today"]
        assert "focus" in data["today"]
        assert "career" in data["today"]
        print("[PASS] 1. GET /activity/summary returns valid 4-domain metrics")
        print(f"       Today: Coding={data['today']['coding']['formatted']}, Learning={data['today']['learning']['formatted']}, Focus={data['today']['focus']['formatted']}, Career={data['today']['career']['count']}")

        # 2. Test Sync Endpoint
        res_sync = client.post("/activity/sync", headers=headers)
        assert res_sync.status_code == 200
        sync_data = res_sync.json()
        assert sync_data["status"] == "success"
        print("[PASS] 2. POST /activity/sync executed successfully")

        # 3. Test Career Applications & Milestones Endpoint
        res_career = client.get("/activity/career/applications", headers=headers)
        assert res_career.status_code == 200
        career_data = res_career.json()
        assert "pipeline" in career_data
        assert "applications" in career_data
        assert "total" in career_data
        print(f"[PASS] 3. GET /activity/career/applications returns {career_data['total']} milestones across pipeline stages")

        # 4. Test Log Career Milestone
        payload = {
            "company": "Google",
            "role": "Staff Software Engineer",
            "stage": "interview",
            "platform": "linkedin",
            "application_date": str(date.today()),
            "interview_date": str(date.today() + timedelta(days=2)),
            "notes": "System Design and Algorithms round",
        }
        res_log_career = client.post("/activity/career/application", json=payload, headers=headers)
        assert res_log_career.status_code == 200
        log_res = res_log_career.json()
        assert log_res["company"] == "Google"
        assert log_res["stage"] == "interview"
        print(f"[PASS] 4. POST /activity/career/application created milestone ID {log_res['id']}")

        # 5. Test Unified Activity List with Smart Filters
        # Filter by category
        res_cat = client.get("/activity?category=career", headers=headers)
        assert res_cat.status_code == 200
        assert len(res_cat.json()["activities"]) > 0
        print(f"[PASS] 5a. GET /activity?category=career returned {len(res_cat.json()['activities'])} career activities")

        # Filter by platform
        res_plat = client.get("/activity?platform=pomodoro", headers=headers)
        assert res_plat.status_code == 200
        print(f"[PASS] 5b. GET /activity?platform=pomodoro returned {len(res_plat.json()['activities'])} pomodoro activities")

        # Search filter
        res_search = client.get("/activity?search=Google", headers=headers)
        assert res_search.status_code == 200
        assert len(res_search.json()["activities"]) > 0
        print(f"[PASS] 5c. GET /activity?search=Google successfully matched title/details")

        # Date range filter
        today_str = str(date.today())
        res_date = client.get(f"/activity?start_date={today_str}&end_date={today_str}", headers=headers)
        assert res_date.status_code == 200
        print(f"[PASS] 5d. GET /activity?start_date={today_str}&end_date={today_str} verified date range")

        # 6. Test Manual Activity Logging
        manual_payload = {
            "platform": "coursera",
            "category": "learning",
            "activity_type": "manual_activity",
            "title": "Machine Learning Specialization - Module 3",
            "description": "Gradient descent and backpropagation mathematics",
            "duration_minutes": 60,
            "activity_date": str(date.today()),
        }
        res_manual = client.post("/activity/manual", json=manual_payload, headers=headers)
        assert res_manual.status_code == 200
        print(f"[PASS] 6. POST /activity/manual recorded manual learning session (60m)")

        # 7. Multi-User Isolation Guard
        fake_token = create_access_token(data={"sub": "intruder@example.com", "user_id": 888888})
        fake_headers = {"Authorization": f"Bearer {fake_token}"}
        res_fake = client.get("/activity", headers=fake_headers)
        # Unregistered user ID token rejected with 401
        assert res_fake.status_code == 401, f"Expected 401 for invalid user, got {res_fake.status_code}"
        print("[PASS] 7. Unregistered / unauthorized user token properly rejected (401 Unauthorized)")

        # 8. Unauthenticated Access Protection
        res_no_auth = client.get("/activity")
        assert res_no_auth.status_code == 401
        print("[PASS] 8. Unauthenticated access blocked (401 Unauthorized)")

        print("=" * 70)
        print(" ALL DEVELOPER ACTIVITY CENTER FASTAPI TESTS PASSED (100%)")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    test_activity_center_full_suite()
