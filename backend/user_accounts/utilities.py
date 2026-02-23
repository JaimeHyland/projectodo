import secrets
import hashlib


def generate_secure_token():
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash
