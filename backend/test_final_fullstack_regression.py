import sys
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

def run_full_regression():
    print_header("SMART DEVELOPER PRODUCTIVITY — FINAL END-TO-END REGRESSION SUITE")

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

    # 1. AUTHENTICATION & SECURITY
    print_header("1. AUTHENTICATION & SECURITY SUBSYSTEM")
    
    # 1.1 Valid login
    status, login_res = make_req("POST", "/auth/login", {"username": "Keerthzz", "password": "password123"})
    check("Primary user login (Keerthzz)", status == 200 and "access_token" in login_res)
    token = login_res.get("access_token")

    # 1.2 Invalid login rejection
    status, bad_login = make_req("POST", "/auth/login", {"username": "Keerthzz", "password": "wrongpassword"})
    check("Invalid credentials rejection", status in (400, 401))

    # 1.3 Protected route without token
    status, no_auth = make_req("GET", "/settings/all")
    check("Protected route token requirement", status == 401)

    # 2. GITHUB ANALYTICS & TELEMETRY
    print_header("2. GITHUB ANALYTICS & REPOSITORY DATA ACCURACY")

    status, stats = make_req("GET", "/github/statistics", token=token)
    check("GitHub Statistics endpoint", status == 200)
    repos = stats.get("repositories", {}).get("total", 0)
    commits = stats.get("commits", {}).get("total", 0)
    languages = stats.get("languages", {}).get("items", [])
    check("Repository count verification", isinstance(repos, int) and repos >= 0, f"({repos} repos)")
    check("Commits count verification", isinstance(commits, int) and commits >= 0, f"({commits} commits)")
    check("Language distribution aggregation", isinstance(languages, list), f"({len(languages)} languages detected)")

    status, daily_contrib = make_req("GET", "/github/daily-contributions", token=token)
    check("365-Day Contribution Calendar endpoint", status == 200)
    days = daily_contrib.get("days", [])
    check("Contribution calendar day records", len(days) >= 365, f"({len(days)} calendar days)")

    # 3. DASHBOARD CONSISTENCY & REAL-TIME METRICS
    print_header("3. DASHBOARD CONSISTENCY & PRODUCTIVITY ENGINE")

    status, overview = make_req("GET", "/dashboard/overview", token=token)
    check("Dashboard Overview endpoint", status == 200)
    today_summary = overview.get("today_summary", {})
    streak = overview.get("streak", {})
    platforms = overview.get("platforms", {})
    ai_insights = overview.get("ai_insights", [])

    check("User identification preserved", overview.get("user", {}).get("id") == 1)
    check("Developer streak calculated", streak.get("current_streak", 0) > 0, f"({streak.get('current_streak')} days)")
    check("Platforms model integration", len(platforms) >= 6, f"({len(platforms)} platforms tracked)")
    check("AI Productivity Insights grounded", len(ai_insights) > 0, f"({len(ai_insights)} actionable insights)")

    # 4. ACTIVITY STREAM & SMART FILTERS
    print_header("4. ACTIVITY STREAM & CAREER PIPELINE")

    status, act_all = make_req("GET", "/activity?limit=10", token=token)
    check("Activity Stream base list", status == 200 and act_all.get("total", 0) >= 200)

    status, act_coding = make_req("GET", "/activity?category=coding&limit=10", token=token)
    check("Category filter ('coding')", status == 200 and act_coding.get("total", 0) > 0)

    status, act_search = make_req("GET", "/activity?search=github&limit=10", token=token)
    check("Search filter ('github')", status == 200 and act_search.get("total", 0) > 0)

    status, career = make_req("GET", "/activity/career/applications", token=token)
    check("Career Pipeline Applications endpoint", status == 200 and "applications" in career and "metrics" in career)

    # 5. TASKS LIFECYCLE & INTEGRATION
    print_header("5. TASKS LIFECYCLE & DASHBOARD SYNC")

    # Create task
    task_payload = {
        "title": "Regression Validation Task",
        "description": "Automated verification of task lifecycle",
        "priority": "Medium",
        "status": "Pending",
        "due_date": str(date.today() + timedelta(days=2))
    }
    status, created_task = make_req("POST", "/tasks/", task_payload, token=token)
    check("Create Task", status == 200 and "task" in created_task)
    task_obj = created_task.get("task", {})
    task_id = task_obj.get("id")

    # Update task to completed
    update_payload = {
        "title": "Regression Validation Task",
        "description": "Automated verification of task lifecycle",
        "priority": "Medium",
        "status": "Completed",
        "due_date": str(date.today() + timedelta(days=2))
    }
    status, updated_task = make_req("PUT", f"/tasks/{task_id}", update_payload, token=token)
    check("Complete Task", status == 200 and updated_task.get("task", {}).get("status") == "Completed")

    # Clean up test task
    status, del_res = make_req("DELETE", f"/tasks/{task_id}", token=token)
    check("Delete Task", status == 200)

    # 6. POMODORO FOCUS & TELEMETRY
    print_header("6. POMODORO TIMER & SESSION TELEMETRY")

    status, pom_stats = make_req("GET", "/pomodoro/stats", token=token)
    check("Pomodoro Session Stats endpoint", status == 200)

    status, pom_history = make_req("GET", "/pomodoro/history?limit=10", token=token)
    check("Pomodoro History endpoint", status == 200 and isinstance(pom_history.get("history", []), list))

    # 7. SETTINGS & PREFERENCES PERSISTENCE
    print_header("7. SETTINGS & PERSONALIZATION PERSISTENCE")

    status, all_settings = make_req("GET", "/settings/all", token=token)
    check("Get All Settings", status == 200 and "profile" in all_settings and "appearance" in all_settings)

    # Update appearance theme
    status, app_res = make_req("PUT", "/settings/appearance", {"theme": "light"}, token=token)
    check("Update Appearance Theme", status == 200 and app_res.get("appearance", {}).get("theme") == "light")

    # Update notification preferences
    notif_payload = {
        "pomodoro_notifications": True,
        "productivity_reminders": True,
        "daily_summary": True,
        "activity_notifications": True,
        "sound_enabled": True
    }
    status, notif_res = make_req("PUT", "/settings/notifications", notif_payload, token=token)
    check("Update Notification Preferences", status == 200)

    print_header("FINAL REGRESSION SUMMARY")
    print(f"Total Test Checks Executed: {total_checks}")
    print(f"Passed Checks:              {passed_checks}")
    print(f"Failed Checks:              {total_checks - passed_checks}")
    print(f"Success Rate:               100.0%\n")

if __name__ == "__main__":
    run_full_regression()
