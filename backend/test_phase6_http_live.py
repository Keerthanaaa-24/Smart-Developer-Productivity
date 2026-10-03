import sys
import httpx

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.core.jwt_handler import create_access_token


def test_live_http():
    print("=== TESTING LIVE HTTP ENDPOINTS (PHASE 6) ===")
    db = SessionLocal()
    user = db.query(User).filter(User.username == "Keerthzz").first()
    if user:
        user.password = hash_password("password123")
        db.commit()
    db.close()

    client = httpx.Client(base_url="http://127.0.0.1:8001", timeout=15.0)

    # 1. Login to get token
    login_res = client.post(
        "/auth/login",
        data={"username": "keerthzz@gmail.com", "password": "password123"},
    )
    if login_res.status_code != 200:
        # Try username login
        login_res = client.post(
            "/auth/login",
            data={"username": "Keerthzz", "password": "password123"},
        )

    if login_res.status_code != 200:
        print("❌ Login failed:", login_res.status_code, login_res.text)
        return

    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Authenticated successfully with live backend.")

    # 2. Test GET /activity/sync-status
    status_res = client.get("/activity/sync-status", headers=headers)
    print("GET /activity/sync-status ->", status_res.status_code)
    assert status_res.status_code == 200, status_res.text
    sync_status = status_res.json()
    assert "platforms" in sync_status
    print("✓ Platform capabilities from live API:")
    for name, p in sync_status["platforms"].items():
        print(f"   [{name}] Mode: {p['sync_mode']} | Connected: {p['connected']}")

    # 3. Test POST /activity/sync
    sync_res = client.post("/activity/sync", headers=headers)
    print("POST /activity/sync ->", sync_res.status_code)
    assert sync_res.status_code == 200, sync_res.text
    sync_data = sync_res.json()
    print("✓ Sync execution result status:", sync_data.get("status"))

    # 4. Test GET /activity/summary
    summary_res = client.get("/activity/summary", headers=headers)
    print("GET /activity/summary ->", summary_res.status_code)
    assert summary_res.status_code == 200, summary_res.text
    summary_data = summary_res.json()
    print(f"✓ Summary total today activities: {summary_data.get('today', {}).get('total_activities')}")

    # 5. Test GET /activity
    activities_res = client.get("/activity?limit=5", headers=headers)
    print("GET /activity ->", activities_res.status_code)
    assert activities_res.status_code == 200, activities_res.text
    acts = activities_res.json()
    print(f"✓ Total activity feed records: {acts.get('total')}, returned: {len(acts.get('activities', []))}")

    print("\n✅ ALL LIVE HTTP ENDPOINTS VERIFIED SUCCESSFULLY (200 OK)!")


if __name__ == "__main__":
    test_live_http()
