from enum import Enum
from dataclasses import dataclass
from typing import Literal


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


LOWER_CASE_PREFIX = "__lower"
FilterOperator = Literal["CONTAINS", "EQUAL", "LESS", "MORE"]


@dataclass
class Filter:
    field: str
    value: str | float
    operator: FilterOperator = "EQUAL"
    prefix: str = ""

    @property
    def prop_name(self) -> str:
        return self.field.replace(".", "") + self.prefix


@dataclass
class QueryCollationOptions:
    """Helper class for defining NoSQL collation options"""

    sort_by: str | None = None
    sort_dir: SortDirection | None = None  # "asc" or "desc"
    sort_lowercase: bool | None = None
    limit: int | None = None
    offset: int | None = 0

    filters: list[Filter] | None = None

    def is_any_collation(self) -> bool:
        return self.sort_by is not None and self.limit is not None

    def make_query_params(self) -> list[dict[str, object]]:
        if not self.filters:
            return []

        return [{"name": f"@{q_filter.prop_name}", "value": q_filter.value} for q_filter in self.filters]

    def to_sql_query_string(self, variable_name: str = "c") -> str | None:
        tokens = []

        if self.filters:
            for idx, query_filter in enumerate(self.filters):
                tokens.append("WHERE" if (idx == 0) else "AND")

                if query_filter.operator == "EQUAL":
                    tokens.append(f"{variable_name}.{query_filter.field} = @{query_filter.prop_name}")
                elif query_filter.operator == "LESS":
                    tokens.append(f"{variable_name}.{query_filter.field} <= @{query_filter.prop_name}")
                elif query_filter.operator == "MORE":
                    tokens.append(f"{variable_name}.{query_filter.field} >= @{query_filter.prop_name}")
                elif query_filter.operator == "CONTAINS":
                    tokens.append(f"CONTAINS({variable_name}.{query_filter.field}, @{query_filter.prop_name})")
                else:
                    raise NotImplementedError(f"{query_filter.operator} has not been implemented yet")

        if self.sort_by:
            sort_by_field = self.sort_by + (LOWER_CASE_PREFIX if self.sort_lowercase else "")

            tokens.append(f"ORDER BY {variable_name}.{sort_by_field}")

            if self.sort_dir:
                tokens.append(self.sort_dir.value)

        # Zero is arguably a valid limit, so explicitly check None
        if self.limit is not None:
            tokens.append(f"OFFSET {self.offset or 0} LIMIT {self.limit}")

        if tokens:
            return " ".join(tokens)

        return None
