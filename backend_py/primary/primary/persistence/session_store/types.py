from enum import Enum


class SessionSortBy(str, Enum):
    CREATED_AT = "metadata.created_at"
    UPDATED_AT = "metadata.updated_at"
    TITLE = "metadata.title"
