import httpx

BASE_URL = "http://127.0.0.1:8001"

def test_github_to_dashboard_pipeline():
    print("=" * 70)
    print("GITHUB-TO-DASHBOARD COMPLETE TELEMETRY PIPELINE AUDIT")
    print("=" * 70)

    # 1. Login as primary user (Keerthzz)
    print("\n[STEP 1] Authenticating primary user...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "Keerthzz", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    token_a = res.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    print("[PASS] User Keerthzz authenticated.")

    # 2. Verify GitHub Connected Status
    print("\n[STEP 2] Verifying GitHub Connection Status...")
    res = httpx.get(f"{BASE_URL}/activity/sync-status", headers=headers_a)
    assert res.status_code == 200
    sync_status = res.json()
    gh_status = sync_status.get("platforms", {}).get("github") or sync_status.get("github", {})
    assert gh_status.get("connected") is True, "GitHub is not connected for user"
    assert gh_status.get("sync_mode", "").lower() == "automatic"
    print(f"[PASS] GitHub status: connected=True, mode={gh_status['sync_mode']}")

    # 3. Trigger Manual Activity & Platform Sync (POST /activity/sync)
    print("\n[STEP 3] Triggering Manual Platform Sync (POST /activity/sync)...")
    res = httpx.post(f"{BASE_URL}/activity/sync", headers=headers_a)
    assert res.status_code == 200, f"Sync failed: {res.text}"
    sync_res = res.json()
    assert sync_res["status"] == "success"
    assert "github" in sync_res["results"]
    gh_sync = sync_res["results"]["github"]
    assert gh_sync["status"] == "success"
    print(f"[PASS] GitHub sync completed: {gh_sync['message']} (Items fetched: {gh_sync['items_fetched']})")

    # 4. Verify Duplicate Prevention on Repeated Sync
    print("\n[STEP 4] Testing Idempotency & Deduplication on Repeated Sync...")
    res2 = httpx.post(f"{BASE_URL}/activity/sync", headers=headers_a)
    assert res2.status_code == 200
    sync_res2 = res2.json()
    gh_sync2 = sync_res2["results"]["github"]
    assert gh_sync2["new_activities"] == 0, "Deduplication failed: re-sync inserted duplicate items"
    print("[PASS] Deduplication verified: 0 duplicate events inserted on repeated sync.")

    # 5. Verify Dashboard Overview Telemetry
    print("\n[STEP 5] Querying Dashboard Overview (GET /dashboard/overview)...")
    res = httpx.get(f"{BASE_URL}/dashboard/overview", headers=headers_a)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    dash = res.json()

    # Verify Platforms
    assert "platforms" in dash
    assert "github" in dash["platforms"]
    gh_dash = dash["platforms"]["github"]
    assert gh_dash["connected"] is True
    assert gh_dash["username"] == "Keerthanaaa-24"
    assert gh_dash["total_activities_stored"] >= 10
    print(f"[PASS] Dashboard GitHub Platform Card: connected=True, @{gh_dash['username']}, Total Stored={gh_dash['total_activities_stored']}")

    # Verify Today Summary & Real Duration
    today_sum = dash["today_summary"]
    assert "coding_seconds" in today_sum
    assert "github_activities_today" in today_sum
    assert "github_connected" in today_sum
    assert today_sum["github_connected"] is True
    assert today_sum["github_username"] == "Keerthanaaa-24"
    print(f"[PASS] Today Summary: Coding Duration={today_sum['coding_seconds']}s, GitHub Today={today_sum['github_activities_today']}, Stored in DB={today_sum['github_total_stored']}")

    # Verify 7-Day Trend
    weekly = dash["weekly_productivity"]
    assert len(weekly) == 7
    total_week_acts = sum(w["activities"] for w in weekly)
    print(f"[PASS] 7-Day Productivity Trend: {total_week_acts} total activities across the last week.")
    assert total_week_acts > 0, "Weekly productivity should reflect verified database activities"

    # Verify Streak
    streak = dash["streak"]
    assert streak["current_streak"] >= 1
    assert streak["total_active_days"] >= 1
    print(f"[PASS] Developer Streak: Current={streak['current_streak']} days, Total Active={streak['total_active_days']} days.")

    # 6. Multi-User Isolation Verification
    print("\n[STEP 6] Verifying Strict Multi-User Isolation...")
    # Register/login temporary secondary user
    reg_res = httpx.post(f"{BASE_URL}/auth/register", json={"username": "gh_iso_user", "email": "gh_iso@example.com", "password": "password123"})
    login_b = httpx.post(f"{BASE_URL}/auth/login", data={"username": "gh_iso_user", "password": "password123"}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    token_b = login_b.json()["access_token"]
    dash_b = httpx.get(f"{BASE_URL}/dashboard/overview", headers={"Authorization": f"Bearer {token_b}"}).json()

    assert dash_b["platforms"]["github"]["connected"] is False, "User B should not see User A's GitHub connection"
    assert dash_b["platforms"]["github"]["username"] is None
    assert dash_b["today_summary"]["github_connected"] is False
    assert dash_b["today_summary"]["github_total_stored"] == 0
    assert sum(w["activities"] for w in dash_b["weekly_productivity"]) == 0
    print("[PASS] Strict multi-user isolation confirmed: User B has 0 access to User A's GitHub data.")

    print("\n" + "=" * 70)
    print("ALL GITHUB-TO-DASHBOARD PIPELINE TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    test_github_to_dashboard_pipeline()
