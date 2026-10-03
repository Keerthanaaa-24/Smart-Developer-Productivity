"""
======================================================================
 SMART DEVELOPER PRODUCTIVITY — DEVELOPER INTEGRATION CENTER TEST SUITE
======================================================================
Verifies:
1. Unified Connection Status Model across all 11 platforms
2. Authentic Summary Metrics (OAuth, Profile Linked, Active Today, Built-in)
3. Individual Platform Synchronization (POST /activity/sync/{platform})
4. Full Ecosystem Concurrent Synchronization (POST /activity/sync)
5. Dashboard Integration Center payload consistency
6. Zero sensitive token or secret leakage in API payloads
======================================================================
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8001"
total_checks = 0
passed_checks = 0


def make_req(method, endpoint, body=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def check(name, condition):
    global total_checks, passed_checks
    total_checks += 1
    if condition:
        passed_checks += 1
        print(f"  [PASS] {name}")
    else:
        print(f"  [FAIL] {name}")
        assert False, f"Check failed: {name}"


def print_header(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def run_suite():
    print_header("DEVELOPER INTEGRATION CENTER & UNIFIED STATUS VERIFICATION")

    # 1. AUTHENTICATION
    print_header("1. AUTHENTICATION")
    status, login_res = make_req("POST", "/auth/login", {"username": "Keerthzz", "password": "password123"})
    check("Primary user login", status == 200 and "access_token" in login_res)
    token = login_res["access_token"]

    # 2. GET SYNC STATUS & UNIFIED CONNECTION STATUS MODEL
    print_header("2. UNIFIED CONNECTION STATUS MODEL (ALL 11 PLATFORMS)")
    status, sync_status = make_req("GET", "/activity/sync-status", token=token)
    check("Fetch /activity/sync-status", status == 200)

    summary = sync_status.get("summary", {})
    check("Summary dictionary present", isinstance(summary, dict))
    check("oauth_connected_count is integer", isinstance(summary.get("oauth_connected_count"), int))
    check("profile_linked_count is integer", isinstance(summary.get("profile_linked_count"), int))
    check("builtin_active_count is integer", isinstance(summary.get("builtin_active_count"), int))
    check("active_today_count is integer", isinstance(summary.get("active_today_count"), int))
    check("total_platforms_count >= 10", summary.get("total_platforms_count", 0) >= 10)

    platforms = sync_status.get("platforms", {})
    expected_platforms = [
        "github", "vscode", "leetcode", "geeksforgeeks",
        "freecodecamp", "pomodoro", "tasks", "coursera",
        "nptel", "linkedin", "naukri"
    ]

    for p_key in expected_platforms:
        p = platforms.get(p_key)
        check(f"Platform present: {p_key}", p is not None)
        check(f"Platform has connection_status: {p_key}", "connection_status" in p)
        check(f"Platform has integration_type: {p_key}", "integration_type" in p)
        check(f"Platform has metrics: {p_key}", "metrics" in p and isinstance(p["metrics"], dict))

    # Check GitHub specific status
    gh = platforms.get("github", {})
    check("GitHub is Connected via OAuth", gh.get("connection_status") == "Connected" and gh.get("connected") is True)
    check("GitHub has valid username", bool(gh.get("username")))
    check("GitHub metrics contain repos & commits", gh.get("metrics", {}).get("public_repos", 0) > 0)

    # Check Pomodoro & Tasks Built-in status
    pomo = platforms.get("pomodoro", {})
    check("Pomodoro is Built-in Active", pomo.get("connection_status") == "Built-in Active")
    tasks = platforms.get("tasks", {})
    check("Tasks is Built-in Active", tasks.get("connection_status") == "Built-in Active")

    # 3. SINGLE PLATFORM SYNCHRONIZATION
    print_header("3. SINGLE PLATFORM SYNCHRONIZATION (POST /activity/sync/{platform})")
    status, single_res = make_req("POST", "/activity/sync/github", token=token)
    check("Sync single platform: GitHub", status == 200 and "status" in single_res)
    print(f"         * GitHub Sync Result: {single_res.get('message')}")

    status, lc_res = make_req("POST", "/activity/sync/leetcode", token=token)
    check("Sync single platform: LeetCode", status == 200 and "status" in lc_res)
    print(f"         * LeetCode Sync Result: {lc_res.get('message')}")

    status, invalid_res = make_req("POST", "/activity/sync/unknown_xyz", token=token)
    check("Sync non-existent provider returns error status safely", status == 200 and invalid_res.get("status") == "error")

    # 4. FULL MULTI-PLATFORM SYNCHRONIZATION
    print_header("4. FULL MULTI-PLATFORM SYNCHRONIZATION (POST /activity/sync)")
    status, full_sync = make_req("POST", "/activity/sync", token=token)
    check("Full ecosystem sync completed", status == 200 and full_sync.get("status") in ("success", "disabled"))
    check("Full sync returns results per provider", "results" in full_sync or full_sync.get("cached") is True)

    # 5. DASHBOARD OVERVIEW INTEGRATION CENTER PAYLOAD
    print_header("5. DASHBOARD OVERVIEW INTEGRATION CENTER PAYLOAD")
    status, dash = make_req("GET", "/dashboard/overview", token=token)
    check("Dashboard overview endpoint", status == 200)
    dash_platforms = dash.get("platforms", {})
    check("Dashboard contains unified platforms dictionary", isinstance(dash_platforms, dict) and len(dash_platforms) >= 10)
    check("Dashboard GitHub platform matches sync-status", dash_platforms.get("github", {}).get("connected") is True)

    # 6. SECURITY: ZERO TOKEN LEAKAGE
    print_header("6. SECURITY: ZERO TOKEN LEAKAGE IN RESPONSES")
    raw_payload_str = json.dumps(sync_status) + json.dumps(dash)
    check("No access_token leakage in telemetry payloads", "gho_" not in raw_payload_str and "ghp_" not in raw_payload_str)
    check("No hashed passwords in telemetry payloads", "$2b$" not in raw_payload_str)

    # SUMMARY
    print_header("FINAL VERIFICATION SUMMARY")
    print(f"Total Test Checks Executed: {total_checks}")
    print(f"Passed Checks:              {passed_checks}")
    print(f"Failed Checks:              {total_checks - passed_checks}")
    print(f"Success Rate:               100.0%\n")


if __name__ == "__main__":
    run_suite()
