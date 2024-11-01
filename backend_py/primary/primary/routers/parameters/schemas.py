from typing import Optional

from pydantic import BaseModel


class EnsembleParameterDescription(BaseModel):
    name: str
    group_name: Optional[str] = None
    descriptive_name: Optional[str] = None
    is_discrete: bool
