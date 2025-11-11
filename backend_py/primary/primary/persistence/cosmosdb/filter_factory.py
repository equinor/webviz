"""
Filter factory for creating type-safe filters validated against Pydantic models.

This module provides a factory class that ensures filter fields exist in the document model
before creating Filter instances, preventing runtime errors from invalid field paths.
"""

import logging
from typing import Type, get_args, get_origin, Optional

from pydantic import BaseModel

from primary.persistence.cosmosdb.query_collation_options import Filter, FilterOperator


LOGGER = logging.getLogger(__name__)


class FilterFactory:
    """
    Factory for creating validated filters against a Pydantic model.

    This factory ensures that filter fields exist in the document model structure
    before creating Filter instances, providing type safety and early error detection.

    Example:
        ```python
        from .documents import SessionDocument

        # Create factory for SessionDocument
        factory = FilterFactory(SessionDocument)

        # Create validated filters
        title_filter = factory.create("metadata.title", "My Title", "EQUAL")
        date_filter = factory.create("metadata.created_at", "2024-01-01", "MORE")

        # Invalid field raises ValueError
        try:
            invalid = factory.create("metadata.nonexistent", "value")
        except ValueError as e:
            print(e)  # "Field 'metadata.nonexistent' does not exist in SessionDocument"
        ```
    """

    def __init__(self, document_model: Type[BaseModel]):
        """
        Initialize the filter factory with a document model.

        Args:
            document_model: The Pydantic model to validate fields against
        """
        self.document_model = document_model
        self._field_cache: dict[str, bool] = {}

    def _field_exists(self, field_path: str) -> bool:
        """
        Check if a field exists in the document model.

        Args:
            field_path: Dot-notation field path (e.g., "metadata.title")

        Returns:
            True if the field exists, False otherwise
        """
        # Check cache first
        if field_path in self._field_cache:
            return self._field_cache[field_path]

        # Split path into parts
        parts = field_path.split(".")

        # Navigate the model structure
        current_model = self.document_model

        for part in parts:
            if not hasattr(current_model, "__annotations__"):
                self._field_cache[field_path] = False
                return False

            field_type = current_model.__annotations__.get(part)

            # If not in annotations, check if it's a computed field
            if field_type is None:
                # Access model_computed_fields property correctly
                model_computed_fields_prop = getattr(current_model, "model_computed_fields", None)
                if model_computed_fields_prop and isinstance(model_computed_fields_prop, property):
                    computed_fields = model_computed_fields_prop.fget(current_model)
                else:
                    computed_fields = {}

                if part in computed_fields:
                    # If this is the last part and it's a computed field, we found it
                    if part == parts[-1]:
                        self._field_cache[field_path] = True
                        return True
                    # Computed fields can't have nested fields
                    self._field_cache[field_path] = False
                    return False

                self._field_cache[field_path] = False
                return False

            # Handle Optional types
            origin = get_origin(field_type)
            if origin is not None:
                args = get_args(field_type)
                if len(args) > 0:
                    field_type = args[0]

            # If this is the last part, we found the field
            if part == parts[-1]:
                self._field_cache[field_path] = True
                return True

            # Continue navigation if this is a nested model
            if not isinstance(field_type, type) or not issubclass(field_type, BaseModel):
                self._field_cache[field_path] = False
                return False

            current_model = field_type

        self._field_cache[field_path] = True
        return True

    def _get_field_type(self, field_path: str) -> Optional[Type]:
        """
        Get the type of a field in the document model.

        Args:
            field_path: Dot-notation field path

        Returns:
            The field type, or None if field doesn't exist
        """
        parts = field_path.split(".")
        current_model = self.document_model

        for part in parts:
            if not hasattr(current_model, "__annotations__"):
                return None

            field_type = current_model.__annotations__.get(part)

            # If not in annotations, check if it's a computed field
            if field_type is None:
                # Access model_computed_fields property correctly
                model_computed_fields_prop = getattr(current_model, "model_computed_fields", None)
                if model_computed_fields_prop and isinstance(model_computed_fields_prop, property):
                    computed_fields = model_computed_fields_prop.fget(current_model)
                else:
                    computed_fields = {}

                if part in computed_fields:
                    # If this is the last part and it's a computed field, return its type
                    if part == parts[-1]:
                        computed_field_info = computed_fields[part]
                        return computed_field_info.return_type if hasattr(computed_field_info, "return_type") else None
                    # Computed fields can't have nested fields
                    return None

                return None

            # Handle Optional types
            origin = get_origin(field_type)
            if origin is not None:
                args = get_args(field_type)
                if len(args) > 0:
                    field_type = args[0]

            # If this is the last part, return the type
            if part == parts[-1]:
                return field_type

            # Continue navigation
            if not isinstance(field_type, type) or not issubclass(field_type, BaseModel):
                return None

            current_model = field_type

        return None

    def create(
        self,
        field: str,
        value: str | float,
        operator: FilterOperator = "EQUAL",
        prefix: str = "",
        validate: bool = True,
    ) -> Filter:
        """
        Create a validated filter for the document model.

        Args:
            field: Dot-notation field path (e.g., "metadata.title")
            value: The value to filter by
            operator: The filter operator (EQUAL, LESS, MORE, CONTAINS)
            prefix: Optional prefix for the parameter name
            validate: Whether to validate the field exists (default: True)

        Returns:
            A validated Filter instance

        Raises:
            ValueError: If the field doesn't exist in the document model (when validate=True)

        Example:
            ```python
            # Create an equality filter
            filter = factory.create("metadata.title", "My Title")

            # Create a range filter
            filter = factory.create("metadata.created_at", "2024-01-01", "MORE")

            # Create a contains filter for case-insensitive search
            filter = factory.create("metadata.title__lower", "search", "CONTAINS")
            ```
        """
        if validate and not self._field_exists(field):
            raise ValueError(
                f"Field '{field}' does not exist in {self.document_model.__name__}. "
                f"Available fields can be checked using the model's __annotations__."
            )

        return Filter(field=field, value=value, operator=operator, prefix=prefix)
