import json
import urllib.request
import urllib.parse
from datetime import date, datetime, timedelta

BASE_URL = "http://127.0.0.1:8001"

def print_header(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def make_req(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            return res.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_body)
        except Exception:
            parsed = {"error": res_body}
        return e.code, parsed

def run_suite():
    print_header("SMART DEVELOPER PRODUCTIVITY — FINAL COMMAND CENTER & 5 METRICS VERIFICATION")

    total_checks = 0
    passed_checks = 0

    def check(name, condition, extra=""):
        nonlocal total_checks, passed_checks
        total_checks += 1
        if condition:
            passed_checks += 1
            print(f"  [PASS] {name} {extra}")
        else:
            print(f"  [FAIL] {name} {extra}")
            assert False, f"Check failed: {name}"

    # 1. AUTHENTICATION & LOGIN STREAK INGESTION
    print_header("1. AUTHENTICATION & AUTHENTIC LOGIN STREAK")

    status, login_res = make_req("POST", "/auth/login", {"username": "Keerthzz", "password": "password123"})
    check("Primary user login (Keerthzz)", status == 200 and "access_token" in login_res)
    token = login_res.get("access_token")

    status, login_streak = make_req("GET", "/auth/login-streak", token=token)
    check("Get Authentic Login Streak", status == 200)
    check("Login Streak data structure", "current_streak" in login_streak and "longest_streak" in login_streak)
    print(f"         * Current Login Streak: {login_streak.get('current_streak')} days")
    print(f"         * Longest Login Streak: {login_streak.get('longest_streak')} days")
    print(f"         * Total Login Days:     {login_streak.get('total_login_days')} days")

    # 2. DASHBOARD 5 PRIMARY METRICS CONTRACT
    print_header("2. DASHBOARD 5 PRIMARY PRODUCTIVITY METRICS")

    status, overview = make_req("GET", "/dashboard/overview", token=token)
    check("Dashboard Overview endpoint", status == 200)
    metrics = overview.get("primary_metrics", {})
    check("Primary metrics dictionary present", "coding" in metrics and "focus" in metrics and "tasks" in metrics and "login_streak" in metrics and "productivity" in metrics)

    # 2.1 Coding Metric
    coding = metrics.get("coding", {})
    check("Metric 1: Coding Time", "seconds" in coding and "formatted" in coding, f"({coding.get('formatted')})")

    # 2.2 Pomodoro Focus Metric
    focus = metrics.get("focus", {})
    check("Metric 2: Pomodoro Focus Time", "seconds" in focus and "formatted" in focus, f"({focus.get('formatted')})")

    # 2.3 Tasks Metric
    tasks_m = metrics.get("tasks", {})
    check("Metric 3: Tasks Execution", "completed" in tasks_m and "total" in tasks_m and "percentage" in tasks_m, f"({tasks_m.get('completed')}/{tasks_m.get('total')} tasks, {tasks_m.get('percentage')}%)")

    # 2.4 Login Streak Metric
    streak_m = metrics.get("login_streak", {})
    check("Metric 4: Login Streak", "current_streak" in streak_m and streak_m.get("current_streak") >= 1, f"({streak_m.get('current_streak')} days)")

    # 2.5 Productivity Score Metric
    prod_m = metrics.get("productivity", {})
    check("Metric 5: Productivity Score", "score" in prod_m and "breakdown" in prod_m, f"(Score: {prod_m.get('score')}/100)")
    breakdown = prod_m.get("breakdown", {})
    check("Score breakdown weights", "coding" in breakdown and "focus" in breakdown and "tasks" in breakdown and "login" in breakdown)

    # 3. PROJECT PORTFOLIO CRUD
    print_header("3. PROJECT PORTFOLIO CRUD & TASK LINKING")

    # Create Project
    proj_payload = {
        "name": "Smart Dev Automated Suite",
        "description": "Automated developer productivity tracking suite",
        "tech_stack": "FastAPI, React, Vite, MySQL",
        "status": "In Progress",
        "github_repo_url": "https://github.com/Keerthanaaa-24/Smart-Developer-Productivity"
    }
    status, created_p = make_req("POST", "/projects", proj_payload, token=token)
    check("Create Project", status == 200 and "project" in created_p)
    proj_id = created_p.get("project", {}).get("id")

    # List Projects
    status, proj_list = make_req("GET", "/projects", token=token)
    check("List Projects", status == 200 and len(proj_list) >= 1)

    # Update Project
    update_p = {
        "name": "Smart Dev Automated Suite (Updated)",
        "status": "Completed"
    }
    status, updated_res = make_req("PUT", f"/projects/{proj_id}", update_p, token=token)
    check("Update Project Status", status == 200 and updated_res.get("project", {}).get("status") == "Completed")

    # Delete Project
    status, del_p = make_req("DELETE", f"/projects/{proj_id}", token=token)
    check("Delete Project", status == 200)

    # 4. PRIVACY-FIRST EXTENSION TELEMETRY INGESTION
    print_header("4. PRIVACY-FIRST EXTENSION TELEMETRY INGESTION (VS CODE & BROWSER)")

    now_iso = datetime.utcnow().isoformat()
    ext_payload = {
        "events": [
            {
                "platform": "vscode",
                "category": "coding",
                "activity_type": "coding_session",
                "title": "VS Code: Active coding in SmartDev",
                "details": "Active coding session in SmartDev (javascript)",
                "started_at": now_iso,
                "ended_at": now_iso,
                "duration_seconds": 300,
                "source": "vscode_extension",
                "extension_event_id": f"test_vsc_{datetime.utcnow().timestamp()}"
            }
        ]
    }
    status, sync_res = make_req("POST", "/activity/extension-sync", ext_payload, token=token)
    check("Ingest VS Code Telemetry", status == 200 and sync_res.get("status") == "success")

    # Ingest duplicate to verify deduplication
    status, dup_res = make_req("POST", "/activity/extension-sync", ext_payload, token=token)
    check("Idempotent Telemetry Deduplication", status == 200 and dup_res.get("duplicate_count") == 1)

    print_header("FINAL VERIFICATION SUMMARY")
    print(f"Total Test Checks Executed: {total_checks}")
    print(f"Passed Checks:              {passed_checks}")
    print(f"Failed Checks:              {total_checks - passed_checks}")
    print(f"Success Rate:               100.0%\n")

if __name__ == "__main__":
    run_suite()
