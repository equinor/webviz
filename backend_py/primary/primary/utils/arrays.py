from typing import Optional, TypeVar

Tdata = TypeVar("Tdata")


def safe_index_get(index: int, arr: list[Tdata], default: Optional[Tdata] = None) -> Optional[Tdata]:
    """Gets an item from a list, or returns default if index is out of range"""

    try:
        return arr[index]
    except IndexError:
        return default
