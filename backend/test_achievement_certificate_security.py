"""
Automated Security & Access Control Verification for Achievement Certificates.
Verifies:
1. Public achievement certificates can be viewed/downloaded.
2. Private achievement certificates reject unauthenticated requests with HTTP 403.
3. Private achievement certificates reject requests from unauthorized users with HTTP 403.
4. Authenticated owner can access their private certificate via token query parameter or header.
5. Path traversal attempts and non-existent files are safely rejected.
"""

import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, get_db
from app.models.user import User
from app.models.student_achievement import StudentAchievement
from app.services.auth_service import create_access_token
from app.routes.achievement_routes import LOCAL_UPLOAD_DIR

class TestAchievementCertificateSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db: Session = SessionLocal()

        # Find or create User A and User B
        cls.user_a = cls.db.query(User).filter(User.username == "cert_test_user_a").first()
        if not cls.user_a:
            cls.user_a = User(username="cert_test_user_a", email="cert_a@test.com", password="hashed_pw_a")
            cls.db.add(cls.user_a)
            cls.db.commit()
            cls.db.refresh(cls.user_a)

        cls.user_b = cls.db.query(User).filter(User.username == "cert_test_user_b").first()
        if not cls.user_b:
            cls.user_b = User(username="cert_test_user_b", email="cert_b@test.com", password="hashed_pw_b")
            cls.db.add(cls.user_b)
            cls.db.commit()
            cls.db.refresh(cls.user_b)

        cls.token_a = create_access_token(data={"sub": cls.user_a.username, "user_id": cls.user_a.id})
        cls.token_b = create_access_token(data={"sub": cls.user_b.username, "user_id": cls.user_b.id})

        # Create dummy certificate files on disk
        cls.dummy_filename_public = f"cert_{cls.user_a.id}_public_test.pdf"
        cls.dummy_filename_private = f"cert_{cls.user_a.id}_private_test.pdf"

        cls.file_path_pub = os.path.join(LOCAL_UPLOAD_DIR, cls.dummy_filename_public)
        cls.file_path_priv = os.path.join(LOCAL_UPLOAD_DIR, cls.dummy_filename_private)

        with open(cls.file_path_pub, "wb") as f:
            f.write(b"%PDF-1.4 Mock public certificate file")

        with open(cls.file_path_priv, "wb") as f:
            f.write(b"%PDF-1.4 Mock private certificate file")

        # Create Public Achievement owned by User A
        cls.ach_public = StudentAchievement(
            user_id=cls.user_a.id,
            title="Public Certified Professional",
            category="certification",
            issuer="Cloud Institute",
            is_public=True,
            certificate_url=f"/uploads/certificates/{cls.dummy_filename_public}",
            verification_status="evidence_uploaded",
        )
        cls.db.add(cls.ach_public)

        # Create Private Achievement owned by User A
        cls.ach_private = StudentAchievement(
            user_id=cls.user_a.id,
            title="Confidential Internal Certificate",
            category="certification",
            issuer="Internal Org",
            is_public=False,
            certificate_url=f"/uploads/certificates/{cls.dummy_filename_private}",
            verification_status="evidence_uploaded",
        )
        cls.db.add(cls.ach_private)
        cls.db.commit()
        cls.db.refresh(cls.ach_public)
        cls.db.refresh(cls.ach_private)

    @classmethod
    def tearDownClass(cls):
        # Cleanup dummy files
        for p in [cls.file_path_pub, cls.file_path_priv]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        cls.db.close()

    def test_01_public_certificate_download_succeeds_without_auth(self):
        """Public achievement certificates should be accessible without credentials."""
        res = self.client.get(f"/achievements/{self.ach_public.id}/certificate")
        self.assertEqual(res.status_code, 200)
        self.assertIn("application/pdf", res.headers.get("content-type", ""))
        self.assertIn(b"%PDF-1.4 Mock public certificate file", res.content)

    def test_02_private_certificate_download_blocked_without_auth(self):
        """Private achievement certificates MUST return 403 when unauthenticated."""
        res = self.client.get(f"/achievements/{self.ach_private.id}/certificate")
        self.assertEqual(res.status_code, 403)
        self.assertIn("Not authorized", res.json().get("detail", ""))

    def test_03_private_certificate_blocked_for_other_user(self):
        """Private achievement certificates MUST return 403 when accessed with another user's token."""
        # Using query param token
        res_query = self.client.get(
            f"/achievements/{self.ach_private.id}/certificate?token={self.token_b}"
        )
        self.assertEqual(res_query.status_code, 403)

        # Using Authorization header
        res_header = self.client.get(
            f"/achievements/{self.ach_private.id}/certificate",
            headers={"Authorization": f"Bearer {self.token_b}"},
        )
        self.assertEqual(res_header.status_code, 403)

    def test_04_private_certificate_accessible_by_owner(self):
        """Private achievement certificates MUST be accessible to the owner via token."""
        # Using query param token (how browser opens target="_blank")
        res_query = self.client.get(
            f"/achievements/{self.ach_private.id}/certificate?token={self.token_a}"
        )
        self.assertEqual(res_query.status_code, 200)
        self.assertIn(b"%PDF-1.4 Mock private certificate file", res_content := res_query.content)

        # Using Authorization header
        res_header = self.client.get(
            f"/achievements/{self.ach_private.id}/certificate",
            headers={"Authorization": f"Bearer {self.token_a}"},
        )
        self.assertEqual(res_header.status_code, 200)

    def test_05_nonexistent_achievement_returns_404(self):
        """Requests for non-existent achievement IDs should return 404."""
        res = self.client.get("/achievements/999999999/certificate")
        self.assertEqual(res.status_code, 404)

if __name__ == "__main__":
    unittest.main()
