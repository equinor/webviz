"""Utilities for SMDA queries"""

from typing import Optional, Type
from pydantic import BaseModel


def data_model_to_projection_param(data_model: Type[BaseModel], exclude: Optional[list[str]] = None) -> str:
    """Takes a pydantic model and creates a SMDA search projection param that includes each field"""
    exclude = exclude or []

    keys = data_model.model_fields.keys()
    filtered_keys = filter(lambda key: key not in exclude, keys)
    return ",".join(filtered_keys)
