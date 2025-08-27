def make_access_log_item_id(snapshot_id: str, visitor_id: str) -> str:
    return f"{snapshot_id}__{visitor_id}"
