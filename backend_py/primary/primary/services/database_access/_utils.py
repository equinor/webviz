import hashlib
from typing import Any, cast


# Utility function to hash a JSON string using SHA-256
# This function mimics the behavior of TextEncoder in JavaScript, which encodes strings to
# UTF-8 before hashing. The output is a hexadecimal string representation of the hash.
#
# It is important that this function returns the same hash as the JavaScript version
def hash_json_string(json_string: str) -> str:
    data = json_string.encode("utf-8")  # Matches TextEncoder behavior
    hash_bytes = hashlib.sha256(data).digest()
    hash_hex = "".join(f"{b:02x}" for b in hash_bytes)
    return hash_hex


def cast_query_params(params: list[dict[str, Any]]) -> list[dict[str, object]]:
    return cast(list[dict[str, object]], params)
