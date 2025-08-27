from enum import Enum
from dataclasses import dataclass


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


LOWER_CASE_PREFIX = "__lower"


@dataclass
class QueryCollationOptions:
    """Helper class for defining NoSQL collation options"""

    sort_by: Enum | None = None
    sort_dir: SortDirection | None = None  # "asc" or "desc"
    sort_lowercase: bool | None = None
    limit: int | None = None
    offset: int | None = 0

    def is_any_collation(self) -> bool:
        return self.sort_by is not None and self.limit is not None

    def to_sql_query_string(self, variable_name: str = "c") -> str | None:
        tokens = []

        if self.sort_by:
            sort_by_field = self.sort_by.value + (LOWER_CASE_PREFIX if self.sort_lowercase else "")

            tokens.append(f"ORDER BY {variable_name}.{sort_by_field}")

            if self.sort_dir:
                tokens.append(self.sort_dir.value)

        # Zero is arguably a valid limit, so explicitly check None
        if self.limit is not None:
            tokens.append(f"OFFSET {self.offset} LIMIT {self.limit}")

        if tokens:
            return " ".join(tokens)

        return None
