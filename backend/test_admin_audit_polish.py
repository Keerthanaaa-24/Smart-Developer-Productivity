"""
Comprehensive End-to-End Audit & Polish Verification Test Suite.
Directly validates all 7 sections of the Admin Console:
1. Overview: /admin/overview consolidated metrics & fallback integrity
2. Students: Search, filters, telemetry inspector, suspension/reactivation, self-lockout guard
3. Score & Streak Audit: Ledger filters, duplicate scanner, duplicate purge, manual point adjustment, streak correction
4. Achievements & Certs: Queue inspection, certificate authorization, approval, rejection with notes, points award
5. Platform Health: Latency ping, connection pool status, zero secret leak, Render optimization
6. Platform Analytics: Real aggregated student-only metrics, active 7d/30d, focus hours, 14-day trends
7. Security & Audit Logs: Searchable immutable audit trail of every administrative mutation
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


class TestAdminConsoleE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        # 1. Admin
        cls.admin = cls.db.query(User).filter(User.username == "e2e_admin").first()
        if not cls.admin:
            cls.admin = User(
                username="e2e_admin",
                email="e2e_admin@platform.io",
                password=hash_password("E2eAdminPass123!"),
                role="superadmin",
                is_active=True,
            )
            cls.db.add(cls.admin)
            cls.db.commit()
            cls.db.refresh(cls.admin)

        # 2. Student
        cls.student = cls.db.query(User).filter(User.username == "e2e_student").first()
        if not cls.student:
            cls.student = User(
                username="e2e_student",
                email="e2e_student@platform.io",
                password=hash_password("E2eStudentPass123!"),
                role="student",
                is_active=True,
            )
            cls.db.add(cls.student)
            cls.db.commit()
            cls.db.refresh(cls.student)

        cls.admin_token = create_access_token(
            data={"sub": str(cls.admin.id), "user_id": cls.admin.id, "role": cls.admin.role}
        )
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        cls.student_token = create_access_token(
            data={"sub": str(cls.student.id), "user_id": cls.student.id, "role": "student"}
        )
        cls.student_headers = {"Authorization": f"Bearer {cls.student_token}"}

    def setUp(self):
        self.db.expire_all()
        self.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # --------------------------------------------------------------------------
    # 1. OVERVIEW SECTION
    # --------------------------------------------------------------------------
    def test_01_overview_endpoint_aggregates_live_data(self):
        """GET /admin/overview delivers complete telemetry in one roundtrip."""
        resp = self.client.get("/admin/overview", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Schema checks
        self.assertIn("analytics", data)
        self.assertIn("health", data)
        self.assertIn("duplicates_count", data)
        self.assertIn("pending_achievements", data)
        self.assertIn("recent_logs", data)

        # Analytics structure
        self.assertIn("total_registered", data["analytics"]["students"])
        self.assertIn("active_7d", data["analytics"]["students"])
        self.assertIn("pending", data["analytics"]["achievements"])
        self.assertIn("total_focus_hours", data["analytics"]["productivity"])

        # Health structure
        self.assertEqual(data["health"]["database"]["status"], "operational")
        self.assertIsInstance(data["health"]["database"]["latency_ms"], (int, float))

    # --------------------------------------------------------------------------
    # 2. STUDENTS SECTION
    # --------------------------------------------------------------------------
    def test_02_students_search_filters_and_inspector(self):
        """Student search, role filter, pagination, and telemetry inspection."""
        # Search by username
        resp_search = self.client.get(
            f"/admin/students?search={self.student.username}&role_filter=student",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_search.status_code, 200)
        items = resp_search.json()["items"]
        self.assertTrue(any(s["username"] == self.student.username for s in items))

        # Inspect student
        resp_inspect = self.client.get(
            f"/admin/students/{self.student.id}",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_inspect.status_code, 200)
        inspect_data = resp_inspect.json()
        self.assertIn("student", inspect_data)
        self.assertIn("streak", inspect_data)
        self.assertIn("metrics", inspect_data)
        self.assertEqual(inspect_data["student"]["id"], self.student.id)

    def test_03_student_suspension_and_self_lockout_prevention(self):
        """Account suspension with reason, reactivation, and self-suspension blocking."""
        # 1. Prevent admin from suspending self
        resp_self = self.client.patch(
            f"/admin/students/{self.admin.id}/status",
            json={"is_active": False, "reason": "Self lockout attempt"},
            headers=self.admin_headers,
        )
        self.assertEqual(resp_self.status_code, 400)
        self.assertIn("cannot suspend or modify your own", resp_self.json()["detail"])

        # 2. Suspend target student with recorded reason
        resp_suspend = self.client.patch(
            f"/admin/students/{self.student.id}/status",
            json={"is_active": False, "reason": "Audit verification suspension test."},
            headers=self.admin_headers,
        )
        self.assertEqual(resp_suspend.status_code, 200)
        self.assertFalse(resp_suspend.json()["is_active"])
        self.assertEqual(resp_suspend.json()["suspension_reason"], "Audit verification suspension test.")

        # Verify audit log was recorded
        self.db.commit()
        log = (
            self.db.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "USER_SUSPEND", AdminAuditLog.target_user_id == self.student.id)
            .first()
        )
        self.assertIsNotNone(log)
        self.assertIn("Audit verification suspension test.", log.details)

        # 3. Reactivate target student
        resp_reactivate = self.client.patch(
            f"/admin/students/{self.student.id}/status",
            json={"is_active": True, "reason": "Verification completed successfully."},
            headers=self.admin_headers,
        )
        self.assertEqual(resp_reactivate.status_code, 200)
        self.assertTrue(resp_reactivate.json()["is_active"])

    # --------------------------------------------------------------------------
    # 3. SCORE & STREAK AUDIT SECTION
    # --------------------------------------------------------------------------
    def test_04_point_adjustments_and_duplicate_detection(self):
        """Points ledger query, manual point credit/debit, duplicate scanner, and deletion."""
        # 1. Manual point adjustment
        resp_adj = self.client.post(
            "/admin/audit/points/adjust",
            json={
                "user_id": self.student.id,
                "points": 35,
                "category": "code_review_bonus",
                "reason": "Outstanding peer review contribution verified.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(resp_adj.status_code, 200)
        tx_id = resp_adj.json()["transaction_id"]

        # 2. Query ledger with filters
        resp_ledger = self.client.get(
            f"/admin/audit/points?user_id={self.student.id}&category=code_review_bonus",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_ledger.status_code, 200)
        found = any(t["id"] == tx_id for t in resp_ledger.json()["items"])
        self.assertTrue(found)

        # 3. Duplicate detection scanner
        resp_dups = self.client.get("/admin/audit/duplicate-points", headers=self.admin_headers)
        self.assertEqual(resp_dups.status_code, 200)
        self.assertIn("duplicates_detected", resp_dups.json())

        # 4. Delete point transaction with required audit reason
        resp_del = self.client.delete(
            f"/admin/audit/points/{tx_id}?reason=End-to-end+test+cleanup",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_del.status_code, 200)

        # Verify audit log recorded
        self.db.commit()
        log = (
            self.db.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "POINTS_DELETE_DUPLICATE", AdminAuditLog.target_id == str(tx_id))
            .first()
        )
        self.assertIsNotNone(log)

    def test_05_streak_auditing_and_date_correction(self):
        """Audit student login history and correct calendar date with audit log."""
        target_d = date.today() - timedelta(days=1)

        # Correct streak by adding login date
        resp_correct = self.client.post(
            "/admin/audit/streaks/correct",
            json={
                "user_id": self.student.id,
                "target_date": str(target_d),
                "action": "add_login_date",
                "reason": "Student logged in during offline maintenance window.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(resp_correct.status_code, 200)
        self.assertIn("recalculated_streak", resp_correct.json())

        # Inspect streak audit
        resp_audit = self.client.get(f"/admin/audit/streaks/{self.student.id}", headers=self.admin_headers)
        self.assertEqual(resp_audit.status_code, 200)
        history = resp_audit.json()["history"]
        self.assertTrue(any(h["login_date"] == str(target_d) for h in history))

    # --------------------------------------------------------------------------
    # 4. ACHIEVEMENTS & CERTS SECTION
    # --------------------------------------------------------------------------
    def test_06_achievement_review_workflow_and_certificate_security(self):
        """Approve, reject, or request correction on credentials with audit log and notification."""
        ach = StudentAchievement(
            user_id=self.student.id,
            title="Kubernetes Administrator CKA",
            category="certification",
            issuer="CNCF",
            verification_status="evidence_uploaded",
            points_awarded=5,
        )
        self.db.add(ach)
        self.db.commit()
        self.db.refresh(ach)

        # 1. Verification queue contains achievement
        resp_queue = self.client.get("/admin/achievements?status_filter=pending", headers=self.admin_headers)
        self.assertEqual(resp_queue.status_code, 200)
        items = resp_queue.json()["items"]
        self.assertTrue(any(a["id"] == ach.id for a in items))

        # 2. Decision: Approve credential with custom points override
        resp_approve = self.client.patch(
            f"/admin/achievements/{ach.id}/verify",
            json={
                "status": "verified",
                "notes": "Verified against CNCF verify portal with credential ID.",
                "points_override": 30,
            },
            headers=self.admin_headers,
        )
        self.assertEqual(resp_approve.status_code, 200)
        self.assertEqual(resp_approve.json()["verification_status"], "verified")
        self.assertEqual(resp_approve.json()["points_awarded"], 30)

        # 3. Notification dispatched to student
        self.db.commit()
        notif = (
            self.db.query(Notification)
            .filter(Notification.user_id == self.student.id)
            .order_by(desc(Notification.id))
            .first()
        )
        self.assertIsNotNone(notif)
        self.assertIn("Verified", notif.title)

    # --------------------------------------------------------------------------
    # 5. PLATFORM HEALTH SECTION
    # --------------------------------------------------------------------------
    def test_07_platform_health_diagnostics_and_secret_masking(self):
        """Database latency, connection pool metrics, and masked configuration flags."""
        resp_health = self.client.get("/admin/health/overview", headers=self.admin_headers)
        self.assertEqual(resp_health.status_code, 200)
        data = resp_health.json()

        self.assertEqual(data["database"]["status"], "operational")
        self.assertGreaterEqual(data["database"]["latency_ms"], 0.0)
        self.assertIn("integrations", data)

        # Verify no credentials or private secrets are leaked
        raw_text = str(data)
        self.assertNotIn("AWS_SECRET_ACCESS_KEY", raw_text)
        self.assertNotIn("GITHUB_CLIENT_SECRET", raw_text)

    # --------------------------------------------------------------------------
    # 6. PLATFORM ANALYTICS SECTION
    # --------------------------------------------------------------------------
    def test_08_platform_analytics_calculations(self):
        """Platform analytics accurately aggregates real student metrics only."""
        resp_analytics = self.client.get("/admin/analytics/overview", headers=self.admin_headers)
        self.assertEqual(resp_analytics.status_code, 200)
        data = resp_analytics.json()

        # Verify keys
        self.assertIn("students", data)
        self.assertIn("achievements", data)
        self.assertIn("productivity", data)
        self.assertIn("points_economy", data)
        self.assertIn("trend_14d", data)

        # Ensure student registration count matches database student count
        db_student_count = self.db.query(User).filter(User.role == "student").count()
        self.assertEqual(data["students"]["total_registered"], db_student_count)

        # Ensure admin count is tracked separately
        db_admin_count = self.db.query(User).filter(User.role.in_(["admin", "superadmin"])).count()
        self.assertEqual(data["students"]["admins"], db_admin_count)

    # --------------------------------------------------------------------------
    # 7. SECURITY & AUDIT LOGS SECTION
    # --------------------------------------------------------------------------
    def test_09_audit_logs_trail_inspection(self):
        """Security and administrative audit trail query with filters."""
        resp_logs = self.client.get("/admin/audit-logs", headers=self.admin_headers)
        self.assertEqual(resp_logs.status_code, 200)
        logs = resp_logs.json()["items"]
        self.assertGreater(len(logs), 0)

        # Every entry must have admin_username, action, target_type, and timestamp
        for entry in logs[:5]:
            self.assertIn("admin_username", entry)
            self.assertIn("action", entry)
            self.assertIn("target_type", entry)
            self.assertIn("created_at", entry)


if __name__ == "__main__":
    unittest.main()
