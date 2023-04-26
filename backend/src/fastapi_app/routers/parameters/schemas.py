from typing import Optional

from pydantic import BaseModel


class EnsembleParameterDescription(BaseModel):
    name: str
    group_name: Optional[str]
    descriptive_name: Optional[str]
    is_numerical: bool
