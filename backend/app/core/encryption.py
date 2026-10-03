import base64
import hashlib
import os
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

_SECRET_KEY = os.getenv("SECRET_KEY", "smart_developer_productivity_default_secret_key_2026")
# Deterministically derive a 32-byte URL-safe base64 key from SECRET_KEY
_DERIVED_KEY = base64.urlsafe_b64encode(hashlib.sha256(_SECRET_KEY.encode("utf-8")).digest())
_CIPHER = Fernet(_DERIVED_KEY)
_ENC_PREFIX = "enc:v1:"


def encrypt_token(plain_token: str | None) -> str | None:
    """
    Encrypts a token using Fernet symmetric encryption.
    If input is None or empty, returns None.
    If already encrypted, returns as is.
    """
    if not plain_token:
        return None
    
    if plain_token.startswith(_ENC_PREFIX):
        return plain_token
    
    encrypted_bytes = _CIPHER.encrypt(plain_token.encode("utf-8"))
    return f"{_ENC_PREFIX}{encrypted_bytes.decode('utf-8')}"


def decrypt_token(encrypted_or_plain: str | None) -> str | None:
    """
    Decrypts an encrypted token.
    If the string is not encrypted (e.g. legacy plain token), gracefully returns the plain string.
    """
    if not encrypted_or_plain:
        return None
    
    if not encrypted_or_plain.startswith(_ENC_PREFIX):
        # Legacy plaintext token fallback
        return encrypted_or_plain
    
    raw_payload = encrypted_or_plain[len(_ENC_PREFIX):]
    try:
        decrypted_bytes = _CIPHER.decrypt(raw_payload.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except (InvalidToken, Exception):
        # In case of corruption or key change, return as is or None safely
        return None
