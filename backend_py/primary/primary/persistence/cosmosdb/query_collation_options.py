from enum import Enum
from dataclasses import dataclass
import logging
from typing import Literal, Type, get_args, get_origin

from pydantic import BaseModel


LOGGER = logging.getLogger(__name__)


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
    sort_dir: SortDirection | None = None
    sort_lowercase: bool | None = None
    limit: int | None = None
    offset: int | None = 0
    filters: list[Filter] | None = None
    document_model: Type[BaseModel] | None = None

    def _field_has_lowercase_variant(self, field_path: str) -> bool:
        """
        Check if a field has a lowercase variant in the document model.

        Args:
            field_path: Dot-notation field path (e.g., "metadata.title")

        Returns:
            True if the lowercase variant exists, False otherwise
        """
        if self.document_model is None:
            # No model provided - assume lowercase variant exists (backward compatible)
            return True

        # Split path into parts
        parts = field_path.split(".")
        lowercase_field = f"{parts[-1]}{LOWER_CASE_PREFIX}"

        # Navigate the model structure
        current_model = self.document_model

        # Navigate to the nested model (all parts except the last)
        for part in parts[:-1]:
            if not hasattr(current_model, "__annotations__"):
                return False

            field_type = current_model.__annotations__.get(part)
            if field_type is None:
                return False

            # Handle Optional types
            origin = get_origin(field_type)
            if origin is not None:
                args = get_args(field_type)
                if len(args) > 0:
                    field_type = args[0]

            if not isinstance(field_type, type) or not issubclass(field_type, BaseModel):
                return False

            current_model = field_type

        # Check if the lowercase variant exists in the final model
        if not hasattr(current_model, "__annotations__"):
            return False

        return lowercase_field in current_model.__annotations__

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
            # Check if lowercase variant exists before adding suffix
            if self.sort_lowercase and self._field_has_lowercase_variant(self.sort_by):
                sort_by_field = self.sort_by + LOWER_CASE_PREFIX
            else:
                sort_by_field = self.sort_by
                # Optional: Warn if lowercase was requested but not available
                if self.sort_lowercase and self.document_model is not None:
                    LOGGER.warning(
                        f"Lowercase sorting requested for '{self.sort_by}', "
                        f"but '{self.sort_by}{LOWER_CASE_PREFIX}' field not found in document model. "
                        f"Using case-sensitive sorting instead.",
                    )

            tokens.append(f"ORDER BY {variable_name}.{sort_by_field}")

            if self.sort_dir:
                tokens.append(self.sort_dir.value)

        if self.limit is not None:
            tokens.append(f"OFFSET {self.offset or 0} LIMIT {self.limit}")

        if tokens:
            return " ".join(tokens)

        return None
