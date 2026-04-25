from cryptography.fernet import Fernet
from api import config
import base64

# Fernet requires a 32-byte url-safe base64-encoded key
def get_cipher():
    key = config.ENCRYPTION_SECRET.encode()
    # If the key isn't valid, we generate a stable one from the secret 
    # (In production, use a proper 32-byte key)
    if len(key) != 44:
        import hashlib
        key = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
    return Fernet(key)

def encrypt_token(token: str) -> str:
    """Encrypt a sensitive token for database storage."""
    if not token: return ""
    f = get_cipher()
    return f.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token retrieved from the database."""
    if not encrypted_token: return ""
    f = get_cipher()
    try:
        return f.decrypt(encrypted_token.encode()).decode()
    except Exception:
        return ""
