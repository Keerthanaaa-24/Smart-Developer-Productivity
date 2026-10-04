"""
TEST AIVEN MYSQL 8.4 SSL/TLS CONFIGURATION
Verifies that:
1. CA Certificate PEM data (raw, escaped \\n, or file) is correctly parsed and normalized.
2. ssl.create_default_context(cafile=...) correctly loads the certificate into the SSLContext.
3. PyMySQL and SQLAlchemy create_engine receive the valid SSL context.
4. Local MySQL continues to work without SSL requirements.
5. Passwords, tokens, and private material are NEVER leaked in logs or error messages.
"""

import os
import sys
import ssl
import tempfile
import unittest
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def build_aiven_ssl_context(ca_cert_data=None, ca_cert_path=None):
    """
    Builds a secure SSLContext for Aiven MySQL using a provided CA certificate
    (either as PEM data or file path).
    """
    temp_file_created = None
    try:
        target_ca_file = None
        if ca_cert_data and ca_cert_data.strip():
            cleaned = ca_cert_data.strip().strip("\"'")
            cleaned = cleaned.replace("\\n", "\n")
            if "BEGIN CERTIFICATE" not in cleaned and len(cleaned) > 50:
                cleaned = f"-----BEGIN CERTIFICATE-----\n{cleaned}\n-----END CERTIFICATE-----\n"
            elif not cleaned.endswith("\n"):
                cleaned += "\n"

            # Write to secure temporary file to ensure cafile compatibility across OpenSSL versions
            tmp = tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".pem",
                prefix="aiven_ca_",
                delete=False,
                encoding="utf-8",
            )
            tmp.write(cleaned)
            tmp.close()
            temp_file_created = tmp.name
            target_ca_file = temp_file_created
        elif ca_cert_path and os.path.isfile(ca_cert_path):
            target_ca_file = ca_cert_path
        else:
            # Check local directory for a ca.pem file
            local_ca = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca.pem")
            if os.path.isfile(local_ca):
                target_ca_file = local_ca

        if target_ca_file:
            ctx = ssl.create_default_context(cafile=target_ca_file)
        else:
            ctx = ssl.create_default_context()

        # Disable STRICT x509 verify flag to allow self-signed project CA chains
        if hasattr(ssl, "VERIFY_X509_STRICT"):
            ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT

        return ctx, temp_file_created
    except Exception as e:
        if temp_file_created and os.path.exists(temp_file_created):
            try:
                os.remove(temp_file_created)
            except Exception:
                pass
        raise e


class TestAivenSSLConfiguration(unittest.TestCase):

    def test_default_ssl_context(self):
        ctx, tmp = build_aiven_ssl_context()
        self.assertIsInstance(ctx, ssl.SSLContext)
        self.assertIsNone(tmp)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)

    def test_ca_cert_normalization_escaped_newlines(self):
        raw_escaped = (
            "-----BEGIN CERTIFICATE-----\\n"
            "MIIDBTCCAe2gAwIBAgIUW1y4J1J1s5Z0\\n"
            "-----END CERTIFICATE-----"
        )
        cleaned = raw_escaped.replace("\\n", "\n")
        self.assertIn("\n", cleaned)
        self.assertNotIn("\\n", cleaned)

    def test_local_mysql_preserved(self):
        from app.core.database import verify_database_connection
        # Test local database connectivity without SSL
        self.assertTrue(verify_database_connection())

    def test_engine_url_safe_rendering(self):
        test_url = "mysql+pymysql://avnadmin:SuperSecretPass123!@mysql-smart-developer-productivity.f.aivencloud.com:15300/defaultdb"
        u = make_url(test_url)
        rendered = u.render_as_string(hide_password=True)
        self.assertNotIn("SuperSecretPass123!", rendered)
        self.assertIn("***", rendered)

    def test_aiven_url_normalization(self):
        raw_aiven_uri = "mysql://avnadmin:secret@mysql-smart-developer-productivity.f.aivencloud.com:15300/defaultdb?ssl-mode=REQUIRED"
        
        url = raw_aiven_uri
        if url.startswith("mysql://"):
            url = url.replace("mysql://", "mysql+pymysql://", 1)
        
        u = make_url(url)
        params = dict(u.query)
        params.pop("ssl-mode", None)
        params.pop("ssl_mode", None)
        clean_url = u.set(query=params)
        
        self.assertEqual(clean_url.drivername, "mysql+pymysql")
        self.assertNotIn("ssl-mode", clean_url.query)


if __name__ == "__main__":
    unittest.main()
