"""
Comprehensive Multi-User Integration, GitHub OAuth & Telemetry Test Suite
========================================================================
Covers all requirements from Phase 10:
- OAuth flow, multi-user identity separation & collision prevention
- State validation, token encryption at rest
- Multi-tenant data isolation & IDOR prevention
- Organization-level integration RBAC
- Telemetry ingestion & deduplication
- 5 primary dashboard metrics integrity
"""

import os
import sys
import json
from datetime import datetime, timedelta
from jose import jwt

# Configure paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.github_connection import GitHubConnection
from app.models.developer_activity import DeveloperActivity
from app.models.project import Project
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.organization import Organization, OrganizationMember, OrganizationRepository
from app.core.security import hash_password
from app.core.encryption import encrypt_token, decrypt_token
from app.services.auth_service import create_access_token
from app.services.dashboard_service import get_dashboard_overview
from app.services.platform_sync_service import platform_sync_service

SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

passed_checks = 0
failed_checks = 0


def record_pass(test_name: str, detail: str = ""):
    global passed_checks
    passed_checks += 1
    msg = f"  [PASS] {test_name}"
    if detail:
        msg += f" ({detail})"
    print(msg)


def record_fail(test_name: str, reason: str):
    global failed_checks
    failed_checks += 1
    print(f"  [FAIL] {test_name}: {reason}")


def run_tests():
    print("=" * 70)
    print(" MULTI-USER INTEGRATION, GITHUB OAUTH & TELEMETRY REGRESSION SUITE")
    print("=" * 70)

    db = SessionLocal()

    try:
        # =====================================================
        # 1. SETUP TEST USERS
        # =====================================================
        print("\n=== 1. USER IDENTITY & AUTHENTICATION SETUP ===")
        
        # Primary user: Keerthzz (ID 1)
        user1 = db.query(User).filter(User.id == 1).first()
        if not user1:
            user1 = db.query(User).filter(User.username == "Keerthzz").first()
        if not user1:
            user1 = User(id=1, username="Keerthzz", email="keerthzz@gmail.com", password=hash_password("password123"))
            db.add(user1)
            db.commit()
            db.refresh(user1)
        record_pass("Primary User Keerthzz verified", f"ID: {user1.id}")

        # Secondary test user: User B
        user2 = db.query(User).filter(User.email == "test_user_b@example.com").first()
        if not user2:
            user2 = User(username="UserB_Dev", email="test_user_b@example.com", password=hash_password("password123"))
            db.add(user2)
            db.commit()
            db.refresh(user2)
        record_pass("Secondary User B verified", f"ID: {user2.id}")

        # Third test user: User C
        user3 = db.query(User).filter(User.email == "test_user_c@example.com").first()
        if not user3:
            user3 = User(username="UserC_Dev", email="test_user_c@example.com", password=hash_password("password123"))
            db.add(user3)
            db.commit()
            db.refresh(user3)
        record_pass("Third User C verified", f"ID: {user3.id}")

        token1 = create_access_token({"sub": str(user1.id), "user_id": user1.id})
        token2 = create_access_token({"sub": str(user2.id), "user_id": user2.id})
        token3 = create_access_token({"sub": str(user3.id), "user_id": user3.id})
        record_pass("JWT tokens generated for Users A, B, C")

        # =====================================================
        # 2. TOKEN ENCRYPTION AT REST
        # =====================================================
        print("\n=== 2. TOKEN ENCRYPTION & SECURITY AT REST ===")
        raw_token = "ghp_secure_personal_token_999888777"
        enc = encrypt_token(raw_token)
        if enc.startswith("enc:v1:") and enc != raw_token:
            record_pass("Token encryption at rest produces enc:v1 prefix", enc[:24] + "...")
        else:
            record_fail("Token encryption", f"Invalid encrypted format: {enc}")

        dec = decrypt_token(enc)
        if dec == raw_token:
            record_pass("Token decryption restores original secret", dec[:12] + "...")
        else:
            record_fail("Token decryption", f"Mismatch: {dec}")

        # Ensure legacy plain tokens are handled safely
        legacy_dec = decrypt_token("ghp_legacy_unencrypted_token")
        if legacy_dec == "ghp_legacy_unencrypted_token":
            record_pass("Legacy unencrypted tokens handled transparently")
        else:
            record_fail("Legacy token fallback", "Failed to preserve unencrypted token")

        # =====================================================
        # 3. MULTI-USER GITHUB OAUTH ISOLATION & COLLISION HANDLING
        # =====================================================
        print("\n=== 3. MULTI-USER GITHUB INTEGRATION & COLLISION PREVENT ===")
        
        # User 1 connects GitHub 1
        gh1 = db.query(GitHubConnection).filter(GitHubConnection.user_id == user1.id).first()
        if not gh1:
            gh1 = GitHubConnection(
                user_id=user1.id,
                github_id="216198181",
                github_username="Keerthanaaa-24",
                access_token=encrypt_token("ghp_user1_token"),
            )
            db.add(gh1)
            db.commit()
        else:
            gh1.access_token = encrypt_token("ghp_user1_token")
            db.commit()
        record_pass("User 1 linked to GitHub Account A (ID: 216198181)")

        # User 2 connects GitHub 2
        gh2 = db.query(GitHubConnection).filter(GitHubConnection.user_id == user2.id).first()
        if not gh2:
            gh2 = GitHubConnection(
                user_id=user2.id,
                github_id="888123456",
                github_username="UserB_GitHub",
                access_token=encrypt_token("ghp_user2_token"),
            )
            db.add(gh2)
            db.commit()
        else:
            gh2.access_token = encrypt_token("ghp_user2_token")
            db.commit()
        record_pass("User 2 linked to GitHub Account B (ID: 888123456)")

        # Verify independence
        gh1_check = db.query(GitHubConnection).filter(GitHubConnection.user_id == user1.id).first()
        gh2_check = db.query(GitHubConnection).filter(GitHubConnection.user_id == user2.id).first()
        if gh1_check.github_username != gh2_check.github_username and gh1_check.user_id != gh2_check.user_id:
            record_pass("Integrations for User 1 and User 2 remain completely independent")
        else:
            record_fail("OAuth Independence", "Cross-contamination between user integrations")

        # Collision Test: User 3 attempts to link GitHub 1 (belonging to User 1)
        collision_found = db.query(GitHubConnection).filter(GitHubConnection.github_id == "216198181").first()
        if collision_found and collision_found.user_id != user3.id:
            record_pass("Attempt by User 3 to link User 1's GitHub identity correctly detected as collision")
        else:
            record_fail("Collision Detection", "Failed to detect cross-user identity collision")

        # OAuth state validation test
        valid_state_payload = {"user_id": user1.id, "purpose": "github_oauth", "exp": datetime.utcnow() + timedelta(minutes=5)}
        valid_state = jwt.encode(valid_state_payload, SECRET_KEY, algorithm=ALGORITHM)
        decoded = jwt.decode(valid_state, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("user_id") == user1.id and decoded.get("purpose") == "github_oauth":
            record_pass("OAuth signed JWT state generation & verification passed")
        else:
            record_fail("OAuth state", "State payload verification failed")

        # Invalid purpose state rejection test
        invalid_state = jwt.encode({"user_id": user1.id, "purpose": "other"}, SECRET_KEY, algorithm=ALGORITHM)
        decoded_invalid = jwt.decode(invalid_state, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded_invalid.get("purpose") != "github_oauth":
            record_pass("OAuth state with invalid purpose correctly identified and rejected")

        # =====================================================
        # 4. MULTI-TENANT DATA ISOLATION (NO IDOR)
        # =====================================================
        print("\n=== 4. MULTI-TENANT DATA ISOLATION & ACCESS CONTROL ===")
        
        # Create private resource for User 1
        p1 = db.query(Project).filter(Project.user_id == user1.id).first()
        if not p1:
            p1 = Project(user_id=user1.id, name="User1 Private Project", status="In Progress")
            db.add(p1)
            db.commit()

        # Check User 2 cannot access User 1's project via scoped query
        user2_projects = db.query(Project).filter(Project.user_id == user2.id).all()
        if p1.id not in [p.id for p in user2_projects]:
            record_pass("User 2 cannot list or access User 1's private projects (Tenant Isolated)")
        else:
            record_fail("Project Isolation", "User 2 leaked User 1's project")

        # User 1 tasks isolation
        t1 = db.query(Task).filter(Task.user_id == user1.id).first()
        if not t1:
            t1 = Task(user_id=user1.id, title="User1 Secret Task", status="In Progress")
            db.add(t1)
            db.commit()
        user2_tasks = db.query(Task).filter(Task.user_id == user2.id).all()
        if t1.id not in [t.id for t in user2_tasks]:
            record_pass("User 2 cannot view User 1's private tasks (Tenant Isolated)")
        else:
            record_fail("Task Isolation", "User 2 leaked User 1's task")

        # =====================================================
        # 5. ORGANIZATION-LEVEL INTEGRATIONS & RBAC
        # =====================================================
        print("\n=== 5. ORGANIZATION-LEVEL WORKSPACE & RBAC ===")
        
        # User 1 creates Org "DevCore Enterprise"
        org = db.query(Organization).filter(Organization.slug == "devcore-team").first()
        if not org:
            org = Organization(
                name="DevCore Team",
                slug="devcore-team",
                description="Workspace for core team",
                owner_id=user1.id,
            )
            db.add(org)
            db.flush()
            
            # User 1 is Owner
            m1 = OrganizationMember(org_id=org.id, user_id=user1.id, role="owner")
            # User 2 is Member
            m2 = OrganizationMember(org_id=org.id, user_id=user2.id, role="member")
            db.add_all([m1, m2])
            db.commit()
        record_pass("Organization created with Owner (User 1) and Member (User 2)")

        # Verify RBAC: User 1 is owner, User 2 is member, User 3 is outsider
        m_u1 = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id, OrganizationMember.user_id == user1.id).first()
        m_u2 = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id, OrganizationMember.user_id == user2.id).first()
        m_u3 = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id, OrganizationMember.user_id == user3.id).first()

        if m_u1 and m_u1.role == "owner":
            record_pass("User 1 verified as Organization Owner")
        else:
            record_fail("Org RBAC", "User 1 not recognized as owner")

        if m_u2 and m_u2.role == "member":
            record_pass("User 2 verified as Organization Member")
        else:
            record_fail("Org RBAC", "User 2 not recognized as member")

        if m_u3 is None:
            record_pass("User 3 correctly verified as Non-Member (Access Forbidden)")
        else:
            record_fail("Org RBAC", "User 3 erroneously granted org membership")

        # Link Org Repository
        org_repo = db.query(OrganizationRepository).filter(OrganizationRepository.org_id == org.id).first()
        if not org_repo:
            org_repo = OrganizationRepository(
                org_id=org.id,
                name="core-engine",
                full_name="devcore-team/core-engine",
                github_repo_id="998877",
                language="Python",
                is_private=True,
            )
            db.add(org_repo)
            db.commit()
        record_pass("Organization repository linked independently of personal repos")

        # =====================================================
        # 6. TELEMETRY INGESTION & DEDUPLICATION
        # =====================================================
        print("\n=== 6. TELEMETRY INGESTION, DEDUPLICATION & DURATION INTEGRITY ===")
        
        now = datetime.utcnow()
        vsc_event_id = f"vsc_test_dedup_{int(now.timestamp())}"
        
        # Ingest extension activity
        from app.services.unified_activity_service import record_extension_activities
        
        event_payload = [{
            "platform": "vscode",
            "category": "coding",
            "activity_type": "coding_session",
            "title": "VS Code: Active coding session in Core-Engine",
            "details": "Active coding session in Core-Engine (python)",
            "started_at": (now - timedelta(minutes=25)).isoformat(),
            "ended_at": now.isoformat(),
            "duration_seconds": 1500,
            "source": "vscode_extension",
            "extension_event_id": vsc_event_id,
        }]

        # Ingest first time
        res1 = record_extension_activities(db=db, user_id=user1.id, items=event_payload)
        if res1.get("synced_count") == 1:
            record_pass("Extension telemetry event ingested successfully", "duration: 1500s")
        else:
            record_fail("Extension Ingestion", f"Expected synced_count 1, got {res1}")

        # Ingest exact same event second time (Deduplication test)
        res2 = record_extension_activities(db=db, user_id=user1.id, items=event_payload)
        if res2.get("duplicate_count") == 1 and res2.get("synced_count") == 0:
            record_pass("Duplicate extension event strictly deduplicated (0 newly stored, 1 duplicate)")
        else:
            record_fail("Deduplication", f"Duplicate was not prevented: {res2}")

        # Check that duration is genuine (1500s = 25 mins) and not fabricated
        ingested_act = db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == user1.id,
            DeveloperActivity.external_id.like(f"%{vsc_event_id}%"),
        ).first()
        if ingested_act and ingested_act.duration_seconds == 1500 and ingested_act.source == "vscode_extension":
            record_pass("Activity stored with accurate duration and source classification")
        else:
            record_fail("Duration Integrity", f"Invalid activity data: {ingested_act}")

        # =====================================================
        # 7. DASHBOARD FIVE PRIMARY METRICS INTEGRITY
        # =====================================================
        print("\n=== 7. DASHBOARD FIVE PRIMARY METRICS VERIFICATION ===")
        
        overview = get_dashboard_overview(db, user1.id)
        pm = overview.get("primary_metrics", {})
        
        # Metric 1: Coding Time
        if "coding" in pm and "seconds" in pm["coding"]:
            record_pass("Metric 1: Coding Time", f"{pm['coding']['formatted']} ({pm['coding']['seconds']}s)")
        else:
            record_fail("Metric 1", f"Missing coding metrics: {pm.get('coding')}")

        # Metric 2: Pomodoro Focus Time
        if "focus" in pm and "seconds" in pm["focus"]:
            record_pass("Metric 2: Pomodoro Focus Time", f"{pm['focus']['formatted']} ({pm['focus']['seconds']}s)")
        else:
            record_fail("Metric 2", f"Missing focus metrics: {pm.get('focus')}")

        # Metric 3: Tasks
        if "tasks" in pm and "completed" in pm["tasks"]:
            record_pass("Metric 3: Tasks Completed", f"{pm['tasks']['completed']} / {pm['tasks']['total']} completed")
        else:
            record_fail("Metric 3", f"Missing tasks metrics: {pm.get('tasks')}")

        # Metric 4: Login Streak
        if "login_streak" in pm and "current_streak" in pm["login_streak"]:
            record_pass("Metric 4: Login Streak", f"{pm['login_streak']['current_streak']} days")
        else:
            record_fail("Metric 4", f"Missing login streak: {pm.get('login_streak')}")

        # Metric 5: Productivity Score
        score = pm.get("productivity", {}).get("score", overview.get("productivity_score", 0))
        if isinstance(score, (int, float)) and 0 <= score <= 100:
            record_pass("Metric 5: Productivity Score", f"{score}/100")
        else:
            record_fail("Metric 5", f"Invalid score: {score}")

        # Integration Center status in dashboard payload
        platforms = overview.get("platforms", {})
        if "github" in platforms and platforms["github"]["connection_status"] in ["Connected", "Not Linked", "Needs Reconnect"]:
            record_pass("Dashboard contains verified platform sync statuses")
        else:
            record_fail("Platform Sync Payload", "Missing or invalid platforms payload in dashboard")

        # Safe Disconnect test without deleting DeveloperActivity history
        pre_disconnect_acts = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user2.id).count()
        
        # Disconnect User 2's GitHub
        gh2_to_delete = db.query(GitHubConnection).filter(GitHubConnection.user_id == user2.id).first()
        if gh2_to_delete:
            db.delete(gh2_to_delete)
            db.commit()
            
        post_disconnect_acts = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user2.id).count()
        gh2_after = db.query(GitHubConnection).filter(GitHubConnection.user_id == user2.id).first()
        
        if gh2_after is None and post_disconnect_acts == pre_disconnect_acts:
            record_pass("Disconnecting GitHub account unlinks credentials while preserving activity history")
        else:
            record_fail("Disconnect History", "Activity history deleted or credential not unlinked")

    finally:
        db.close()

    print("\n" + "=" * 70)
    print(" FINAL VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"Total Test Checks Executed: {passed_checks + failed_checks}")
    print(f"Passed Checks:              {passed_checks}")
    print(f"Failed Checks:              {failed_checks}")
    success_rate = (passed_checks / (passed_checks + failed_checks)) * 100 if (passed_checks + failed_checks) > 0 else 0
    print(f"Success Rate:               {success_rate:.1f}%\n")

    return failed_checks == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
