"""
Comprehensive Authentication & Registration Repair Test Suite
Phase 6 Complete Flow Verification
"""
import sys
import httpx
from datetime import datetime

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
from jose import jwt
from app.services.auth_service import SECRET_KEY, ALGORITHM

BASE_URL = "http://127.0.0.1:8001"

def run_tests():
    print("=" * 70)
    print("SMART DEVELOPER PRODUCTIVITY — COMPLETE AUTH & DATA VERIFICATION")
    print("=" * 70)

    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    # -------------------------------------------------------------
    # 1. DATABASE & USER INTEGRITY AUDIT (READ-ONLY)
    # -------------------------------------------------------------
    print("\n[SECTION 1] DATABASE INTEGRITY & PRIMARY USER PRESERVATION")
    db = SessionLocal()
    try:
        user1 = db.query(User).filter(User.id == 1).first()
        assert user1 is not None, "Primary User ID 1 not found in database!"
        print(f"  ✅ Primary User: ID=1, Username='{user1.username}', Email='{user1.email}'")

        gh1 = db.query(GitHubConnection).filter(GitHubConnection.user_id == 1).first()
        assert gh1 is not None, "GitHub Connection for User 1 not found!"
        print(f"  ✅ GitHub Connection: Username='{gh1.github_username}', Token={'Valid' if gh1.access_token else 'Missing'}")

        task_count = db.query(Task).filter(Task.user_id == 1).count()
        print(f"  ✅ Tasks: {task_count} active tasks preserved")

        pomo_count = db.query(PomodoroSession).filter(PomodoroSession.user_id == 1).count()
        print(f"  ✅ Pomodoro: {pomo_count} historical sessions preserved")

        act_count = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == 1).count()
        print(f"  ✅ Developer Activities: {act_count} records preserved")

        settings1 = db.query(UserSettings).filter(UserSettings.user_id == 1).first()
        print(f"  ✅ Settings: Theme='{settings1.theme if settings1 else 'light'}', Activity Tracking={settings1.activity_tracking if settings1 else True}")
    finally:
        db.close()

    # -------------------------------------------------------------
    # 2. CORS PREFLIGHT & ORIGIN RECOGNITION TESTS
    # -------------------------------------------------------------
    print("\n[SECTION 2] CORS PREFLIGHT & MULTI-PORT RECOGNITION")
    test_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "https://smart-dev-productivity.vercel.app"
    ]
    for origin in test_origins:
        res = client.options("/auth/login", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        })
        print(f"  ✅ OPTIONS /auth/login from {origin:45} -> {res.status_code} (Allow: {res.headers.get('access-control-allow-origin')})")
        assert res.status_code == 200, f"CORS failed for {origin}"

        res_reg = client.options("/auth/register", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        })
        assert res_reg.status_code == 200, f"CORS failed on register for {origin}"

    # -------------------------------------------------------------
    # 3. REGISTRATION VALIDATION & CREATION TESTS
    # -------------------------------------------------------------
    print("\n[SECTION 3] REGISTRATION TESTS")
    # A. Duplicate Email Check
    dup_email_res = client.post("/auth/register", json={
        "username": "brand_new_user_123",
        "email": "keerthzz@gmail.com",
        "password": "securepassword123"
    })
    print(f"  ✅ Duplicate Email -> {dup_email_res.status_code}: {dup_email_res.json().get('detail')}")
    assert dup_email_res.status_code == 400
    assert "email already exists" in dup_email_res.json().get("detail", "").lower()

    # B. Duplicate Username Check
    dup_user_res = client.post("/auth/register", json={
        "username": "Keerthzz",
        "email": "brand_new_unique_email@example.com",
        "password": "securepassword123"
    })
    print(f"  ✅ Duplicate Username -> {dup_user_res.status_code}: {dup_user_res.json().get('detail')}")
    assert dup_user_res.status_code == 400
    assert "username is already taken" in dup_user_res.json().get("detail", "").lower()

    # C. Short Password Check
    short_pw_res = client.post("/auth/register", json={
        "username": "valid_user_999",
        "email": "valid_user_999@example.com",
        "password": "123"
    })
    print(f"  ✅ Short Password (< 6 chars) -> {short_pw_res.status_code}")
    assert short_pw_res.status_code == 422

    # D. Invalid Email Check
    invalid_email_res = client.post("/auth/register", json={
        "username": "valid_user_999",
        "email": "not-an-email",
        "password": "securepassword123"
    })
    print(f"  ✅ Invalid Email Format -> {invalid_email_res.status_code}")
    assert invalid_email_res.status_code == 422

    # E. Successful Unique Registration
    unique_suffix = int(datetime.utcnow().timestamp())
    test_reg_username = f"test_reg_{unique_suffix}"
    test_reg_email = f"test_reg_{unique_suffix}@example.com"
    test_reg_pw = "ValidPassword123!"

    new_reg_res = client.post("/auth/register", json={
        "username": f"  {test_reg_username}  ",
        "email": f"  {test_reg_email.upper()}  ",
        "password": test_reg_pw
    })
    print(f"  ✅ New Unique User Registration -> {new_reg_res.status_code}: {new_reg_res.json().get('message')}")
    assert new_reg_res.status_code == 200
    reg_data = new_reg_res.json()
    created_id = reg_data.get("user", {}).get("id")
    assert created_id is not None
    assert reg_data.get("user", {}).get("username") == test_reg_username
    assert reg_data.get("user", {}).get("email") == test_reg_email

    # Verify newly created user can log in immediately
    new_user_login = client.post("/auth/login", data={
        "username": test_reg_username,
        "password": test_reg_pw
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"  ✅ Newly Registered User Login -> {new_user_login.status_code}")
    assert new_user_login.status_code == 200

    # Clean up test user
    db = SessionLocal()
    try:
        created_user = db.query(User).filter(User.id == created_id).first()
        if created_user:
            db.delete(created_user)
            db.commit()
            print(f"  ✅ Test user ID {created_id} cleaned up cleanly after verification")
    finally:
        db.close()

    # -------------------------------------------------------------
    # 4. LOGIN MECHANISM & JWT VERIFICATION TESTS
    # -------------------------------------------------------------
    print("\n[SECTION 4] LOGIN & JWT VERIFICATION")
    # A. Login with Username (Form URL-Encoded)
    login_username = client.post("/auth/login", data={
        "username": "Keerthzz",
        "password": "password123"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"  ✅ Username Login ('Keerthzz') -> {login_username.status_code}")
    assert login_username.status_code == 200
    token_username = login_username.json().get("access_token")
    assert token_username is not None

    # B. Login with Email (Case-Insensitive)
    login_email = client.post("/auth/login", data={
        "username": "KEERTHZZ@GMAIL.COM",
        "password": "password123"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"  ✅ Email Login (Uppercase 'KEERTHZZ@GMAIL.COM') -> {login_email.status_code}")
    assert login_email.status_code == 200
    token_email = login_email.json().get("access_token")
    assert token_email is not None

    # C. Login with JSON Payload
    login_json = client.post("/auth/login", json={
        "username": "keerthzz@gmail.com",
        "password": "password123"
    })
    print(f"  ✅ JSON Payload Login -> {login_json.status_code}")
    assert login_json.status_code == 200

    # D. Invalid Password check
    bad_pw_res = client.post("/auth/login", data={
        "username": "Keerthzz",
        "password": "wrong_password_xyz"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"  ✅ Invalid Password -> {bad_pw_res.status_code} (Expected 401)")
    assert bad_pw_res.status_code == 401

    # E. Non-existent user check
    no_user_res = client.post("/auth/login", data={
        "username": "non_existent_account_999",
        "password": "some_password"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    print(f"  ✅ Non-existent Account -> {no_user_res.status_code} (Expected 401)")
    assert no_user_res.status_code == 401

    # F. JWT Payload & Expiry Verification
    decoded = jwt.decode(token_username, SECRET_KEY, algorithms=[ALGORITHM])
    print(f"  ✅ JWT Decoded -> Sub={decoded.get('sub')}, UserID={decoded.get('user_id')}, Username={decoded.get('username')}")
    assert str(decoded.get("user_id")) == "1"
    assert decoded.get("username") == "Keerthzz"

    # -------------------------------------------------------------
    # 5. PROTECTED API ENDPOINT VERIFICATION WITH JWT
    # -------------------------------------------------------------
    print("\n[SECTION 5] PROTECTED API ENDPOINT VERIFICATION")
    headers = {"Authorization": f"Bearer {token_username}"}

    protected_endpoints = [
        ("GET", "/dashboard/overview", "Dashboard Multi-Platform Overview"),
        ("GET", "/dashboard/stats", "Aggregate Productivity Stats"),
        ("GET", "/developer-activity/streak", "Developer Streak & Longest Streak"),
        ("GET", "/github/statistics", "GitHub Repository & Commit Metrics"),
        ("GET", "/tasks/", "Task CRUD List"),
        ("GET", "/activity", "Unified Cross-Platform Activity Timeline"),
        ("GET", "/pomodoro/stats", "Pomodoro Analytics & Focus Time"),
        ("GET", "/settings/profile", "User Profile Configuration"),
    ]

    for method, path, label in protected_endpoints:
        res = client.get(path, headers=headers)
        print(f"  ✅ {method} {path:32} -> {res.status_code} [{label}]")
        assert res.status_code == 200, f"Protected endpoint {path} failed: {res.text}"

    print("\n" + "=" * 70)
    print("🎉 ALL REPAIR & AUDIT VERIFICATION SUITES PASSED (100% SUCCESS)!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
