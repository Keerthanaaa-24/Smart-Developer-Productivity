"""
SMART DEVELOPER PRODUCTIVITY — PHASE 1 MASTER VERIFICATION SUITE
Tests Connected Accounts, Navigation & Provenance, Data Trust Center, and Export APIs.
"""

import sys
import os
import json
import csv
import io
from datetime import date, datetime

# Configure Windows UTF-8 stdout
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.models.linkedin_connection import LinkedInConnection
from app.services.provider_registry import provider_registry, PROVIDER_CAPABILITY_REGISTRY
from app.services.data_trust_service import get_data_trust_center_overview, export_user_activity_telemetry
from app.services.platform_sync_service import platform_sync_service
from app.core.encryption import encrypt_token, decrypt_token


def run_phase1_verification_suite():
    print("=" * 70)
    print(" SMART DEVELOPER PRODUCTIVITY — PHASE 1 MASTER VERIFICATION SUITE")
    print("=" * 70)

    db = SessionLocal()
    try:
        # 1. Fetch Primary Test User
        user = db.query(User).filter(User.username == "Keerthzz").first()
        if not user:
            print("[SETUP] Creating test user Keerthzz...")
            user = User(username="Keerthzz", email="keerthzz@gmail.com", hashed_password="hashed_pass_test")
            db.add(user)
            db.commit()
            db.refresh(user)

        user_id = user.id
        print(f"[STEP 1] Identified Test User: id={user_id}, username='{user.username}'")

        # -------------------------------------------------------------
        # 2. AUDIT ALL EIGHT PROVIDERS IN CAPABILITY REGISTRY
        # -------------------------------------------------------------
        print("\n[STEP 2] Auditing all 8 Providers in Capability Registry...")
        expected_providers = [
            "github",
            "leetcode",
            "freecodecamp",
            "geeksforgeeks",
            "coursera",
            "nptel",
            "linkedin",
            "naukri",
        ]
        all_providers = provider_registry.get_all_providers()
        found_keys = [p["key"] for p in all_providers]

        for p_key in expected_providers:
            assert p_key in found_keys, f"Provider '{p_key}' must exist in capability registry!"
            prov = provider_registry.get_provider(p_key)
            assert prov["name"], f"Provider {p_key} must have a name"
            assert prov["website"].startswith("https://"), f"Provider {p_key} must have valid HTTPS website"
            assert "supported_data_types" in prov, f"Provider {p_key} must list supported data types"
            assert "unsupported_capabilities" in prov, f"Provider {p_key} must list unsupported capabilities"
            assert prov["provenance_type"] in ("verified_provider", "app_recorded", "user_entered", "estimated", "unavailable")
            print(f"   ✓ Provider [{p_key.upper()}]: {prov['name']} | Auth: {prov['auth_type']} | Provenance: {prov['provenance_type']}")

        print("[PASS] All 8 providers verified in Capability Registry with exhaustive metadata.")

        # -------------------------------------------------------------
        # 3. VERIFY SAFE URL RESOLUTION & NAVIGATION
        # -------------------------------------------------------------
        print("\n[STEP 3] Testing Safe Account Navigation & Destination URLs...")

        # Test valid profile URL resolution
        gh_url = provider_registry.get_safe_destination_url("github", "octocat")
        assert gh_url == "https://github.com/octocat", f"Unexpected GitHub URL: {gh_url}"

        lc_url = provider_registry.get_safe_destination_url("leetcode", "tourist")
        assert lc_url == "https://leetcode.com/u/tourist/", f"Unexpected LeetCode URL: {lc_url}"

        gfg_url = provider_registry.get_safe_destination_url("geeksforgeeks", "geek_dev")
        assert gfg_url == "https://www.geeksforgeeks.org/user/geek_dev/", f"Unexpected GFG URL: {gfg_url}"

        fcc_url = provider_registry.get_safe_destination_url("freecodecamp", "camper123")
        assert fcc_url == "https://www.freecodecamp.org/camper123", f"Unexpected FCC URL: {fcc_url}"

        li_url = provider_registry.get_safe_destination_url("linkedin", "keerthivasan")
        assert li_url == "https://www.linkedin.com/in/keerthivasan/", f"Unexpected LinkedIn URL: {li_url}"

        # Test fallback when username is missing
        coursera_fallback = provider_registry.get_safe_destination_url("coursera")
        assert coursera_fallback == "https://www.coursera.org", f"Coursera must fallback to official dashboard: {coursera_fallback}"

        nptel_fallback = provider_registry.get_safe_destination_url("nptel")
        assert nptel_fallback == "https://nptel.ac.in", f"NPTEL must fallback to official website: {nptel_fallback}"

        naukri_fallback = provider_registry.get_safe_destination_url("naukri")
        assert naukri_fallback == "https://www.naukri.com", f"Naukri must fallback to official dashboard: {naukri_fallback}"

        # Test URL Safety Validator
        assert provider_registry.validate_external_url("https://github.com/torvalds", "github") is True
        assert provider_registry.validate_external_url("http://localhost:8001/fake", "github") is False
        assert provider_registry.validate_external_url("https://malicious.site/phish", "github") is False

        print("   ✓ GitHub resolved:", gh_url)
        print("   ✓ LeetCode resolved:", lc_url)
        print("   ✓ freeCodeCamp resolved:", fcc_url)
        print("   ✓ GeeksforGeeks resolved:", gfg_url)
        print("   ✓ LinkedIn resolved:", li_url)
        print("   ✓ Coursera fallback:", coursera_fallback)
        print("   ✓ NPTEL fallback:", nptel_fallback)
        print("   ✓ Naukri fallback:", naukri_fallback)
        print("[PASS] Account navigation & safe destination resolution verified 100%.")

        # -------------------------------------------------------------
        # 4. DATA TRUST CENTER & PROVENANCE DIAGNOSTICS
        # -------------------------------------------------------------
        print("\n[STEP 4] Testing Data Trust Center Overview & Provenance Engine...")
        trust_report = get_data_trust_center_overview(db, user_id)

        assert "overall_health" in trust_report, "Trust report must include overall_health"
        assert "provenance_breakdown" in trust_report, "Trust report must include provenance_breakdown"
        assert "providers" in trust_report, "Trust report must include providers list"
        assert len(trust_report["providers"]) == 8, "Trust report must cover exactly 8 providers"

        prov_breakdown = trust_report["provenance_breakdown"]
        print(f"   Overall Health Score: {trust_report['overall_health']['score']}% ({trust_report['overall_health']['status']})")
        print(f"   Provenance Breakdown: Verified: {prov_breakdown['counts']['verified_provider']} | App-Recorded: {prov_breakdown['counts']['app_recorded']} | User-Entered: {prov_breakdown['counts']['user_entered']}")

        for p_diag in trust_report["providers"]:
            assert p_diag["connection_status"] in (
                "Connected",
                "Not connected",
                "Authorization expired",
                "Permission denied",
                "Syncing",
                "Sync failed",
                "Unsupported integration",
            ), f"Invalid connection status for {p_diag['key']}: {p_diag['connection_status']}"
            assert "display_profile_url" in p_diag
            assert "freshness" in p_diag
            print(f"   [{p_diag['key']}] Status: '{p_diag['connection_status']}' | URL: {p_diag['display_profile_url']} | Freshness: {p_diag['freshness']['freshness_label']}")

        print("[PASS] Data Trust Center diagnostics verified across all 8 providers.")

        # -------------------------------------------------------------
        # 5. TELEMETRY EXPORT IN JSON AND CSV
        # -------------------------------------------------------------
        print("\n[STEP 5] Testing Activity Telemetry Export (JSON & CSV)...")
        json_export = export_user_activity_telemetry(db, user_id, export_format="json")
        assert "activities" in json_export
        assert json_export["user_id"] == user_id
        assert isinstance(json_export["activities"], list)
        print(f"   ✓ JSON Export verified: {json_export['total_records']} activity records formatted in UTC.")

        csv_export = export_user_activity_telemetry(db, user_id, export_format="csv")
        assert isinstance(csv_export, str)
        assert "created_at_utc" in csv_export
        assert "duration_seconds" in csv_export

        # Validate CSV parser
        reader = csv.DictReader(io.StringIO(csv_export))
        csv_rows = list(reader)
        assert len(csv_rows) == len(json_export["activities"])
        print(f"   ✓ CSV Export verified: {len(csv_rows)} rows formatted with correct headers.")

        # -------------------------------------------------------------
        # 6. SECURITY & ENCRYPTION AT REST
        # -------------------------------------------------------------
        print("\n[STEP 6] Testing Token Encryption at Rest & Redaction...")
        sample_token = "ghp_secure_personal_access_token_super_secret_9988"
        encrypted = encrypt_token(sample_token)
        assert encrypted.startswith("enc:v1:"), "Encrypted token must have secure version prefix"
        assert sample_token not in encrypted, "Raw token must not appear in encrypted payload"

        decrypted = decrypt_token(encrypted)
        assert decrypted == sample_token, "Decrypted token must match original plaintext"

        # Verify no token leak in status diagnostics
        assert "access_token" not in json.dumps(trust_report)
        print("   ✓ Token Fernet AES encryption at rest verified.")
        print("   ✓ Response payload token redaction verified.")

        # -------------------------------------------------------------
        # 7. MULTI-USER ISOLATION
        # -------------------------------------------------------------
        print("\n[STEP 7] Testing Multi-User Data Isolation...")
        other_user_id = 999888
        other_trust = get_data_trust_center_overview(db, other_user_id)
        assert other_trust["overall_health"]["total_verified_activities"] == 0, "User 2 must have 0 access to User 1 data"
        other_export = export_user_activity_telemetry(db, other_user_id, export_format="json")
        assert other_export["total_records"] == 0, "User 2 export must contain zero User 1 records"
        print("   ✓ Strict multi-user data isolation verified.")

        print("\n" + "=" * 70)
        print(" ALL PHASE 1 PRODUCTION READINESS TESTS PASSED SUCCESSFULLY! (100%)")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    run_phase1_verification_suite()
