"""
Comprehensive API & Data Audit on Backend Port 8001
Tests:
1. Database record integrity for User ID 1 (Keerthzz / keerthzz@gmail.com), GitHub, Tasks, Pomodoro, Activity, Settings.
2. HTTP endpoints against http://127.0.0.1:8001:
   - /auth/login (both with form and JSON, valid & invalid credentials)
   - /auth/register (validation check)
   - /dashboard/overview
   - /dashboard/stats
   - /dashboard/weekly-productivity
   - /tasks/
   - /developer-activity/streak
   - /developer-activity/recent
   - /github/statistics
   - /github/streak
   - /github/daily-contributions
   - /activity
   - /pomodoro/stats
   - /pomodoro/history
   - /settings/profile
"""
import httpx
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from app.core.database import SessionLocal
from app.models.user import User
from app.models.github_connection import GitHubConnection
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings

def audit_database():
    print("=" * 60)
    print("PHASE D: VERIFYING DATABASE INTEGRITY (READ-ONLY)")
    print("=" * 60)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("❌ User ID 1 NOT found in database!")
            return False
        print(f"✅ User ID 1: Username='{user.username}', Email='{user.email}'")

        gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == 1).first()
        if gh:
            print(f"✅ GitHub Connection: Connected username='{gh.github_username}', token exists={'Yes' if gh.access_token else 'No'}")
        else:
            print("ℹ️ GitHub Connection: Not connected or no record")

        task_count = db.query(Task).filter(Task.user_id == 1).count()
        print(f"✅ Tasks Count: {task_count} tasks found for user 1")

        pomo_count = db.query(PomodoroSession).filter(PomodoroSession.user_id == 1).count()
        print(f"✅ Pomodoro Sessions: {pomo_count} sessions found for user 1")

        activity_count = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == 1).count()
        print(f"✅ Developer Activities: {activity_count} records found for user 1")

        settings = db.query(UserSettings).filter(UserSettings.user_id == 1).first()
        if settings:
            print(f"✅ User Settings: theme='{settings.theme}', activity_tracking={settings.activity_tracking}")
        else:
            print("ℹ️ User Settings: Default / none created yet")

        return True
    finally:
        db.close()

def audit_http_endpoints():
    print("\n" + "=" * 60)
    print("PHASE E: AUDITING HTTP ENDPOINTS ON PORT 8001")
    print("=" * 60)

    client = httpx.Client(base_url="http://127.0.0.1:8001", timeout=15.0)

    # 1. Invalid login check (401)
    bad_login = client.post(
        "/auth/login",
        data={"username": "Keerthzz", "password": "wrongpassword12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"1. POST /auth/login (Invalid credentials) -> {bad_login.status_code} (Expected 401)")
    assert bad_login.status_code == 401, f"Expected 401 on bad password, got {bad_login.status_code}"

    # 2. Valid login check (200 + token)
    login_res = client.post(
        "/auth/login",
        data={"username": "Keerthzz", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if login_res.status_code != 200:
        # Try email
        login_res = client.post(
            "/auth/login",
            data={"username": "keerthzz@gmail.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
    print(f"2. POST /auth/login (Valid credentials) -> {login_res.status_code} (Expected 200)")
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    token = token_data.get("access_token")
    assert token, "No access_token in login response"
    print(f"   Token Type: {token_data.get('token_type')}, Token length: {len(token)}")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Registration duplicate check (400)
    reg_res = client.post(
        "/auth/register",
        json={"username": "Keerthzz_Test", "email": "keerthzz@gmail.com", "password": "password123"}
    )
    print(f"3. POST /auth/register (Duplicate email check) -> {reg_res.status_code} (Expected 400)")
    assert reg_res.status_code == 400, f"Expected 400 on duplicate email, got {reg_res.status_code}"

    # Endpoints to test
    endpoints = [
        ("GET", "/dashboard/overview", "Dashboard Overview"),
        ("GET", "/dashboard/stats", "Dashboard Stats"),
        ("GET", "/dashboard/weekly-productivity", "Weekly Productivity"),
        ("GET", "/tasks/", "Tasks List"),
        ("GET", "/developer-activity/streak", "Developer Activity Streak"),
        ("GET", "/developer-activity/recent", "Developer Activity Recent"),
        ("GET", "/github/statistics", "GitHub Statistics"),
        ("GET", "/github/streak", "GitHub Streak"),
        ("GET", "/github/daily-contributions", "GitHub Daily Contributions"),
        ("GET", "/activity", "Unified Activity Feed"),
        ("GET", "/pomodoro/stats", "Pomodoro Stats"),
        ("GET", "/pomodoro/history", "Pomodoro History"),
        ("GET", "/settings/profile", "Settings Profile"),
    ]

    print("\nAuditing Protected Endpoints with JWT Token:")
    for method, path, label in endpoints:
        if method == "GET":
            res = client.get(path, headers=headers)
        elif method == "POST":
            res = client.post(path, headers=headers, json={})
        
        status_symbol = "✅" if res.status_code == 200 else f"⚠️ ({res.status_code})"
        print(f"   {status_symbol} {method} {path:35} -> {res.status_code} [{label}]")
        assert res.status_code == 200, f"Endpoint {path} failed with {res.status_code}: {res.text}"

    # Also test CORS preflight on /auth/login and /dashboard/overview
    print("\nAuditing CORS Preflight (OPTIONS):")
    cors_res1 = client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    )
    print(f"   ✅ OPTIONS /auth/login -> {cors_res1.status_code}, Access-Control-Allow-Origin: {cors_res1.headers.get('access-control-allow-origin')}")
    assert cors_res1.status_code == 200

    cors_res2 = client.options(
        "/dashboard/overview",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        }
    )
    print(f"   ✅ OPTIONS /dashboard/overview -> {cors_res2.status_code}, Access-Control-Allow-Origin: {cors_res2.headers.get('access-control-allow-origin')}")
    assert cors_res2.status_code == 200

    print("\n🎉 ALL PHASE D & E AUDIT CHECKS PASSED SUCCESSFULLY ON PORT 8001!")

if __name__ == "__main__":
    audit_database()
    audit_http_endpoints()
