from dataclasses import dataclass
from .types import SnapshotSortBy, SnapshotSortDirection


# TODO: Generalize utility to work with any model
@dataclass
class QueryCollationOptions:
    """Helper class for defining NoSQL collation options"""

    sort_by: SnapshotSortBy | None = None
    sort_dir: SnapshotSortDirection | None = None  # "asc" or "desc"
    limit: int | None = None
    offset: int | None = 0

    def to_sql_query_string(self, variable_name: str = "c") -> str | None:
        tokens = []

        if self.sort_by:
            tokens.append(f"ORDER BY {variable_name}.{self.sort_by.value}")

            if self.sort_dir:
                tokens.append(self.sort_dir.value)

        # Zero is arguably a valid limit, so explicitly check None
        if self.limit is not None:
            tokens.append(f"OFFSET {self.offset} LIMIT {self.limit}")

        if tokens:
            return " ".join(tokens)

        return None
