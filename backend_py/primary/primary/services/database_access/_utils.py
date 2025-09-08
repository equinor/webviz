import hashlib
from typing import Any, cast, TypeVar

from azure.core.async_paging import AsyncPageIterator, AsyncItemPaged

T = TypeVar("T")


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


def query_by_page(query_iterable: AsyncItemPaged[T], page_token: str | None) -> AsyncPageIterator[T]:
    """
    Cosmosdb's `by_page` returns a more narrow subtype than anticipated. This makes
    extra's like `.continuation_token` not show up in returned value's type.

    This util function correctly casts the return value to the expected type
    """
    pager = query_iterable.by_page(page_token)

    if not isinstance(pager, AsyncPageIterator):
        raise TypeError("Expected AsyncPageIterator from query_items_by_page_token_async")

    return cast(AsyncPageIterator[T], pager)
