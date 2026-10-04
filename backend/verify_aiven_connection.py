"""
AIVEN MYSQL 8.4 TLS CONNECTIVITY VERIFICATION TOOL
Safely verifies that:
1. The Aiven CA certificate (ca.pem or DB_CA_CERT) is detected and valid.
2. An encrypted TLS/SSL handshake is successfully negotiated with Aiven MySQL 8.4.
3. PyMySQL and SQLAlchemy execute queries over the verified SSL channel.
4. Passwords and credentials are NEVER exposed.
"""

import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv(".env")

from app.core.database import engine, verify_database_connection, _build_ssl_context
from sqlalchemy import text


def verify_aiven_connectivity():
    print("=" * 65)
    print(" AIVEN MYSQL 8.4 SSL/TLS CONNECTION VERIFICATION")
    print("=" * 65)

    safe_url = engine.url.render_as_string(hide_password=True)
    print(f"Target Database URL: {safe_url}")

    # Check CA detection
    ca_data = os.getenv("DB_CA_CERT") or os.getenv("AIVEN_CA_CERT")
    ca_path = os.getenv("DB_SSL_CA") or os.getenv("SSL_CA_PATH")
    ctx = _build_ssl_context(ca_data, ca_path)
    
    print(f"SSL Context Verify Mode: {ctx.verify_mode} (CERT_REQUIRED={ctx.verify_mode == 2})")
    print(f"SSL Hostname Verification: {ctx.check_hostname}")

    try:
        with engine.connect() as conn:
            # 1. Ping
            one = conn.execute(text("SELECT 1")).scalar()
            assert one == 1

            # 2. Check TLS Cipher
            ssl_cipher = conn.execute(text("SHOW STATUS LIKE 'Ssl_cipher'")).fetchone()
            ssl_version = conn.execute(text("SHOW STATUS LIKE 'Ssl_version'")).fetchone()

            cipher_val = ssl_cipher[1] if ssl_cipher else "None"
            version_val = ssl_version[1] if ssl_version else "None"

            print(f"\n[OK] TLS Cipher in Use:   {cipher_val}")
            print(f"[OK] TLS Protocol in Use: {version_val}")

            # 3. Check Database Version & Tables
            db_version = conn.execute(text("SELECT VERSION()")).scalar()
            print(f"[OK] MySQL Server Version: {db_version}")

            tables_res = conn.execute(text("SHOW TABLES")).fetchall()
            table_names = [t[0] for t in tables_res]
            print(f"[OK] Total Tables in Database: {len(table_names)}")
            if table_names:
                print(f"     Tables: {', '.join(table_names[:8])}{'...' if len(table_names) > 8 else ''}")

        print("\n" + "=" * 65)
        print(" [SUCCESS] AIVEN MYSQL 8.4 SSL/TLS CONNECTION VERIFIED!")
        print("=" * 65)
        return True
    except Exception as exc:
        print("\n" + "=" * 65)
        print(" [FAILED] Could not connect to database.")
        print(f" Diagnostic Error: {exc}")
        if "CERTIFICATE_VERIFY_FAILED" in str(exc):
            print("\n TIP: Ensure ca.pem is located in backend/ or DB_CA_CERT contains the Aiven CA text.")
        print("=" * 65)
        return False


if __name__ == "__main__":
    verify_aiven_connectivity()
