import os
import sys
import time
import httpx

BASE_URL = "http://127.0.0.1:8001"

def run_tests():
    print("=" * 70)
    print("STARTING FULL PRODUCTION VERIFICATION AUDIT")
    print("=" * 70)

    client = httpx.Client(timeout=10.0)

    # 1. Health Check
    t0 = time.time()
    res = client.get(f"{BASE_URL}/health")
    t_health = (time.time() - t0) * 1000
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    health_data = res.json()
    assert health_data.get("status") == "healthy"
    print(f"[OK] [HEALTH] /health verified in {t_health:.2f}ms: {health_data}")

    # 2. Auth Flow (Register / Login)
    test_user = f"audit_user_{int(time.time())}"
    test_email = f"{test_user}@test.com"
    test_pass = "TestPassword@123"

    reg_res = client.post(f"{BASE_URL}/auth/register", json={
        "username": test_user,
        "email": test_email,
        "password": test_pass,
        "full_name": "Audit Developer",
    })
    assert reg_res.status_code in [200, 201], f"Register failed: {reg_res.text}"
    token = reg_res.json().get("access_token")
    assert token, "No token returned on register"
    print(f"[OK] [AUTH] User registration & JWT generation verified for '{test_user}'")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. /dashboard/overview
    t0 = time.time()
    dash_res = client.get(f"{BASE_URL}/dashboard/overview", headers=headers)
    t_dash = (time.time() - t0) * 1000
    assert dash_res.status_code == 200, f"Dashboard overview failed: {dash_res.text}"
    dash_data = dash_res.json()
    assert "primary_metrics" in dash_data, "Missing primary_metrics in overview"
    assert "streak" in dash_data, "Missing streak in overview"
    print(f"[OK] [DASHBOARD] /dashboard/overview verified in {t_dash:.2f}ms")

    # 4. /developer-activity/streak
    streak_res = client.get(f"{BASE_URL}/developer-activity/streak", headers=headers)
    assert streak_res.status_code == 200, f"Streak failed: {streak_res.text}"
    streak_data = streak_res.json()
    assert "current_streak" in streak_data
    print(f"[OK] [ANALYTICS] /developer-activity/streak verified: current_streak={streak_data['current_streak']}")

    # 5. /github/status
    gh_status_res = client.get(f"{BASE_URL}/github/status", headers=headers)
    assert gh_status_res.status_code == 200, f"GitHub status failed: {gh_status_res.text}"
    gh_status = gh_status_res.json()
    assert "connected" in gh_status
    print(f"[OK] [GITHUB] /github/status verified (connected={gh_status.get('connected')})")

    # 6. Tasks CRUD
    task_res = client.post(f"{BASE_URL}/tasks", headers=headers, json={
        "title": "Audit Test Task",
        "description": "Verification of task creation",
        "status": "Pending",
        "priority": "High",
    })
    assert task_res.status_code in [200, 201], f"Create task failed: {task_res.text}"
    task_id = task_res.json().get("id") or task_res.json().get("task", {}).get("id")
    print(f"[OK] [TASKS] Task creation verified (id={task_id})")

    # 7. Projects CRUD
    proj_res = client.post(f"{BASE_URL}/projects", headers=headers, json={
        "name": "Audit Test Project",
        "description": "Production performance validation",
        "tech_stack": "React, FastAPI, PostgreSQL",
        "status": "In Progress",
    })
    assert proj_res.status_code in [200, 201], f"Create project failed: {proj_res.text}"
    print(f"[OK] [PROJECTS] Project creation verified")

    # 8. Pomodoro Logging
    pomo_res = client.post(f"{BASE_URL}/pomodoro/session", headers=headers, json={
        "duration_minutes": 25,
        "session_type": "work",
        "completed": True,
    })
    assert pomo_res.status_code in [200, 201], f"Pomodoro session failed: {pomo_res.text}"
    print(f"[OK] [POMODORO] Focus session recording verified")

    # 9. Notifications
    notif_res = client.get(f"{BASE_URL}/notifications", headers=headers)
    assert notif_res.status_code == 200, f"Notifications failed: {notif_res.text}"
    print(f"[OK] [NOTIFICATIONS] Notifications endpoint verified")

    print("=" * 70)
    print("ALL PRODUCTION INTEGRATION VERIFICATION CHECKS PASSED (100%)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
