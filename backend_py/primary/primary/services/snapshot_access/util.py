def make_access_log_item_id(snapshot_id: str, user_id: str) -> str:
    return f"{snapshot_id}__{user_id}"
