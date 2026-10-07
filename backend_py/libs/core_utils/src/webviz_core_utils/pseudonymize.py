import base64
import hashlib
import hmac


def pseudonymize_user_id(secret_key: str, user_id: str) -> str:
    # Create an HMAC digest of the user ID which is irreversible without the secret key.
    # This way we can have a consistent pseudonym for the same user ID, but it cannot be traced back
    # to the original user ID without the secret key.
    digest_bytes = hmac.digest(key=secret_key.encode("utf-8"), msg=user_id.encode("utf-8"), digest=hashlib.sha256)

    # Encode the digest using base32 (all caps + digits, no special characters) and take the first 12
    # characters for a shorter pseudonym.
    encoded_digest = base64.b32encode(digest_bytes).decode("ascii").rstrip("=")
    return f"usr_{encoded_digest[:12]}"
