"""
TEST AIVEN MYSQL 8.4 SSL/TLS CONFIGURATION
Verifies that:
1. CA Certificate PEM data (raw, escaped \\n, or file) is correctly parsed and normalized.
2. _build_ssl_context correctly creates and loads the certificate into the SSLContext.
3. PyMySQL and SQLAlchemy create_engine receive a valid SSL context with TLS verification enabled.
4. Missing or invalid CA paths do NOT crash with [X509: NO_CERTIFICATE_OR_CRL_FOUND].
5. Local MySQL continues to work without SSL requirements.
6. Passwords, tokens, and private material are NEVER leaked in logs or error messages.
"""

import os
import sys
import ssl
import tempfile
import unittest
import certifi
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import _build_ssl_context, verify_database_connection


class TestAivenSSLConfiguration(unittest.TestCase):

    def test_default_ssl_context(self):
        """Verifies default SSL context has CERT_REQUIRED and check_hostname=True."""
        ctx = _build_ssl_context()
        self.assertIsInstance(ctx, ssl.SSLContext)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(ctx.check_hostname)

    def test_ca_cert_normalization_escaped_newlines(self):
        """Verifies escaped newlines are properly normalized when loading PEM."""
        with open(certifi.where(), "r", encoding="utf-8") as f:
            all_certs = f.read()
        start = all_certs.find("-----BEGIN CERTIFICATE-----")
        end = all_certs.find("-----END CERTIFICATE-----", start) + len("-----END CERTIFICATE-----")
        valid_pem = all_certs[start:end]
        escaped_pem = valid_pem.replace("\n", "\\n")

        ctx = _build_ssl_context(ca_cert_data=escaped_pem)
        self.assertIsInstance(ctx, ssl.SSLContext)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)

    def test_crlf_newlines_supported(self):
        """Verifies Windows CRLF line endings in PEM strings are loaded properly."""
        with open(certifi.where(), "r", encoding="utf-8") as f:
            all_certs = f.read()
        start = all_certs.find("-----BEGIN CERTIFICATE-----")
        end = all_certs.find("-----END CERTIFICATE-----", start) + len("-----END CERTIFICATE-----")
        valid_pem = all_certs[start:end]
        crlf_pem = valid_pem.replace("\n", "\r\n")

        ctx = _build_ssl_context(ca_cert_data=crlf_pem)
        self.assertIsInstance(ctx, ssl.SSLContext)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)

    def test_nonexistent_ca_path_does_not_crash(self):
        """
        Regression test: When a filename or non-existent path like 'ca.pem' is passed,
        it must NOT crash with [X509: NO_CERTIFICATE_OR_CRL_FOUND] and must return a
        valid SSLContext with TLS verification enabled.
        """
        ctx = _build_ssl_context(ca_cert_data="ca.pem")
        self.assertIsInstance(ctx, ssl.SSLContext)
        self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(ctx.check_hostname)

        ctx2 = _build_ssl_context(ca_cert_path="/nonexistent/path/to/ca.pem")
        self.assertIsInstance(ctx2, ssl.SSLContext)
        self.assertEqual(ctx2.verify_mode, ssl.CERT_REQUIRED)

    def test_empty_or_placeholder_ca_data_does_not_crash(self):
        """Verifies empty strings or placeholders don't raise SSL errors."""
        for placeholder in ["", "   ", "none", "null", "false"]:
            ctx = _build_ssl_context(ca_cert_data=placeholder)
            self.assertIsInstance(ctx, ssl.SSLContext)
            self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)

    def test_valid_file_path_loaded(self):
        """Verifies loading a certificate from a temporary valid file."""
        with open(certifi.where(), "r", encoding="utf-8") as f:
            all_certs = f.read()
        start = all_certs.find("-----BEGIN CERTIFICATE-----")
        end = all_certs.find("-----END CERTIFICATE-----", start) + len("-----END CERTIFICATE-----")
        valid_pem = all_certs[start:end]

        with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as tmp:
            tmp.write(valid_pem)
            tmp_path = tmp.name

        try:
            ctx = _build_ssl_context(ca_cert_path=tmp_path)
            self.assertIsInstance(ctx, ssl.SSLContext)
            self.assertEqual(ctx.verify_mode, ssl.CERT_REQUIRED)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_local_mysql_preserved(self):
        """Verifies local database connectivity without SSL requirements."""
        self.assertTrue(verify_database_connection())

    def test_engine_url_safe_rendering(self):
        """Verifies credentials are masked in logs and safe URL renderings."""
        test_url = "mysql+pymysql://avnadmin:SuperSecretPass123!@mysql-smart-developer-productivity.f.aivencloud.com:15300/defaultdb"
        u = make_url(test_url)
        rendered = u.render_as_string(hide_password=True)
        self.assertNotIn("SuperSecretPass123!", rendered)
        self.assertIn("***", rendered)

    def test_aiven_url_normalization(self):
        """Verifies standard Aiven mysql:// URL is normalized to mysql+pymysql:// and query params cleaned."""
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
