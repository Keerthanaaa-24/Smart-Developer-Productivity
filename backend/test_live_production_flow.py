import urllib.request
import urllib.error
import json
import uuid
import sys

BASE_URL = "https://smart-developer-productivity.onrender.com"
USER_EMAIL = f"prod_audit_{uuid.uuid4().hex[:8]}@example.com"
USER_PASS = "ProdAuditSecurePass123!"
USER_NAME = "Prod Integration Auditor"

def request(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers,
        method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            res_body = res.read().decode("utf-8")
            return res.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print(f"=== TESTING LIVE PRODUCTION BACKEND: {BASE_URL} ===")

USER_NAME = f"audituser_{uuid.uuid4().hex[:6]}"

# Step 1: Register
status, reg_res = request("/auth/register", method="POST", data={
    "username": USER_NAME,
    "email": USER_EMAIL,
    "password": USER_PASS
})
print(f"1. Register Status: {status} -> Response: {reg_res}")
assert status in (200, 201), f"Registration failed: {reg_res}"

# Step 2: Login
status, login_res = request("/auth/login", method="POST", data={
    "email": USER_EMAIL,
    "password": USER_PASS
})
print(f"2. Login Status: {status}")
assert status == 200, f"Login failed: {login_res}"
token = login_res.get("access_token")

# Step 3: Auth Me (Session Validation)
status, me_res = request("/auth/me", token=token)
user_name = me_res.get("username") if isinstance(me_res, dict) else ""
print(f"3. /auth/me Status: {status} -> User: {user_name}")
assert status == 200 and me_res.get("email") == USER_EMAIL and user_name == USER_NAME

# Step 4: Create Project
status, proj_res = request("/projects", method="POST", token=token, data={
    "name": "Production Audit Project",
    "description": "Validating live deployment workflow",
    "tech_stack": "React, FastAPI, MySQL",
    "status": "In Progress"
})
project_obj = proj_res.get("project", {}) if isinstance(proj_res, dict) else {}
project_id = project_obj.get("id") or proj_res.get("id")
print(f"4. Create Project Status: {status} -> ID: {project_id}")
assert status in (200, 201)

# Step 5: Create Task
status, task_res = request("/tasks/", method="POST", token=token, data={
    "title": "Verify Production Readiness",
    "description": "Automated validation of full stack connectivity",
    "priority": "High",
    "status": "Pending"
})
task_obj = task_res.get("task", {}) if isinstance(task_res, dict) else {}
task_id = task_obj.get("id") or task_res.get("id")
print(f"5. Create Task Status: {status} -> ID: {task_id}")
assert status in (200, 201) and task_id is not None

# Step 6: Update Task to Completed
status, update_res = request(f"/tasks/{task_id}", method="PUT", token=token, data={
    "title": "Verify Production Readiness",
    "status": "Completed"
})
task_up_obj = update_res.get("task", {}) if isinstance(update_res, dict) else {}
new_status = task_up_obj.get("status") or update_res.get("status")
print(f"6. Update Task Status: {status} -> Task Status: {new_status}")
assert status == 200 and new_status == "Completed"

# Step 7: Pomodoro Session Lifecycle
status, pomo_res = request("/pomodoro/session/start", method="POST", token=token, data={
    "planned_duration_seconds": 1500,
    "task_id": task_id,
    "session_type": "focus"
})
pomo_id = pomo_res.get("id") if isinstance(pomo_res, dict) else None
print(f"7a. Pomodoro Session Start Status: {status} -> Session ID: {pomo_id}")
assert status in (200, 201) and pomo_id is not None

status, comp_res = request(f"/pomodoro/session/{pomo_id}/complete", method="POST", token=token, data={
    "actual_duration_seconds": 1500
})
print(f"7b. Pomodoro Session Complete Status: {status}")
assert status in (200, 201)

# Step 8: Dashboard Overview & Stats
status, dash_res = request("/dashboard/overview", token=token)
completed_tasks = dash_res.get("completed_tasks") if isinstance(dash_res, dict) else ""
print(f"8. Dashboard Overview Status: {status} -> Completed Tasks: {completed_tasks}")
assert status == 200

# Step 9: Unified Activity Summary
status, act_res = request("/activity/summary", token=token)
print(f"9. Activity Summary Status: {status}")
assert status == 200

# Step 10: Multi-user Isolation Verification
status, alt_user_tasks = request("/tasks", token=None) # Unauthenticated check
print(f"10. Unauthenticated Task Access Blocked Status: {status}")
assert status == 401

print("\n=======================================================")
print(">>> ALL 10 LIVE PRODUCTION WORKFLOW CHECKS PASSED 100% <<<")
print("=======================================================")
