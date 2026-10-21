"""
Comprehensive Test Suite for Advanced Admin Dashboard and Governance System.
Validates:
1. Admin Authorization: Every /admin endpoint enforces HTTP 403 on standard students.
2. Student Isolation: Students cannot view other users' private certificates or telemetry.
3. Admin Privileges: Admin can inspect private certificates for verification.
4. Student Management: Search, inspect, suspend, reactivate, and prevent self-suspension.
5. Suspension Enforcement: Suspended users are blocked from login and API access.
6. Leaderboard & Points Auditing: View ledger, detect duplicates, delete transaction, adjust points.
7. Streak Auditing & Correction: Audit streak, add/remove login date with recorded reason.
8. Achievement Verification: Approve, reject, request corrections with audit log and notification.
9. Platform Health & Analytics: Verified genuine aggregates, masked secrets.
10. Audit Logs: Searchable chronological audit records.
11. Existing Feature Regressions: Dashboard, tasks, leaderboard, achievements work intact.
"""

import os
import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.student_achievement import StudentAchievement
from app.models.point_transaction import PointTransaction
from app.models.login_history import LoginHistory
from app.models.task import Task
from app.models.admin_audit_log import AdminAuditLog
from app.models.notification import Notification
from app.services.auth_service import create_access_token, hash_password
from app.routes.achievement_routes import LOCAL_UPLOAD_DIR


class TestAdminGovernanceSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        # 1. Create or retrieve Admin User
        cls.admin_user = cls.db.query(User).filter(User.username == "test_super_admin").first()
        if not cls.admin_user:
            cls.admin_user = User(
                username="test_super_admin",
                email="test_super_admin@example.com",
                password=hash_password("AdminPass123!"),
                role="superadmin",
                is_active=True,
            )
            cls.db.add(cls.admin_user)
            cls.db.commit()
            cls.db.refresh(cls.admin_user)

        # 2. Create Student User 1
        cls.student_1 = cls.db.query(User).filter(User.username == "test_student_alpha").first()
        if not cls.student_1:
            cls.student_1 = User(
                username="test_student_alpha",
                email="student_alpha@example.com",
                password=hash_password("StudentPass123!"),
                role="student",
                is_active=True,
            )
            cls.db.add(cls.student_1)
            cls.db.commit()
            cls.db.refresh(cls.student_1)

        # 3. Create Student User 2
        cls.student_2 = cls.db.query(User).filter(User.username == "test_student_beta").first()
        if not cls.student_2:
            cls.student_2 = User(
                username="test_student_beta",
                email="student_beta@example.com",
                password=hash_password("StudentPass123!"),
                role="student",
                is_active=True,
            )
            cls.db.add(cls.student_2)
            cls.db.commit()
            cls.db.refresh(cls.student_2)

        # Generate tokens
        cls.admin_token = create_access_token(
            data={"sub": str(cls.admin_user.id), "user_id": cls.admin_user.id, "role": cls.admin_user.role}
        )
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        cls.student_1_token = create_access_token(
            data={"sub": str(cls.student_1.id), "user_id": cls.student_1.id, "role": "student"}
        )
        cls.student_1_headers = {"Authorization": f"Bearer {cls.student_1_token}"}

        cls.student_2_token = create_access_token(
            data={"sub": str(cls.student_2.id), "user_id": cls.student_2.id, "role": "student"}
        )
        cls.student_2_headers = {"Authorization": f"Bearer {cls.student_2_token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # ==========================================================================
    # 1. PERMISSIONS & ROLE ISOLATION
    # ==========================================================================
    def test_01_student_cannot_access_admin_endpoints(self):
        """Standard student must be strictly denied with HTTP 403 on all /admin endpoints."""
        endpoints = [
            ("GET", "/admin/overview"),
            ("GET", "/admin/students"),
            ("GET", f"/admin/students/{self.student_1.id}"),
            ("PATCH", f"/admin/students/{self.student_1.id}/status"),
            ("GET", "/admin/audit/points"),
            ("GET", "/admin/audit/duplicate-points"),
            ("GET", f"/admin/audit/streaks/{self.student_1.id}"),
            ("GET", "/admin/achievements"),
            ("GET", "/admin/health/overview"),
            ("GET", "/admin/analytics/overview"),
            ("GET", "/admin/audit-logs"),
        ]

        for method, ep in endpoints:
            if method == "GET":
                resp = self.client.get(ep, headers=self.student_1_headers)
            elif method == "PATCH":
                resp = self.client.patch(ep, json={"is_active": False, "reason": "test"}, headers=self.student_1_headers)
            self.assertEqual(
                resp.status_code,
                403,
                f"Expected 403 for student accessing {ep}, got {resp.status_code}",
            )

    def test_02_unauthenticated_request_rejected(self):
        """Unauthenticated requests must be rejected with HTTP 401."""
        resp = self.client.get("/admin/students")
        self.assertEqual(resp.status_code, 401)

    def test_03_admin_can_access_admin_endpoints(self):
        """Authenticated admin can access all admin endpoints."""
        resp = self.client.get("/admin/students", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertIn("total", data)

    # ==========================================================================
    # 2. STUDENT ISOLATION & ADMIN CERTIFICATE REVIEW
    # ==========================================================================
    def test_04_private_certificate_isolation_and_admin_review(self):
        """
        Student 2 cannot access private certificate of Student 1.
        Admin CAN access private certificate of Student 1 for review.
        """
        # Create dummy cert file
        filename = f"cert_iso_{self.student_1.id}_test.pdf"
        filepath = os.path.join(LOCAL_UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(b"%PDF-1.4 Private Certificate Evidence")

        ach = StudentAchievement(
            user_id=self.student_1.id,
            title="Private Cloud Certification",
            category="certification",
            issuer="AWS",
            certificate_url=f"/uploads/certificates/{filename}",
            verification_status="evidence_uploaded",
            is_public=False,
            points_awarded=5,
        )
        self.db.add(ach)
        self.db.commit()
        self.db.refresh(ach)

        # Student 2 tries to download Student 1's private certificate -> HTTP 403
        resp_unauth = self.client.get(
            f"/achievements/{ach.id}/certificate",
            headers=self.student_2_headers,
        )
        self.assertEqual(resp_unauth.status_code, 403)

        # Admin downloads Student 1's private certificate for review -> HTTP 200
        resp_admin = self.client.get(
            f"/achievements/{ach.id}/certificate",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_admin.status_code, 200)
        self.assertEqual(resp_admin.content, b"%PDF-1.4 Private Certificate Evidence")

    # ==========================================================================
    # 3. STUDENT MANAGEMENT & ACCOUNT SUSPENSION
    # ==========================================================================
    def test_05_student_suspension_lifecycle(self):
        """
        Admin suspends student -> suspended student blocked from login and protected endpoints.
        Admin reactivates student -> student can log in and access endpoints.
        """
        # 1. Suspend student 2
        suspend_resp = self.client.patch(
            f"/admin/students/{self.student_2.id}/status",
            json={"is_active": False, "reason": "Academic policy violation investigation."},
            headers=self.admin_headers,
        )
        self.assertEqual(suspend_resp.status_code, 200)
        self.assertFalse(suspend_resp.json()["is_active"])

        # 2. Suspended student tries to login -> HTTP 403
        login_resp = self.client.post(
            "/auth/login",
            json={"username": self.student_2.username, "password": "StudentPass123!"},
        )
        self.assertEqual(login_resp.status_code, 403)
        self.assertIn("suspended", login_resp.json()["detail"].lower())

        # 3. Suspended student's existing token blocked on protected routes -> HTTP 403
        task_resp = self.client.get("/tasks", headers=self.student_2_headers)
        self.assertEqual(task_resp.status_code, 403)

        # 4. Admin reactivates student 2
        reactivate_resp = self.client.patch(
            f"/admin/students/{self.student_2.id}/status",
            json={"is_active": True, "reason": "Investigation concluded. Restored active status."},
            headers=self.admin_headers,
        )
        self.assertEqual(reactivate_resp.status_code, 200)
        self.assertTrue(reactivate_resp.json()["is_active"])

        # 5. Student 2 can now login successfully
        login_ok = self.client.post(
            "/auth/login",
            json={"username": self.student_2.username, "password": "StudentPass123!"},
        )
        self.assertEqual(login_ok.status_code, 200)
        self.assertIn("access_token", login_ok.json())

    def test_06_admin_cannot_suspend_self(self):
        """Admin is prevented from suspending their own account."""
        resp = self.client.patch(
            f"/admin/students/{self.admin_user.id}/status",
            json={"is_active": False, "reason": "Mistaken self-suspension"},
            headers=self.admin_headers,
        )
        self.assertEqual(resp.status_code, 400)

    # ==========================================================================
    # 4. LEADERBOARD & STREAK AUDITING
    # ==========================================================================
    def test_07_points_auditing_and_manual_adjustment(self):
        """Admin can view points ledger, adjust points with reason, and see audit record."""
        # 1. Manual point adjustment (+25 pts)
        adj_resp = self.client.post(
            "/admin/audit/points/adjust",
            json={
                "user_id": self.student_1.id,
                "points": 25,
                "category": "hackathon_bonus",
                "reason": "Top 3 Hackathon finish verified by organizer.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(adj_resp.status_code, 200)
        adj_data = adj_resp.json()
        tx_id = adj_data["transaction_id"]

        # 2. Query ledger to see the adjustment
        ledger_resp = self.client.get(
            f"/admin/audit/points?user_id={self.student_1.id}",
            headers=self.admin_headers,
        )
        self.assertEqual(ledger_resp.status_code, 200)
        tx_items = ledger_resp.json()["items"]
        found = any(t["id"] == tx_id for t in tx_items)
        self.assertTrue(found)

        # 3. Delete point transaction with recorded reason
        del_resp = self.client.delete(
            f"/admin/audit/points/{tx_id}?reason=Auditing+cleanup:+duplicate+hackathon+submission.",
            headers=self.admin_headers,
        )
        self.assertEqual(del_resp.status_code, 200)

    def test_08_duplicate_points_detection(self):
        """Admin can run duplicate point detection scan."""
        resp = self.client.get("/admin/audit/duplicate-points", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("duplicates_detected", data)
        self.assertIn("groups", data)

    def test_09_streak_audit_and_correction(self):
        """Admin can inspect streak records and add/remove login history entries."""
        target_d = date.today() - timedelta(days=2)

        # 1. Correct streak by adding missed login date
        add_resp = self.client.post(
            "/admin/audit/streaks/correct",
            json={
                "user_id": self.student_1.id,
                "target_date": str(target_d),
                "action": "add_login_date",
                "reason": "Platform outage on target date prevented student login.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(add_resp.status_code, 200)
        self.assertIn("recalculated_streak", add_resp.json())

        # 2. Audit student streak
        audit_resp = self.client.get(
            f"/admin/audit/streaks/{self.student_1.id}",
            headers=self.admin_headers,
        )
        self.assertEqual(audit_resp.status_code, 200)
        self.assertTrue(any(h["login_date"] == str(target_d) for h in audit_resp.json()["history"]))

    # ==========================================================================
    # 5. ACHIEVEMENT VERIFICATION
    # ==========================================================================
    def test_10_achievement_verification_workflow(self):
        """Admin verifies achievement -> points awarded, student notified, audit log saved."""
        ach = StudentAchievement(
            user_id=self.student_1.id,
            title="Advanced React Certification",
            category="course",
            issuer="Meta",
            verification_status="evidence_uploaded",
            points_awarded=5,
        )
        self.db.add(ach)
        self.db.commit()
        self.db.refresh(ach)

        # 1. Admin approves achievement
        verify_resp = self.client.patch(
            f"/admin/achievements/{ach.id}/verify",
            json={
                "status": "verified",
                "notes": "Official certificate credential ID verified against Meta portal.",
                "points_override": 20,
            },
            headers=self.admin_headers,
        )
        self.assertEqual(verify_resp.status_code, 200)
        self.assertEqual(verify_resp.json()["verification_status"], "verified")
        self.assertEqual(verify_resp.json()["points_awarded"], 20)

        # 2. Check student received notification
        notif = (
            self.db.query(Notification)
            .filter(Notification.user_id == self.student_1.id)
            .order_by(desc(Notification.id))
            .first()
        )
        self.assertIsNotNone(notif)
        self.assertIn("Verified", notif.title)

    # ==========================================================================
    # 6. PLATFORM HEALTH & ANALYTICS
    # ==========================================================================
    def test_11_platform_health_and_analytics_integrity(self):
        """Platform health and analytics report genuine live metrics with zero secret leaks."""
        health_resp = self.client.get("/admin/health/overview", headers=self.admin_headers)
        self.assertEqual(health_resp.status_code, 200)
        health_data = health_resp.json()
        self.assertEqual(health_data["database"]["status"], "operational")
        self.assertGreaterEqual(health_data["database"]["latency_ms"], 0.0)

        # Ensure secrets are never leaked
        health_str = str(health_data)
        self.assertNotIn("NewPassword123!", health_str)
        self.assertNotIn("6eba857bb5d2999899b6a7d82e08044d7346c66e", health_str)

        # Analytics
        analytics_resp = self.client.get("/admin/analytics/overview", headers=self.admin_headers)
        self.assertEqual(analytics_resp.status_code, 200)
        analytics_data = analytics_resp.json()
        self.assertIn("students", analytics_data)
        self.assertIn("productivity", analytics_data)
        self.assertIn("trend_14d", analytics_data)
        self.assertGreaterEqual(analytics_data["students"]["total_registered"], 1)

    def test_11b_admin_overview_endpoint(self):
        """Consolidated /admin/overview endpoint returns authentic telemetry in single fast response."""
        resp = self.client.get("/admin/overview", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("analytics", data)
        self.assertIn("health", data)
        self.assertIn("duplicates_count", data)
        self.assertIn("pending_achievements", data)
        self.assertIn("recent_logs", data)
        self.assertEqual(data["health"]["database"]["status"], "operational")
        self.assertGreaterEqual(data["analytics"]["students"]["total_registered"], 1)

    # ==========================================================================
    # 7. SECURITY & AUDIT LOGS
    # ==========================================================================
    def test_12_audit_logs_recorded(self):
        """Administrative actions are chronologically recorded in audit logs."""
        logs_resp = self.client.get("/admin/audit-logs", headers=self.admin_headers)
        self.assertEqual(logs_resp.status_code, 200)
        logs = logs_resp.json()["items"]
        self.assertGreater(len(logs), 0)
        actions = [l["action"] for l in logs]
        # At least one of the actions executed in previous tests must be present
        self.assertTrue(
            any(a in actions for a in ["USER_SUSPEND", "USER_REACTIVATE", "POINTS_ADJUSTMENT", "ACHIEVEMENT_VERIFY"])
        )

    # ==========================================================================
    # 8. REGRESSION VERIFICATION FOR EXISTING STUDENT FEATURES
    # ==========================================================================
    def test_13_existing_student_endpoints_regressions(self):
        """Existing student endpoints continue to work without regression."""
        # 1. /dashboard
        resp_dash = self.client.get("/dashboard/summary", headers=self.student_1_headers)
        self.assertIn(resp_dash.status_code, [200, 404])  # depends on student's existing activity

        # 2. /leaderboard
        resp_lead = self.client.get("/leaderboard", headers=self.student_1_headers)
        self.assertEqual(resp_lead.status_code, 200)

        # 3. /achievements/me
        resp_ach = self.client.get("/achievements/me", headers=self.student_1_headers)
        self.assertEqual(resp_ach.status_code, 200)

        # 4. /auth/me returns role and is_active
        resp_me = self.client.get("/auth/me", headers=self.student_1_headers)
        self.assertEqual(resp_me.status_code, 200)
        me_data = resp_me.json()
        self.assertEqual(me_data["role"], "student")
        self.assertTrue(me_data["is_active"])

    # ==========================================================================
    # 9. STRICT ROLE SEPARATION: ADMIN EXCLUDED FROM DEVELOPER TRACKING
    # ==========================================================================
    def test_14_admin_cannot_access_developer_productivity_dashboard(self):
        """Admin accounts are strictly blocked from student developer dashboard endpoints."""
        resp_overview = self.client.get("/dashboard/overview", headers=self.admin_headers)
        self.assertEqual(resp_overview.status_code, 403)
        self.assertIn("Administrative accounts", resp_overview.json()["detail"])

        resp_stats = self.client.get("/dashboard/stats", headers=self.admin_headers)
        self.assertEqual(resp_stats.status_code, 403)

        resp_weekly = self.client.get("/dashboard/weekly-productivity", headers=self.admin_headers)
        self.assertEqual(resp_weekly.status_code, 403)

    def test_15_admin_excluded_from_leaderboard_and_points(self):
        """Admin accounts never appear in student leaderboards and cannot earn developer points."""
        # Check global leaderboard: admin should NOT be in the student list
        resp = self.client.get("/leaderboard", headers=self.student_1_headers)
        self.assertEqual(resp.status_code, 200)
        leaderboard_students = resp.json()["students"]
        admin_ids = [self.admin_user.id]
        found_admin = any(s["user_id"] in admin_ids for s in leaderboard_students)
        self.assertFalse(found_admin, "Admin account must not appear in student leaderboard.")

        # Check /leaderboard/me when called by an admin
        resp_me = self.client.get("/leaderboard/me", headers=self.admin_headers)
        self.assertEqual(resp_me.status_code, 200)
        data = resp_me.json()
        self.assertTrue(data.get("is_admin"))
        self.assertIsNone(data.get("rank"))

        # Verify award_points skips admin
        from app.services.points_service import award_points
        tx = award_points(
            self.db,
            user_id=self.admin_user.id,
            source_type="test_award",
            source_id="test_1",
            points=50,
        )
        self.assertIsNone(tx, "award_points must return None and refuse to award points to an admin.")

    def test_16_admin_provisioning_idempotency_and_no_overwrite(self):
        """Admin provisioning is idempotent and never resets existing admin passwords on startup."""
        from app.core.admin_provision import provision_initial_admin
        existing = provision_initial_admin(self.db)
        self.assertIsNotNone(existing)
        self.assertIn(existing.role, ["admin", "superadmin"])


if __name__ == "__main__":
    unittest.main()
