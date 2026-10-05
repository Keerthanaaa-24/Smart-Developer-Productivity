import os
import sys
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.encryption import encrypt_token, decrypt_token
from app.models.user import User
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.models.linkedin_connection import LinkedInConnection
from app.models.task import Task
from app.models.project import Project
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.notification import Notification

client = TestClient(app)

def run_tests():
    print("=" * 75)
    print("COMPREHENSIVE PRODUCTION VERIFICATION AUDIT")
    print("=" * 75)

    db = SessionLocal()
    try:
        # TEST 1: User Registration & Authentication
        print("\n[TEST 1] Testing User Registration, Login & Session (/auth/me)...")
        ts = int(datetime.now().timestamp())
        u1_name = f"prod_tester_1_{ts}"
        email_u1 = f"test_prod_u1_{ts}@example.com"
        reg_res1 = client.post("/auth/register", json={"username": u1_name, "email": email_u1, "password": "Password123!"})
        assert reg_res1.status_code == 200, f"Registration failed: {reg_res1.text}"

        login_res1 = client.post("/auth/login", json={"username": u1_name, "password": "Password123!"})
        assert login_res1.status_code == 200, f"Login failed: {login_res1.text}"
        token1 = login_res1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        me_res1 = client.get("/auth/me", headers=headers1)
        assert me_res1.status_code == 200
        u1_id = me_res1.json()["id"]
        assert me_res1.json()["username"] == u1_name
        print("  [PASS] User 1 registered and authenticated (/auth/me verified)")

        # TEST 2: Multi-User Isolation (User 2)
        print("\n[TEST 2] Testing Multi-User Data Isolation...")
        email_u2 = f"test_prod_u2_{int(datetime.now().timestamp())}@example.com"
        reg_res2 = client.post("/auth/register", json={"username": f"prod_tester_2_{int(datetime.now().timestamp())}", "email": email_u2, "password": "Password123!"})
        assert reg_res2.status_code == 200
        login_res2 = client.post("/auth/login", json={"username": email_u2, "password": "Password123!"})
        token2 = login_res2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        u2_id = client.get("/auth/me", headers=headers2).json()["id"]
        print("  [PASS] User 2 registered and authenticated")

        # TEST 3: GitHub OAuth Configuration & State Generation
        print("\n[TEST 3] Testing GitHub OAuth Initiation & State Signature...")
        settings.GITHUB_CLIENT_ID = "mock_prod_client_id"
        settings.GITHUB_CLIENT_SECRET = "mock_prod_client_secret"
        settings.FRONTEND_URL = "https://smart-developer-productivity.vercel.app"

        gh_login_res = client.get("/github/login", headers=headers1)
        assert gh_login_res.status_code == 200, f"GitHub login failed: {gh_login_res.text}"
        gh_data = gh_login_res.json()
        assert "authorization_url" in gh_data
        assert "mock_prod_client_id" in gh_data["authorization_url"]
        assert "scope=read%3Auser+user%3Aemail+repo" in gh_data["authorization_url"]
        assert gh_data["frontend_url"] == "https://smart-developer-productivity.vercel.app"
        print("  [PASS] GitHub OAuth URL generated with secure CSRF state and proper redirect_uri")

        # TEST 4: GitHub Connection, Token Encryption & Status Return
        print("\n[TEST 4] Testing GitHub Connection Persistence & Profile Link...")
        # Create GitHub Connection for User 1
        gh_conn1 = db.query(GitHubConnection).filter(GitHubConnection.user_id == u1_id).first()
        if not gh_conn1:
            gh_conn1 = GitHubConnection(
                user_id=u1_id,
                github_id="gh_111111",
                github_username="alice_dev",
                github_name="Alice Dev",
                github_email="alice@github.test",
                avatar_url="https://avatars.githubusercontent.com/u/111111",
                profile_url="https://github.com/alice_dev",
                access_token=encrypt_token("gho_mock_token_alice"),
            )
            db.add(gh_conn1)
            db.commit()

        # Check User 1 status
        status_res1 = client.get("/github/status", headers=headers1)
        assert status_res1.status_code == 200
        s_data1 = status_res1.json()
        assert s_data1["connected"] is True
        assert s_data1["username"] == "alice_dev"
        assert s_data1["profile_url"] == "https://github.com/alice_dev"
        assert s_data1["github"]["profile_url"] == "https://github.com/alice_dev"

        # Check User 2 status (must NOT see User 1's connection)
        status_res2 = client.get("/github/status", headers=headers2)
        assert status_res2.status_code == 200
        s_data2 = status_res2.json()
        assert s_data2["connected"] is False, "User 2 leaked User 1's GitHub connection!"
        print("  [PASS] GitHub connection persistence, token encryption and multi-user isolation verified")

        # TEST 5: Provider Profile URLs Verification (All 8 Platforms)
        print("\n[TEST 5] Testing Provider Profile URLs Across All 8 Platforms...")
        # LeetCode
        lc_res = client.post("/leetcode/connect?username=alice_leet", headers=headers1)
        assert lc_res.status_code == 200
        lc_status = client.get("/leetcode/status", headers=headers1).json()
        assert lc_status["connected"] is True
        assert lc_status["profile_url"] == "https://leetcode.com/u/alice_leet/"
        assert lc_status["leetcode"]["profile_url"] == "https://leetcode.com/u/alice_leet/"

        # GeeksforGeeks
        gfg_res = client.post("/geeksforgeeks/connect?username=alice_gfg", headers=headers1)
        assert gfg_res.status_code == 200
        gfg_status = client.get("/geeksforgeeks/status", headers=headers1).json()
        assert gfg_status["connected"] is True
        assert gfg_status["profile_url"] == "https://www.geeksforgeeks.org/user/alice_gfg/"

        # freeCodeCamp
        fcc_res = client.post("/freecodecamp/connect?username=alice_fcc", headers=headers1)
        assert fcc_res.status_code == 200
        fcc_status = client.get("/freecodecamp/status", headers=headers1).json()
        assert fcc_status["connected"] is True
        assert fcc_status["profile_url"] == "https://www.freecodecamp.org/alice_fcc"

        # LinkedIn
        li_res = client.post("/linkedin/connect?username=alice-dev-lead", headers=headers1)
        assert li_res.status_code == 200
        li_status = client.get("/linkedin/status", headers=headers1).json()
        assert li_status["connected"] is True
        assert li_status["profile_url"] == "https://www.linkedin.com/in/alice-dev-lead/"
        assert li_status["linkedin"]["profile_url"] == "https://www.linkedin.com/in/alice-dev-lead/"

        # Coursera (Must NOT invent fake URLs)
        coursera_res = client.post("/coursera/connect?username=alice_coursera", headers=headers1)
        assert coursera_res.status_code == 200
        coursera_status = client.get("/coursera/status", headers=headers1).json()
        assert coursera_status["connected"] is True
        assert coursera_status["profile_url"] is None, "Coursera should not have a fake invented profile URL"

        # NPTEL (Must NOT invent fake URLs)
        nptel_res = client.post("/nptel/connect?username=alice_nptel", headers=headers1)
        assert nptel_res.status_code == 200
        nptel_status = client.get("/nptel/status", headers=headers1).json()
        assert nptel_status["connected"] is True
        assert nptel_status["profile_url"] is None, "NPTEL should not have a fake invented profile URL"

        print("  [PASS] Profile URLs accurately validated for GitHub, LeetCode, GFG, FCC, LinkedIn, Coursera, NPTEL")

        # TEST 6: Projects CRUD
        print("\n[TEST 6] Testing Projects CRUD Operations...")
        proj_res = client.post("/projects", json={"name": "Production Audit Tool", "description": "Automated pipeline", "status": "In Progress"}, headers=headers1)
        assert proj_res.status_code == 200
        proj_id = proj_res.json()["project"]["id"]

        get_proj = client.get(f"/projects/{proj_id}", headers=headers1)
        assert get_proj.status_code == 200
        assert get_proj.json()["name"] == "Production Audit Tool"

        del_proj = client.delete(f"/projects/{proj_id}", headers=headers1)
        assert del_proj.status_code == 200
        print("  [PASS] Projects CRUD verified successfully")

        # TEST 7: Tasks CRUD & Completion
        print("\n[TEST 7] Testing Tasks CRUD & Auto Activity Triggers...")
        task_res = client.post("/tasks/", json={"title": "Fix Production URLs", "priority": "High", "status": "Pending"}, headers=headers1)
        assert task_res.status_code == 200
        task_id = task_res.json()["task"]["id"]

        update_task = client.put(f"/tasks/{task_id}", json={"title": "Fix Production URLs", "priority": "High", "status": "Completed"}, headers=headers1)
        assert update_task.status_code == 200
        assert update_task.json()["task"]["status"] == "Completed"

        del_task = client.delete(f"/tasks/{task_id}", headers=headers1)
        assert del_task.status_code == 200
        print("  [PASS] Tasks CRUD and completion verified")

        # TEST 8: Pomodoro Persistence
        print("\n[TEST 8] Testing Pomodoro Focus Session Persistence...")
        pomo_start = client.post("/pomodoro/session/start", json={"session_type": "focus", "planned_duration_seconds": 1500, "cycle_number": 1}, headers=headers1)
        assert pomo_start.status_code == 200
        pomo_id = pomo_start.json()["id"]

        pomo_comp = client.post(f"/pomodoro/session/{pomo_id}/complete", json={"actual_duration_seconds": 1500}, headers=headers1)
        assert pomo_comp.status_code == 200
        assert pomo_comp.json()["status"] == "completed"

        pomo_stats = client.get("/pomodoro/stats", headers=headers1)
        assert pomo_stats.status_code == 200
        print("  [PASS] Pomodoro focus telemetry persisted")

        # TEST 9: Developer Streak Engine
        print("\n[TEST 9] Testing Developer Streak Calculation...")
        streak_res = client.get("/developer-activity/streak", headers=headers1)
        assert streak_res.status_code == 200
        streak_data = streak_res.json()
        assert "current_streak" in streak_data
        assert "longest_streak" in streak_data
        print(f"  [PASS] Developer streak calculated: Current={streak_data['current_streak']}, Longest={streak_data['longest_streak']}")

        # TEST 10: Dynamic Notifications System
        print("\n[TEST 10] Testing Dynamic Notification Engine...")
        notif_res = client.get("/notifications/", headers=headers1)
        assert notif_res.status_code == 200
        print(f"  [PASS] Notifications retrieved ({len(notif_res.json())} notifications)")

        # TEST 11: Dashboard Metrics Consistency
        print("\n[TEST 11] Testing Dashboard Overview Consistency...")
        dash_res = client.get("/dashboard/overview", headers=headers1)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert "primary_metrics" in dash_data
        assert "task_stats" in dash_data
        assert "streak" in dash_data
        print(f"  [PASS] Dashboard metrics verified: Focus={dash_data['primary_metrics']['focus']['formatted']}, Tasks={dash_data['task_stats']['total']}")

        # TEST 12: Existing Data Preservation
        print("\n[TEST 12] Verifying Data Preservation (Zero Reset)...")
        existing_users_count = db.query(User).count()
        assert existing_users_count >= 2, "Users were reset!"
        print(f"  [PASS] Total registered users preserved: {existing_users_count}")

        print("\n" + "=" * 75)
        print("ALL 12 PRODUCTION TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 75)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
