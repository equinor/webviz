from enum import Enum


class SnapshotSortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"


class SnapshotAccessLogSortBy(str, Enum):
    VISITS = "visits"
    LAST_VISIT = "last_visited_at"
    TITLE = "snapshot_metadata.title"
    TITLE_LOWER = "snapshot_metadata.title__lower"
    CREATED_AT = "snapshot_metadata.created_at"
